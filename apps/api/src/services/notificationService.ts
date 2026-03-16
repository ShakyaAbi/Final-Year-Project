import { prisma } from "../prisma";

const LOOKBACK_DAYS = 30;
const MAX_NOTIFICATIONS = 20;

export interface AnomalyNotificationItem {
  id: string;
  submissionId: number;
  indicatorId: number;
  indicatorName: string;
  projectId: number;
  projectName: string;
  anomalyReason: string | null;
  anomalyStatus: string | null;
  value: string;
  reportedAt: Date;
}

export const getAnomalyNotifications = async (): Promise<{
  notifications: AnomalyNotificationItem[];
  totalUnread: number;
}> => {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const anomalousSubmissions = await prisma.submission.findMany({
    where: {
      isAnomaly: true,
      deletedAt: null,
      reportedAt: { gte: since },
    } as any,
    orderBy: { reportedAt: "desc" },
    take: MAX_NOTIFICATIONS,
    include: {
      indicator: {
        select: {
          id: true,
          name: true,
          projectId: true,
          project: {
            select: { id: true, name: true },
          },
        },
      },
    },
  } as any);

  const notifications: AnomalyNotificationItem[] = anomalousSubmissions.map(
    (sub: any) => ({
      id: String(sub.id),
      submissionId: sub.id,
      indicatorId: sub.indicator.id,
      indicatorName: sub.indicator.name,
      projectId: sub.indicator.project.id,
      projectName: sub.indicator.project.name,
      anomalyReason: sub.anomalyReason ?? null,
      anomalyStatus: sub.anomalyStatus ?? null,
      value: sub.value,
      reportedAt: sub.reportedAt,
    }),
  );

  const totalUnread = await prisma.submission.count({
    where: {
      isAnomaly: true,
      anomalyStatus: "DETECTED",
      deletedAt: null,
      reportedAt: { gte: since },
    } as any,
  });

  return { notifications, totalUnread };
};

export const markAllAnomaliesRead = async (userId: number): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  await prisma.submission.updateMany({
    where: {
      isAnomaly: true,
      anomalyStatus: "DETECTED",
      deletedAt: null,
      reportedAt: { gte: since },
    } as any,
    data: {
      anomalyStatus: "ACKNOWLEDGED",
      anomalyReviewedBy: userId,
      anomalyReviewedAt: new Date(),
    } as any,
  });
};
