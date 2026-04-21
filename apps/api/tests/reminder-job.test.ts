import { prisma } from "../src/prisma";
import { sendReminderEmail } from "../src/utils/email";
import { runReminderJob } from "../src/jobs/reminderJob";

jest.mock("../src/prisma", () => ({
  prisma: {
    indicator: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../src/utils/email", () => ({
  sendReminderEmail: jest.fn(),
}));

describe("reminderJob", () => {
  const mockedPrisma = prisma as {
    indicator: {
      findMany: jest.Mock;
    };
  };
  const mockedSendReminderEmail = sendReminderEmail as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends reminder emails for indicators that are due and have no submission", async () => {
    mockedPrisma.indicator.findMany.mockResolvedValue([
      {
        id: 1,
        name: "Water Point Functionality Index",
        reminderEnabled: true,
        reminderDaysBeforeDue: 3,
        reminderDaysAfterDue: 2,
        reminderRecipients: ["manager@example.com"],
        validationConfig: { reportingFrequency: "MONTHLY" },
        submissions: [],
      },
    ]);

    mockedSendReminderEmail.mockResolvedValue(true);

    await runReminderJob();

    expect(mockedPrisma.indicator.findMany).toHaveBeenCalledWith({
      where: { reminderEnabled: true },
      include: { submissions: true },
    });
    expect(mockedSendReminderEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "manager@example.com",
        subject: "Data Entry Reminder: Water Point Functionality Index",
        text: expect.stringContaining("Water Point Functionality Index"),
      }),
    );
  });

  it("skips indicators that already have a submission for the current reporting period", async () => {
    mockedPrisma.indicator.findMany.mockResolvedValue([
      {
        id: 2,
        name: "Monthly Coverage Rate",
        reminderEnabled: true,
        reminderDaysBeforeDue: 3,
        reminderDaysAfterDue: 2,
        reminderRecipients: ["manager@example.com"],
        validationConfig: { reportingFrequency: "MONTHLY" },
        submissions: [
          {
            reportedAt: new Date("2026-04-05T09:00:00.000Z"),
          },
        ],
      },
    ]);

    await runReminderJob();

    expect(mockedSendReminderEmail).not.toHaveBeenCalled();
  });
});
