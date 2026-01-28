import {
  PrismaClient,
  Indicator,
  ImportJob,
  ImportTemplate,
  RowStatus,
} from "@prisma/client";
import Papa from "papaparse";
import { format, parse, isValid } from "date-fns";
import { ImportJobRepository } from "../repositories/importJobRepository";
import { validateCategoricalValue } from "./categoricalService";

interface ParsedRow {
  rowNumber: number;
  rawData: any;
  normalizedData?: any;
  errors: ValidationError[];
  warnings: ValidationError[];
  valid: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

export class ImportService {
  private jobRepo: ImportJobRepository;

  constructor(private prisma: PrismaClient) {
    this.jobRepo = new ImportJobRepository(prisma);
  }

  /**
   * Phase 1: Parse CSV and create staging rows
   */
  async parseAndStage(
    jobId: number,
    fileBuffer: Buffer,
    template: ImportTemplate,
  ): Promise<void> {
    const fileContent = fileBuffer.toString("utf-8");

    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          try {
            // Security: Prevent memory exhaustion from huge files
            const MAX_ROWS = 100000;
            if (results.data.length > MAX_ROWS) {
              await this.jobRepo.markFailed(jobId);
              return reject(
                new Error(
                  `CSV exceeds maximum row count (${MAX_ROWS.toLocaleString()} rows). ` +
                    `File has ${results.data.length.toLocaleString()} rows.`,
                ),
              );
            }

            // Update job with total rows
            await this.prisma.importJob.update({
              where: { id: jobId },
              data: {
                totalRows: results.data.length,
                status: "VALIDATING",
              },
            });

            // Create staging rows in batches
            const BATCH_SIZE = 500;
            for (let i = 0; i < results.data.length; i += BATCH_SIZE) {
              const batch = results.data.slice(i, i + BATCH_SIZE);

              await this.prisma.$transaction(async (tx) => {
                for (let j = 0; j < batch.length; j++) {
                  const row = batch[j];
                  await tx.importJobRow.create({
                    data: {
                      jobId,
                      rowNumber: i + j + 2, // +2 for header row and 1-based indexing
                      rawData: row,
                      validationStatus: "PENDING",
                    },
                  });
                }
              });
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: (error: any) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  }

  /**
   * Phase 2: Validate staging rows against indicator's canonical rules
   */
  async validateStagingRows(
    jobId: number,
    indicator: Indicator,
  ): Promise<{ valid: number; warnings: number; errors: number }> {
    const job: any = await this.jobRepo.findById(jobId);
    if (!job || !job.stagingRows) throw new Error("Import job not found");

    const validationRules = (indicator.validationConfig as any) || {};
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    // Process in batches
    const BATCH_SIZE = 100;
    const totalRows = job.stagingRows.length;

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = job.stagingRows.slice(i, i + BATCH_SIZE);

      for (const stagingRow of batch) {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        // Transform raw data using template mappings
        const normalized = this.transformRow(
          stagingRow.rawData,
          job.template?.columnMapping as any,
        );

        // Validate against indicator rules
        const validationResult = this.validateAgainstIndicator(
          normalized,
          validationRules,
          indicator,
        );

        errors.push(...validationResult.errors);
        warnings.push(...validationResult.warnings);

        // Check uniqueness constraint for CREATE_ONLY mode
        if (job.importMode === "CREATE_ONLY" && normalized.reportedAt) {
          const exists = await this.checkDuplicate(
            indicator.id,
            normalized.reportedAt,
            normalized.disaggregationKey,
          );
          if (exists) {
            errors.push({
              field: "reportedAt",
              message: `Duplicate: data for ${normalized.reportedAt} already exists`,
              severity: "error",
              suggestion: "Use UPSERT mode or choose a different date",
            });
          }
        }

        // Determine final status
        const status: RowStatus =
          errors.length > 0
            ? "ERROR"
            : warnings.length > 0
              ? "WARNING"
              : "VALID";

        // Update staging row
        await this.prisma.importJobRow.update({
          where: { id: stagingRow.id },
          data: {
            normalizedData: normalized,
            validationStatus: status,
            errors: errors.length > 0 ? (errors as any) : null,
            warnings: warnings.length > 0 ? (warnings as any) : null,
          },
        });

        if (status === "VALID") validCount++;
        else if (status === "WARNING") warningCount++;
        else errorCount++;
      }

      // Update progress
      await this.jobRepo.updateProgress(
        jobId,
        i + batch.length,
        validCount,
        errorCount,
        warningCount,
      );
    }

    // Update final job status
    await this.jobRepo.updateStatus(jobId, "VALIDATED");

    return { valid: validCount, warnings: warningCount, errors: errorCount };
  }

  /**
   * Phase 3: Commit validated rows to database
   */
  async commitToDatabase(jobId: number): Promise<void> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error("Import job not found");

    if (!job.indicatorId)
      throw new Error("Indicator ID required for submission import");

    await this.jobRepo.updateStatus(jobId, "IMPORTING");

    // Get only valid rows
    const validRows = await this.prisma.importJobRow.findMany({
      where: {
        jobId,
        validationStatus: { in: ["VALID", "WARNING"] },
      },
      orderBy: { rowNumber: "asc" },
    });

    const BATCH_SIZE = 500;
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);

