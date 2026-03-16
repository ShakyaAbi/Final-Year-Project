// reminderJob.ts - Scheduled job to send data entry reminders for indicators
import { prisma } from "../prisma";
import { sendReminderEmail } from "../utils/email"; // You must implement this or use your own notification util
import { subDays, addDays, isWithinInterval, isAfter } from "date-fns";

// Helper: get expected reporting periods based on frequency
function getPeriodStart(date: Date, frequency: string): Date {
  const d = new Date(date);
  if (frequency === "MONTHLY") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (frequency === "QUARTERLY") return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  if (frequency === "WEEKLY") {
    d.setDate(d.getDate() - d.getDay());
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return d;
}

export async function runReminderJob() {
  const today = new Date();
  const indicators = await prisma.indicator.findMany({
    where: { reminderEnabled: true },
    include: { submissions: true },
  });

  for (const indicator of indicators) {
    const freq = (indicator.validationConfig as any)?.reportingFrequency || "MONTHLY";
    const dueDate = getPeriodStart(today, freq);
    const hasSubmission = indicator.submissions.some((s: any) => {
      const subDate = getPeriodStart(new Date(s.reportedAt), freq);
      return subDate.getTime() === dueDate.getTime();
    });
    if (hasSubmission) continue;

    // Reminder window
    const daysBefore = indicator.reminderDaysBeforeDue ?? 3;
    const daysAfter = indicator.reminderDaysAfterDue ?? 2;
    const reminderWindow = {
      start: subDays(dueDate, daysBefore),
      end: addDays(dueDate, daysAfter),
    };
    if (!isWithinInterval(today, reminderWindow) && !isAfter(today, reminderWindow.end)) continue;

    // Recipients
    let recipients: string[] = [];
    if (Array.isArray(indicator.reminderRecipients)) {
      recipients = indicator.reminderRecipients as string[];
    }
    // TODO: fallback to project managers if no recipients
    if (recipients.length === 0) continue;

    // Send reminder (implement sendReminderEmail or use your own notification system)
    for (const email of recipients) {
      await sendReminderEmail({
        to: email,
        subject: `Data Entry Reminder: ${indicator.name}`,
        text: `Please enter data for indicator "${indicator.name}" for the period starting ${dueDate.toISOString().slice(0,10)}.`,
      });
    }
  }
}

// To run manually (for dev/testing):
if (require.main === module) {
  runReminderJob().then(() => {
    console.log("Reminder job complete");
    process.exit(0);
  });
}
