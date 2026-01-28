import { Request, Response } from "express";
import { ExportService } from "../services/exportService";
import { ExportTemplateRepository } from "../repositories/exportTemplateRepository";
import { TemplateService } from "../services/templateService";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";

const exportService = new ExportService(prisma);
const exportTemplateRepo = new ExportTemplateRepository(prisma);
const templateService = new TemplateService(prisma);

/**
 * Export indicator data as CSV
 */
export const exportCSV = asyncHandler(async (req: Request, res: Response) => {
  const { indicatorId } = req.params;
  const { templateId, filters } = req.body;

  const indicator = await prisma.indicator.findUnique({
    where: { id: parseInt(indicatorId) },
  });

  if (!indicator) {
    return res.status(404).json({ error: "Indicator not found" });
  }

  // Get template if provided
  let template = null;
  if (templateId) {
    template = await exportTemplateRepo.findById(parseInt(templateId));
  } else {
    template = await exportTemplateRepo.getDefaultTemplate(indicator.id);
    if (!template) {
      template = await templateService.createDefaultExportTemplate(
        indicator.id,
        (req as any).user.id,
      );
    }
  }

  // Generate CSV
  const csv = await exportService.generateCSV(
    indicator.id,
    template,
    filters || {},
  );

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `indicator_${indicatorId}_${timestamp}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

/**
 * Preview export (first 10 rows)
 */
export const previewExport = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;
    const { templateId, filters } = req.body;

    const indicator = await prisma.indicator.findUnique({
      where: { id: parseInt(indicatorId) },
    });

    if (!indicator) {
      return res.status(404).json({ error: "Indicator not found" });
    }

    let template = null;
    if (templateId) {
      template = await exportTemplateRepo.findById(parseInt(templateId));
    }

    const preview = await exportService.generatePreview(
      indicator.id,
      template,
      filters || {},
    );

    res.json({ preview });
  },
);
