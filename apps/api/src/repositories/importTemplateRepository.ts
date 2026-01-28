import { PrismaClient, ImportTemplate, Prisma } from "@prisma/client";

export class ImportTemplateRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    data: Prisma.ImportTemplateCreateInput,
  ): Promise<ImportTemplate> {
    return this.prisma.importTemplate.create({ data });
  }

  async findById(id: number): Promise<ImportTemplate | null> {
    return this.prisma.importTemplate.findUnique({
      where: { id },
      include: {
        indicator: true,
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async findByIndicatorId(indicatorId: number): Promise<ImportTemplate[]> {
    return this.prisma.importTemplate.findMany({
      where: { indicatorId },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async getDefaultTemplate(
    indicatorId: number,
  ): Promise<ImportTemplate | null> {
    return this.prisma.importTemplate.findFirst({
      where: { indicatorId, isDefault: true },
    });
  }

  async update(
    id: number,
    data: Prisma.ImportTemplateUpdateInput,
  ): Promise<ImportTemplate> {
    return this.prisma.importTemplate.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.importTemplate.delete({ where: { id } });
  }

  async cloneTemplate(
    templateId: number,
    newName: string,
    userId: number,
  ): Promise<ImportTemplate> {
    const original = await this.findById(templateId);
    if (!original) throw new Error("Template not found");

    return this.create({
      name: newName,
      description: original.description,
      columnMapping: original.columnMapping as any,
      isDefault: false,
      indicator: { connect: { id: original.indicatorId } },
      createdBy: { connect: { id: userId } },
    });
  }
}
