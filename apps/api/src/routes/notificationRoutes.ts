import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getAnomalyNotifications,
  getOverdueNotifications,
  markAllAnomaliesRead,
} from "../controllers/notificationController";

const router = Router();

router.get("/notifications/anomalies", authenticate, getAnomalyNotifications);
router.post(
  "/notifications/anomalies/mark-read",
  authenticate,
  markAllAnomaliesRead,
);
router.get("/notifications/overdue", authenticate, getOverdueNotifications);

export default router;
