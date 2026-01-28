import { PrismaClient, ExportTemplate, Prisma } from "@prisma/client";

export class ExportTemplateRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    data: Prisma.ExportTemplateCreateInput,
  ): Promise<ExportTemplate> {
    return this.prisma.exportTemplate.create({ data });
  }

  async findById(id: number): Promise<ExportTemplate | null> {
    return this.prisma.exportTemplate.findUnique({
      where: { id },
      include: {
        indicator: true,
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async findByIndicatorId(indicatorId: number): Promise<ExportTemplate[]> {
    return this.prisma.exportTemplate.findMany({
      where: { indicatorId },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async getDefaultTemplate(
    indicatorId: number,
  ): Promise<ExportTemplate | null> {
    return this.prisma.exportTemplate.findFirst({
      where: { indicatorId, isDefault: true },
    });
  }

  async update(
    id: number,
    data: Prisma.ExportTemplateUpdateInput,
  ): Promise<ExportTemplate> {
    return this.prisma.exportTemplate.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.exportTemplate.delete({ where: { id } });
  }
}
