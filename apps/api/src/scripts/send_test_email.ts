import { config } from '../config/env';
import { sendReminderEmail } from '../utils/email';

async function main() {
  const to = process.env.TEST_EMAIL_TO ?? config.smtp.user ?? '';
  if (!to) {
    console.error('No recipient configured. Set TEST_EMAIL_TO or SMTP_USER in .env');
    process.exit(1);
  }

  console.log('Testing email send to', to);
  console.log('EMAIL_DRY_RUN=', process.env.EMAIL_DRY_RUN ?? config.emailDryRun);

  try {
    const subject = 'MERLIN Lite - Test Email';
    const text = `This is a test email from MERLIN Lite sent at ${new Date().toISOString()}`;
    const html = `<p>This is a <strong>test</strong> email from MERLIN Lite sent at ${new Date().toISOString()}</p>`;

    const ok = await sendReminderEmail({ to, subject, text, html });
    console.log('sendReminderEmail returned:', ok);
    process.exit(0);
  } catch (err) {
    console.error('Error sending test email:', err);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