      await this.prisma.$transaction(async (tx) => {
        for (const stagingRow of batch) {
          const data = stagingRow.normalizedData as any;

          if (job.importMode === "CREATE_ONLY") {
            await tx.submission.create({
              data: {
                indicatorId: job.indicatorId!,
                reportedAt: new Date(data.reportedAt),
                value: String(data.value),
                categoryValue: data.categoryValue,
                disaggregationKey: data.disaggregationKey || "",
                evidence: data.evidence,
                createdByUserId: job.userId,
                sourceImportJobId: jobId,
              },
            });
          } else if (job.importMode === "UPSERT") {
            await tx.submission.upsert({
              where: {
                indicatorId_reportedAt_disaggregationKey: {
                  indicatorId: job.indicatorId!,
                  reportedAt: new Date(data.reportedAt),
                  disaggregationKey: data.disaggregationKey || "",
                },
              },
              create: {
                indicatorId: job.indicatorId!,
                reportedAt: new Date(data.reportedAt),
                value: String(data.value),
                categoryValue: data.categoryValue,
                disaggregationKey: data.disaggregationKey || "",
                evidence: data.evidence,
                createdByUserId: job.userId,
                sourceImportJobId: jobId,
              },
              update: {
                value: String(data.value),
                categoryValue: data.categoryValue,
                evidence: data.evidence,
                sourceImportJobId: jobId,
              },
            });
          }

          // Mark staging row as imported
          await tx.importJobRow.update({
            where: { id: stagingRow.id },
            data: { validationStatus: "IMPORTED" },
          });
        }
      });

      // Update progress
      await this.jobRepo.updateProgress(
        jobId,
        i + batch.length,
        i + batch.length,
        job.failedRows,
        job.warningRows,
      );
    }

    await this.jobRepo.markComplete(jobId);
  }

  /**
   * Rollback: Delete all submissions created by this import
   */
  async rollbackImport(jobId: number): Promise<number> {
    const result = await this.prisma.submission.deleteMany({
      where: { sourceImportJobId: jobId },
    });

    await this.jobRepo.updateStatus(jobId, "CANCELLED");

    return result.count;
  }

  /**
   * Transform CSV row using template mappings
   */
  private transformRow(rawRow: any, mapping: any): any {
    if (!mapping || !mapping.columns) return rawRow;

    const normalized: any = {};

    for (const colDef of mapping.columns) {
      const csvValue = rawRow[colDef.csvHeader];
      const transform = colDef.transform || {};

      if (csvValue === undefined || csvValue === null || csvValue === "") {
        normalized[colDef.fieldName] = colDef.defaultValue || null;
        continue;
      }

      let value = csvValue;

      // Apply transformations
      if (transform.trim) {
        value = String(value).trim();
      }

      if (colDef.dataType === "date") {
        const dateFormat = transform.dateFormat || "yyyy-MM-dd";
        const parsed = parse(value, dateFormat, new Date());
        normalized[colDef.fieldName] = isValid(parsed)
          ? format(parsed, "yyyy-MM-dd")
          : value;
      } else if (colDef.dataType === "number") {
        if (transform.removeCommas) {
          value = value.replace(/,/g, "");
        }
        normalized[colDef.fieldName] = parseFloat(value);
      } else if (colDef.dataType === "category") {
        const categoryMap = transform.categoryMapping || {};
        normalized[colDef.fieldName] =
          categoryMap[value] || value.toLowerCase();
      } else {
        normalized[colDef.fieldName] = value;
      }
    }

    return normalized;
  }

  /**
   * Validate normalized data against indicator's rules
   */
  private validateAgainstIndicator(
    data: any,
    rules: any,
    indicator: Indicator,
  ): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields
    if (!data.reportedAt) {
      errors.push({
        field: "reportedAt",
        message: "Reporting date is required",
        severity: "error",
      });
    }

    if (data.value === undefined || data.value === null) {
      errors.push({
        field: "value",
        message: "Value is required",
        severity: "error",
      });
    }

    // Date validation
    if (data.reportedAt) {
      const date = new Date(data.reportedAt);
      if (!isValid(date)) {
        errors.push({
          field: "reportedAt",
          message: "Invalid date format",
          severity: "error",
          suggestion: "Use format: YYYY-MM-DD",
        });
      }
    }

    // Numeric validation
    if (
      indicator.dataType === "NUMBER" ||
      indicator.dataType === "PERCENT" ||
      indicator.dataType === "CATEGORICAL"
    ) {
      const numValue = parseFloat(data.value);

      if (isNaN(numValue)) {
        errors.push({
          field: "value",
          message: "Value must be a number",
          severity: "error",
        });
      } else {
        if (indicator.minValue !== null && numValue < indicator.minValue) {
          warnings.push({
            field: "value",
            message: `Value ${numValue} is below minimum ${indicator.minValue}`,
            severity: "warning",
          });
        }
        if (indicator.maxValue !== null && numValue > indicator.maxValue) {
          warnings.push({
            field: "value",
            message: `Value ${numValue} exceeds maximum ${indicator.maxValue}`,
            severity: "warning",
          });
        }
      }
    }

    // Category validation
    if (indicator.dataType === "CATEGORICAL") {
      const categories = (indicator.categories as any) || [];
      const config = (indicator.categoryConfig as any) || {};
      const required = config.required ?? true;
      const rawCategoryValue = data.categoryValue;

      if (!rawCategoryValue || String(rawCategoryValue).trim().length === 0) {
        if (required) {
          errors.push({
            field: "categoryValue",
            message: "Category is required",
            severity: "error",
          });
        }
      } else {
        try {
          validateCategoricalValue(
            String(rawCategoryValue),
            categories,
            config,
          );
        } catch (err: any) {
          errors.push({
            field: "categoryValue",
            message: err?.message || "Invalid category selection",
            severity: "error",
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Check for duplicate submission
   */
  private async checkDuplicate(
    indicatorId: number,
    reportedAt: string,
    disaggregationKey?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.submission.findUnique({
      where: {
        indicatorId_reportedAt_disaggregationKey: {
          indicatorId,
          reportedAt: new Date(reportedAt),
          disaggregationKey: disaggregationKey || "",
        },
      },
    });
    return existing !== null;
  }
}
