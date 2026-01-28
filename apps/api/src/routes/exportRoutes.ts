import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { exportCSV, previewExport } from "../controllers/exportController";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Export routes
router.post("/indicators/:indicatorId/export", exportCSV);
router.post("/indicators/:indicatorId/export/preview", previewExport);

export default router;
