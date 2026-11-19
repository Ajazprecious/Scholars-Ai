import nodemailer from 'nodemailer';
let transport;
function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transport ||= nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  return transport;
}
export async function sendActionEmail({ to, subject, url, action }) {
  const mailer = getTransport();
  if (!mailer) { if (process.env.NODE_ENV !== 'production') console.info(`[DEV EMAIL] ${action} for ${to}: ${url}`); else throw new Error('Email delivery is not configured'); return; }
  await mailer.sendMail({ from: process.env.SMTP_FROM, to, subject, text: `Use this link to ${action}: ${url}\n\nIf you did not request this, ignore this email.` });
}
