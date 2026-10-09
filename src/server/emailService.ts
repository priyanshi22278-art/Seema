import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  type?: string;
}

export interface EmailResult {
  success: boolean;
  configured: boolean;
  messageId?: string;
  error?: string;
}

export function isEmailServiceConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass);
}

export async function sendEmailNotification(payload: EmailPayload): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'CampusPulse Notifications <noreply@campuspulse.edu>';

  if (!host || !user || !pass) {
    console.warn(
      `[EmailService] Outgoing email not dispatched to ${payload.to}: Email service is not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS in server environment).`
    );
    return {
      success: false,
      configured: false,
      error: 'Email service is not configured. (Configure SMTP_HOST, SMTP_USER, and SMTP_PASS in server environment variables to enable delivery).',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || `<div style="font-family: sans-serif; padding: 20px;"><h2>${payload.subject}</h2><p>${payload.text.replace(/\n/g, '<br/>')}</p></div>`,
    });

    console.log(`[EmailService] Email successfully sent to ${payload.to}: ${info.messageId}`);
    return {
      success: true,
      configured: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error(`[EmailService] Failed to send email to ${payload.to}:`, err);
    return {
      success: false,
      configured: true,
      error: err.message || 'SMTP delivery failure',
    };
  }
}
