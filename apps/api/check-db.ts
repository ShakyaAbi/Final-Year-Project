import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const indicators = await prisma.indicator.findMany({
    select: { id: true, name: true, dataType: true, projectId: true }
  });
  console.log("Indicators:", indicators);
  
  const projects = await prisma.project.findMany({
    select: { id: true, name: true }
  });
  console.log("Projects:", projects);
}

main().catch(console.error).finally(() => prisma.$disconnect());
