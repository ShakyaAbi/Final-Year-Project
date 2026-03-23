import nodemailer from 'nodemailer';
import { config } from '../config/env';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465, // true for 465, false for other ports
  auth: config.smtp.user ? {
    user: config.smtp.user,
    pass: config.smtp.pass,
  } : undefined,
});

export async function sendReminderEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  if (!config.smtp.host) {
    console.log(`[EMAIL-MOCK] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL] Sent message to ${to}: ${info.messageId}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send email to ${to}:`, err);
    throw err;
  }
}
