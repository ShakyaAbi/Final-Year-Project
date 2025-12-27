import { IndicatorDataType, NodeType, PrismaClient, ProjectStatus, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

// Static seed credentials so reseeding doesn't depend on .env
const SEED_ADMIN_EMAIL = "admin@gmail.com";
const SEED_ADMIN_PASSWORD = "admin1234";

type NodeKey = "goal" | "outcome" | "output" | "activity";

type SeedProject = {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date | null;
  nodes: Record<NodeKey, { title: string; description?: string }>;
  indicators: Array<{
    nodeKey: NodeKey;
    name: string;
    unit: string;
    dataType: IndicatorDataType;
    baselineValue?: number | null;
    targetValue?: number | null;
    minValue?: number | null;
    maxValue?: number | null;
  }>;
};

const createLogframeAndIndicators = async (projectId: number, project: SeedProject) => {
  const existingNode = await prisma.logframeNode.findFirst({ where: { projectId } });
  if (!existingNode) {
    const goal = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.GOAL,
        title: project.nodes.goal.title,
        description: project.nodes.goal.description ?? null,
        sortOrder: 1
      }
    });

    const outcome = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.OUTCOME,
        title: project.nodes.outcome.title,
        description: project.nodes.outcome.description ?? null,
        parentId: goal.id,
        sortOrder: 2
      }
    });

    const output = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.OUTPUT,
        title: project.nodes.output.title,
        description: project.nodes.output.description ?? null,
        parentId: outcome.id,
        sortOrder: 3
      }
    });

    const activity = await prisma.logframeNode.create({
      data: {
        projectId,
        type: NodeType.ACTIVITY,
        title: project.nodes.activity.title,
        description: project.nodes.activity.description ?? null,
        parentId: output.id,
        sortOrder: 4
      }
    });

    const nodeIds: Record<NodeKey, number> = {
      goal: goal.id,
      outcome: outcome.id,
      output: output.id,
      activity: activity.id
    };

    const existingIndicators = await prisma.indicator.findFirst({ where: { projectId } });
    if (!existingIndicators) {
      await prisma.indicator.createMany({
        data: project.indicators.map((indicator) => ({
          projectId,
          logframeNodeId: nodeIds[indicator.nodeKey],
          name: indicator.name,
          unit: indicator.unit,
          baselineValue: indicator.baselineValue ?? null,
          targetValue: indicator.targetValue ?? null,
          dataType: indicator.dataType,
          minValue: indicator.minValue ?? null,
          maxValue: indicator.maxValue ?? null
        }))
      });
    }

    return;
  }

  const existingIndicators = await prisma.indicator.findFirst({ where: { projectId } });
  if (!existingIndicators) {
    console.log(`Indicators missing for project ${project.name}, but logframe exists; add manually if needed.`);
  }
};

