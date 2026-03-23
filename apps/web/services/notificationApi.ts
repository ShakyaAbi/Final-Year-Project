import { request } from "./apiClient";
import { AnomalyNotification } from "../types";

export const notificationApi = {
  getAnomalyNotifications: async (): Promise<{
    notifications: AnomalyNotification[];
    totalUnread: number;
  }> => request("/notifications/anomalies"),

  getOverdueNotifications: async (): Promise<any[]> =>
    request("/notifications/overdue"),

  markAllAnomaliesRead: async (): Promise<void> =>
    request("/notifications/anomalies/mark-read", { method: "POST" }),
};
