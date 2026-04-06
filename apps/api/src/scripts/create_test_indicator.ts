import { PrismaClient, NodeType, ProjectStatus, IndicatorDataType, Role } from '@prisma/client';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

async function main() {
  const recipient = process.env.TEST_EMAIL_TO || process.env.SMTP_USER;
  if (!recipient) {
    console.error('Please set TEST_EMAIL_TO or SMTP_USER in your environment');
    process.exit(1);
  }

  console.log('Creating test indicator that will send reminders to:', recipient);

  // 1) Create organization if not exists
  let org = await prisma.organization.findFirst({ where: { name: 'Test Reminder Org' } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Test Reminder Org' } });
    console.log('Created organization id=', org.id);
  } else {
    console.log('Using existing organization id=', org.id);
  }

  // 2) Create or find a user to be the creator
  let user = await prisma.user.findUnique({ where: { email: recipient } });
  if (!user) {
    const pw = await hashPassword('TestPass123!');
    user = await prisma.user.create({
      data: {
        email: recipient,
        passwordHash: pw,
        role: Role.ADMIN,
        organizationId: org.id,
        name: 'Reminder Test User',
      },
    });
    console.log('Created user id=', user.id);
  } else {
    console.log('Using existing user id=', user.id);
  }

  // 3) Create a project
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Test Reminder Project',
      status: ProjectStatus.ACTIVE,
      startDate: new Date(),
    },
  });
  console.log('Created project id=', project.id);

  // 4) Create a logframe node
  const node = await prisma.logframeNode.create({
    data: {
      projectId: project.id,
      type: NodeType.ACTIVITY,
      title: 'Test Node',
      sortOrder: 1,
    },
  });
  console.log('Created logframe node id=', node.id);

  // 5) Create the indicator with reminders enabled
  const indicator = await prisma.indicator.create({
    data: {
      projectId: project.id,
      logframeNodeId: node.id,
      name: 'Test Reminder Indicator',
      unit: 'count',
      dataType: IndicatorDataType.NUMBER,
      createdByUserId: user.id,
      validationConfig: { reportingFrequency: 'DAILY' },
      reminderEnabled: true,
      reminderDaysBeforeDue: 3,
      reminderDaysAfterDue: 3,
      reminderRecipients: [recipient] as any,
    },
  });

  console.log('Created indicator id=', indicator.id);
  await prisma.$disconnect();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error creating test indicator', err);
      process.exit(1);
    });
}
