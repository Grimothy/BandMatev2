import nodemailer from 'nodemailer';
import { config } from '../config/env';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure, // true for 465, false for other ports
  auth: config.email.auth.user ? {
    user: config.email.auth.user,
    pass: config.email.auth.pass,
  } : undefined,
});

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using the configured transporter
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Skip sending if email is not configured
  if (!config.email.enabled) {
    console.log('[Email] Email sending is disabled. Would have sent:', options.subject);
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[Email] Sent email to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return false;
  }
}

/**
 * Send a notification email
 */
export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  resourceLink?: string
): Promise<boolean> {
  const baseUrl = config.email.appUrl;
  const fullLink = resourceLink ? `${baseUrl}${resourceLink}` : undefined;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">BandMate</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0;">${title}</h2>
          <p>${message}</p>
          ${fullLink ? `<a href="${fullLink}" class="button">View in BandMate</a>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated notification from BandMate.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `${title}\n\n${message}${fullLink ? `\n\nView in BandMate: ${fullLink}` : ''}`;

  return sendEmail({
    to,
    subject: `[BandMate] ${title}`,
    text,
    html,
  });
}
