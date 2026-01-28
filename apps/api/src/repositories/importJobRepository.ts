import { PrismaClient, ImportJob, ImportStatus, Prisma } from "@prisma/client";

export class ImportJobRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Prisma.ImportJobCreateInput): Promise<ImportJob> {
    return this.prisma.importJob.create({ data });
  }

  async findById(jobId: number): Promise<ImportJob | null> {
    return this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: {
        indicator: true,
        template: true,
        user: { select: { id: true, email: true, name: true } },
        stagingRows: {
          orderBy: { rowNumber: "asc" },
        },
      },
    });
  }

  async findByIndicatorId(indicatorId: number): Promise<ImportJob[]> {
    return this.prisma.importJob.findMany({
      where: { indicatorId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUserId(userId: number): Promise<ImportJob[]> {
    return this.prisma.importJob.findMany({
      where: { userId },
      include: {
        indicator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(jobId: number, status: ImportStatus): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: { status },
    });
  }

  async updateProgress(
    jobId: number,
    processed: number,
    successful: number,
    failed: number,
    warnings: number,
  ): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        processedRows: processed,
        successfulRows: successful,
        failedRows: failed,
        warningRows: warnings,
      },
    });
  }

  async markComplete(jobId: number): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  async markFailed(jobId: number): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
  }

  async delete(jobId: number): Promise<void> {
    await this.prisma.importJob.delete({ where: { id: jobId } });
  }

  async getJobStatistics(jobId: number) {
    const job = await this.findById(jobId);
    if (!job) return null;

    const stagingStats = await this.prisma.importJobRow.groupBy({
      by: ["validationStatus"],
      where: { jobId },
      _count: true,
    });

    return {
      ...job,
      stagingStats,
    };
  }
}
