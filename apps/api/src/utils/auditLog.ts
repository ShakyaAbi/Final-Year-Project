import { prisma } from "../prisma";

export type AuditAction =
  | "SUBMISSION_DELETE"
  | "SUBMISSION_RESTORE";

export async function logAuditEvent(params: {
  action: AuditAction;
  userId: number;
  submissionId: number;
  indicatorId: number;
  organizationId: number;
  meta?: any;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      userId: params.userId,
      submissionId: params.submissionId,
      indicatorId: params.indicatorId,
      organizationId: params.organizationId,
      meta: params.meta || {},
      createdAt: new Date(),
    },
  });
}
