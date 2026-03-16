import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getAnomalyNotifications,
  markAllAnomaliesRead,
} from "../controllers/notificationController";

const router = Router();

router.get("/notifications/anomalies", authenticate, getAnomalyNotifications);
router.post(
  "/notifications/anomalies/mark-read",
  authenticate,
  markAllAnomaliesRead,
);

export default router;
