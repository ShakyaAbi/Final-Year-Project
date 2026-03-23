import { asyncHandler } from "../utils/asyncHandler";
import * as notificationService from "../services/notificationService";

export const getAnomalyNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getAnomalyNotifications();
  res.json(result);
});

export const markAllAnomaliesRead = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.sub;
  await notificationService.markAllAnomaliesRead(userId);
  res.status(204).end();
});

export const getOverdueNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getOverdueNotifications();
  res.json(result);
});
