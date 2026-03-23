import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  createImportTemplate,
  getImportTemplates,
  getImportTemplate,
  updateImportTemplate,
  deleteImportTemplate,
  cloneImportTemplate,
  downloadImportTemplateSample,
} from "../controllers/templateController";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Import template routes
router.post("/indicators/:indicatorId/import-templates", createImportTemplate);
router.get("/indicators/:indicatorId/import-templates", getImportTemplates);
router.get(
  "/indicators/:indicatorId/import-template-sample",
  downloadImportTemplateSample,
);
router.get("/import-templates/:templateId", getImportTemplate);
router.put("/import-templates/:templateId", updateImportTemplate);
router.delete("/import-templates/:templateId", deleteImportTemplate);
router.post("/import-templates/:templateId/clone", cloneImportTemplate);

// Export template routes
// Removed as part of template simplification

export default router;
