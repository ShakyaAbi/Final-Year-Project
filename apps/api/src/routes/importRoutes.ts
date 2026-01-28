import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { uploadCSV } from "../middleware/upload";
import {
  uploadCSV as uploadCSVHandler,
  getImportJobStatus,
  executeImport,
  cancelImport,
  getImportJobs,
  downloadErrorCSV,
} from "../controllers/importController";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Import routes
router.post("/indicators/:indicatorId/import", uploadCSV, uploadCSVHandler);
router.get("/indicators/:indicatorId/import-jobs", getImportJobs);
router.get("/import-jobs/:jobId", getImportJobStatus);
router.post("/import-jobs/:jobId/process", executeImport);
router.post("/import-jobs/:jobId/cancel", cancelImport);
router.get("/import-jobs/:jobId/errors/download", downloadErrorCSV);

export default router;