const seedProjects: SeedProject[] = [
  {
    name: "Clean Water Access Initiative",
    description: "Improve access to safe water in Rural District A.",
    status: ProjectStatus.ACTIVE,
    startDate: new Date("2024-01-15"),
    endDate: null,
    nodes: {
      goal: {
        title: "Increase access to safe water in Rural District A",
        description: "Expand reliable, safe water coverage for target communities."
      },
      outcome: {
        title: "Households with year-round access to safe water",
        description: "Sustained household use of protected water sources."
      },
      output: {
        title: "Boreholes constructed and functional",
        description: "Deliver functional boreholes that pass quality standards."
      },
      activity: {
        title: "Train water committees for maintenance",
        description: "Capacity-building for operation and maintenance."
      }
    },
    indicators: [
      {
        nodeKey: "goal",
        name: "Population with access to safe water",
        unit: "%",
        dataType: IndicatorDataType.PERCENT,
        baselineValue: 48,
        targetValue: 80,
        minValue: 0,
        maxValue: 100
      },
      {
        nodeKey: "outcome",
        name: "Households using protected water sources",
        unit: "households",
        dataType: IndicatorDataType.NUMBER,
        baselineValue: 1200,
        targetValue: 3000,
        minValue: 0,
        maxValue: 5000
      },
      {
        nodeKey: "output",
        name: "Boreholes meet quality standard",
        unit: "yes/no",
        dataType: IndicatorDataType.BOOLEAN
      },
      {
        nodeKey: "activity",
        name: "Maintenance training status",
        unit: "status",
        dataType: IndicatorDataType.TEXT
      }
    ]
  },
  {
    name: "Maternal Health Outreach",
    description: "Reduce maternal mortality through outreach and facility care.",
    status: ProjectStatus.ACTIVE,
    startDate: new Date("2024-03-01"),
    endDate: null,
    nodes: {
      goal: {
        title: "Reduce maternal mortality in District B",
        description: "Improve maternal outcomes through quality care and outreach."
      },
      outcome: {
        title: "Increase facility-based deliveries",
        description: "More deliveries attended by skilled staff in facilities."
      },
      output: {
        title: "Community health workers trained",
        description: "CHWs trained on maternal care and referral pathways."
      },
      activity: {
        title: "Monthly outreach sessions delivered",
        description: "Community sessions delivered on maternal health services."
      }
    },
    indicators: [
      {
        nodeKey: "goal",
        name: "Skilled birth attendance rate",
        unit: "%",
        dataType: IndicatorDataType.PERCENT,
        baselineValue: 55,
        targetValue: 85,
        minValue: 0,
        maxValue: 100
      },
      {
        nodeKey: "outcome",
        name: "Facility-based deliveries per year",
        unit: "deliveries",
        dataType: IndicatorDataType.NUMBER,
        baselineValue: 900,
        targetValue: 1800,
        minValue: 0,
        maxValue: 3000
      },
      {
        nodeKey: "output",
        name: "CHW training completed",
        unit: "yes/no",
        dataType: IndicatorDataType.BOOLEAN
      },
      {
        nodeKey: "activity",
        name: "Outreach session report status",
        unit: "status",
        dataType: IndicatorDataType.TEXT
      }
    ]
  },
  {
    name: "Education Access Boost",
    description: "Increase enrollment and attendance in underserved communities.",
    status: ProjectStatus.ACTIVE,
    startDate: new Date("2024-02-10"),
    endDate: null,
    nodes: {
      goal: {
        title: "Improve access to quality education in District C",
        description: "Raise enrollment and reduce dropout rates for primary schools."
      },
      outcome: {
        title: "Higher attendance rates among primary students",
        description: "Students attend school regularly throughout the year."
      },
      output: {
        title: "Schools upgraded with learning materials",
        description: "Learning kits and classroom materials delivered."
      },
      activity: {
        title: "Distribute learning kits",
        description: "Quarterly distribution of learning kits to schools."
      }
    },
    indicators: [
      {
        nodeKey: "goal",
        name: "Net enrollment rate",
        unit: "%",
        dataType: IndicatorDataType.PERCENT,
        baselineValue: 62,
        targetValue: 85,
        minValue: 0,
        maxValue: 100
      },
      {
        nodeKey: "outcome",
        name: "Average attendance per term",
        unit: "days",
        dataType: IndicatorDataType.NUMBER,
        baselineValue: 48,
        targetValue: 60,
        minValue: 0,
        maxValue: 70
      },
      {
        nodeKey: "output",
        name: "Learning materials delivered",
        unit: "yes/no",
        dataType: IndicatorDataType.BOOLEAN
      },
      {
        nodeKey: "activity",
        name: "Distribution report status",
        unit: "status",
        dataType: IndicatorDataType.TEXT
      }
    ]
  },
  {
    name: "Climate Smart Farming",
    description: "Improve resilience through climate-smart agriculture practices.",
    status: ProjectStatus.ACTIVE,
    startDate: new Date("2024-04-05"),
    endDate: null,
    nodes: {
      goal: {
        title: "Increase climate resilience for smallholder farmers",
        description: "Adopt climate-smart practices to stabilize yields."
      },
      outcome: {
        title: "Farmers adopt climate-smart practices",
        description: "Increased adoption of improved seeds and soil management."
      },
      output: {
        title: "Demonstration plots established",
        description: "Operational demo plots for training and learning."
      },
      activity: {
        title: "Run farmer field schools",
        description: "Monthly sessions on climate-smart methods."
      }
    },
    indicators: [
      {
        nodeKey: "goal",
        name: "Yield stability index",
        unit: "index",
        dataType: IndicatorDataType.NUMBER,
        baselineValue: 0.6,
        targetValue: 0.8,
        minValue: 0,
        maxValue: 1
      },
      {
        nodeKey: "outcome",
        name: "Farmers using improved seeds",
        unit: "farmers",
        dataType: IndicatorDataType.NUMBER,
        baselineValue: 300,
        targetValue: 900,
        minValue: 0,
        maxValue: 2000
      },
      {
        nodeKey: "output",
        name: "Demo plots meet standards",
        unit: "yes/no",
        dataType: IndicatorDataType.BOOLEAN
      },
      {
        nodeKey: "activity",
        name: "Field school session log",
        unit: "status",
        dataType: IndicatorDataType.TEXT
      }
    ]
  }
];

async function main() {
  const email = SEED_ADMIN_EMAIL;
  const password = SEED_ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN
      }
    });
    console.log(`Seeded admin user ${email} with provided password.`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  for (const project of seedProjects) {
    const existingProject = await prisma.project.findFirst({ where: { name: project.name } });
    if (existingProject) {
      await createLogframeAndIndicators(existingProject.id, project);
      console.log(`Project already exists: ${project.name}`);
      continue;
    }

    const createdProject = await prisma.project.create({
      data: {
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate ?? null
      }
    });

    await createLogframeAndIndicators(createdProject.id, project);
    console.log(`Seeded project: ${project.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
