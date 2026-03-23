import {
  IndicatorDataType,
  NodeType,
  PrismaClient,
  ProjectStatus,
  Role,
} from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting ML Testing Seed...");

  // 1. Get or create Admin user
  const adminEmail = "admin@gmail.com";
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    const passwordHash = await hashPassword("admin1234");
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        name: "ML Testing Admin"
      },
    });
  }

  // 2. Create ML Validation Project
  const projectName = "ML Service Validation Project";
  let project = await prisma.project.findFirst({ where: { name: projectName } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: projectName,
        description: "A project dedicated to testing and validating anomaly detection algorithms.",
        status: ProjectStatus.ACTIVE,
        startDate: new Date("2026-01-01"),
      },
    });
    console.log(`✓ Created Project: ${projectName}`);
  }

  // 3. Create Logframe Node
  let node = await prisma.logframeNode.findFirst({ 
    where: { projectId: project.id, title: "ML Testing Node" } 
  });
  if (!node) {
    node = await prisma.logframeNode.create({
      data: {
        projectId: project.id,
        type: NodeType.OUTCOME,
        title: "ML Testing Node",
        description: "Node for high-density testing indicators",
      },
    });
  }

  // 4. Create ML Testing Indicator
  const indicatorName = "High-Density Productivity Score";
  let indicator = await prisma.indicator.findFirst({ 
    where: { projectId: project.id, name: indicatorName } 
  });
  if (!indicator) {
    indicator = await prisma.indicator.create({
      data: {
        projectId: project.id,
        logframeNodeId: node.id,
        name: indicatorName,
        unit: "points",
        dataType: IndicatorDataType.NUMBER,
        baselineValue: 50,
        targetValue: 90,
        anomalyConfig: {
          method: "ISOLATION_FOREST",
          contamination: 0.05,
          minPoints: 10,
          windowSize: 100
        }
      },
    });
    console.log(`✓ Created Indicator: ${indicatorName}`);
  }

  // 5. Generate 60 days of data
  console.log("📊 Generating 60 days of data...");
  const submissions = [];
  const baseDate = new Date("2026-01-01");

  for (let i = 0; i < 60; i++) {
    const reportedAt = new Date(baseDate);
    reportedAt.setDate(baseDate.getDate() + i);

    let value = 50 + (Math.random() * 6 - 3); // Normal jitter (47-53)

    // Gradual trend upwards after day 30
    if (i > 30) {
      value += (i - 30) * 0.5;
    }

    // Explicit anomalies
    if (i === 15) {
      value = 75; // Small anomaly
    }
    if (i === 42) {
      value = 110; // Major anomaly (outside target/baseline range)
    }
    if (i === 55) {
      value = 25; // Negative anomaly
    }

    submissions.push({
      indicatorId: indicator.id,
      reportedAt,
      value: value.toFixed(2),
      createdByUserId: adminUser.id,
      evidence: `Daily automated score - Day ${i + 1}`,
      isAnomaly: false, // Will be calculated by system on backfill if needed
    });
  }

  // 6. Upsert submissions
  let count = 0;
  for (const sub of submissions) {
    await prisma.submission.upsert({
      where: {
        indicatorId_reportedAt_disaggregationKey: {
          indicatorId: sub.indicatorId,
          reportedAt: sub.reportedAt,
          disaggregationKey: "",
        },
      },
      update: sub,
      create: sub,
    });
    count++;
  }

  console.log(`✅ Success! Seeded ${count} entries for indicator "${indicatorName}"`);
  console.log(`🔗 Project ID: ${project.id}`);
  console.log(`🔗 Indicator ID: ${indicator.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
