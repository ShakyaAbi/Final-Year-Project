import { Request, Response } from "express";
import { ImportTemplateRepository } from "../repositories/importTemplateRepository";
import { ExportTemplateRepository } from "../repositories/exportTemplateRepository";
import { TemplateService } from "../services/templateService";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";

const importTemplateRepo = new ImportTemplateRepository(prisma);
const exportTemplateRepo = new ExportTemplateRepository(prisma);
const templateService = new TemplateService(prisma);

/**
 * Create import template
 */
export const createImportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;
    const { name, description, columnMapping, isDefault } = req.body;

    // Validate template
    const validation = templateService.validateImportTemplate(columnMapping);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const template = await importTemplateRepo.create({
      name,
      description,
      columnMapping,
      isDefault: isDefault || false,
      indicator: { connect: { id: parseInt(indicatorId) } },
      createdBy: { connect: { id: (req as any).user.id } },
    });

    res.status(201).json(template);
  },
);

/**
 * Get import templates for indicator
 */
export const getImportTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;
    const indicatorIdNum = parseInt(indicatorId);

    let templates = await importTemplateRepo.findByIndicatorId(indicatorIdNum);

    // Auto-create default template if none exists
    if (templates.length === 0) {
      const userId = (req as any).user?.id || 1;
      const defaultTemplate = await templateService.createDefaultImportTemplate(
        indicatorIdNum,
        userId,
      );
      templates = [defaultTemplate];
    }

    res.json(templates);
  },
);

/**
 * Get single import template
 */
export const getImportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { templateId } = req.params;

    const template = await importTemplateRepo.findById(parseInt(templateId));

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(template);
  },
);

/**
 * Update import template
 */
export const updateImportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { templateId } = req.params;
    const { name, description, columnMapping, isDefault } = req.body;

    if (columnMapping) {
      const validation = templateService.validateImportTemplate(columnMapping);
      if (!validation.valid) {
        return res.status(400).json({ errors: validation.errors });
      }
    }

    const template = await importTemplateRepo.update(parseInt(templateId), {
      name,
      description,
      columnMapping,
      isDefault,
    });

    res.json(template);
  },
);

/**
 * Delete import template
 */
export const deleteImportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { templateId } = req.params;

    await importTemplateRepo.delete(parseInt(templateId));

    res.json({ message: "Template deleted" });
  },
);

/**
 * Clone import template
 */
export const cloneImportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { templateId } = req.params;
    const { name } = req.body;

    const template = await importTemplateRepo.cloneTemplate(
      parseInt(templateId),
      name || `Copy of Template ${templateId}`,
      (req as any).user.id,
    );

    res.status(201).json(template);
  },
);

/**
 * Download import template as CSV sample
 */
export const downloadImportTemplateSample = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;
    const indicatorIdNum = parseInt(indicatorId);

    // Get or create default template
    let templates = await importTemplateRepo.findByIndicatorId(indicatorIdNum);
    if (templates.length === 0) {
      const userId = (req as any).user?.id || 1;
      const defaultTemplate = await templateService.createDefaultImportTemplate(
        indicatorIdNum,
        userId,
      );
      templates = [defaultTemplate];
    }

    const template = templates.find((t) => t.isDefault) || templates[0];
    const indicator = await prisma.indicator.findUnique({
      where: { id: indicatorIdNum },
    });

    if (!indicator || !template) {
      return res.status(404).json({ error: "Template or indicator not found" });
    }

    // Generate CSV sample
    const csv = templateService.generateSampleCSV(indicator, template.columnMapping as any);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="import-template-indicator-${indicatorId}.csv"`,
    );
    res.send(csv);
  },
);

// Export templates (similar structure)

export const createExportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;
    const {
      name,
      description,
      columnConfig,
      filterConfig,
      formatConfig,
      isDefault,
    } = req.body;

    const template = await exportTemplateRepo.create({
      name,
      description,
      columnConfig,
      filterConfig,
      formatConfig,
      isDefault: isDefault || false,
      indicator: { connect: { id: parseInt(indicatorId) } },
      createdBy: { connect: { id: (req as any).user.id } },
    });

    res.status(201).json(template);
  },
);

export const getExportTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;

    const templates = await exportTemplateRepo.findByIndicatorId(
      parseInt(indicatorId),
    );

    res.json(templates);
  },
);

export const getExportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { templateId } = req.params;

    const template = await exportTemplateRepo.findById(parseInt(templateId));

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(template);
  },
);

export const updateExportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { templateId } = req.params;
    const {
      name,
      description,
      columnConfig,
      filterConfig,
      formatConfig,
      isDefault,
    } = req.body;

    const template = await exportTemplateRepo.update(parseInt(templateId), {
      name,
      description,
      columnConfig,
      filterConfig,
      formatConfig,
      isDefault,
    });

    res.json(template);
  },
);

export const deleteExportTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const { templateId } = req.params;

    await exportTemplateRepo.delete(parseInt(templateId));

    res.json({ message: "Template deleted" });
  },
);
