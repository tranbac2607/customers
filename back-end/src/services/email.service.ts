/**
 * Email service. Two backends:
 *
 *   - Production / configured: Nodemailer SMTP transport (Gmail by
 *     default, override SMTP_HOST/SMTP_PORT/SMTP_SECURE for any other
 *     provider). Enable by setting both SMTP_USER and SMTP_PASS in
 *     env. For Gmail, SMTP_PASS is a 16-char **App Password** (Google
 *     Account → Security → 2-Step Verification → App passwords), NOT
 *     the regular account password.
 *
 *   - Dev / not configured: console transport — every "sent" email
 *     is logged to stdout with a one-time URL so devs can copy/paste
 *     the link to test verify/reset flows without an SMTP server.
 *
 * The dev transport is intentionally explicit (DEV EMAIL) so you can
 * grep production logs and never mistake one for a real send.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const hasSmtp = Boolean(env.SMTP_USER && env.SMTP_PASS);

const transporter: Transporter | null = hasSmtp
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER!,
        pass: env.SMTP_PASS!,
      },
    })
  : null;

// Gmail refuses to send when the FROM address doesn't match the
// authenticated SMTP_USER. Fall back to the SMTP_USER so the FROM is
// always a real, deliverable address whenever SMTP is configured.
const FROM_ADDRESS = env.EMAIL_FROM || env.SMTP_USER || 'no-reply@customers.local';
const APP_BASE_URL = env.APP_BASE_URL ?? 'http://localhost:3000';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const emailService = {
  async send(msg: EmailMessage): Promise<void> {
    if (!transporter) {
      // Dev / fallback — log the full message including any links so
      // devs can copy/paste from the terminal to test the flow.
      logger.info(
        `[DEV EMAIL] to=${msg.to} from=${FROM_ADDRESS} subject=${msg.subject}\n` +
          `  text: ${msg.text}\n` +
          `  html: ${msg.html.slice(0, 200)}...`,
      );
      return;
    }
    try {
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      logger.info(`[EMAIL SENT] to=${msg.to} subject=${msg.subject}`);
    } catch (err) {
      logger.error('Failed to send email', { to: msg.to, subject: msg.subject, err });
      throw err;
    }
  },

  /**
   * Send an email-verification link. The link contains an opaque token
   * the BE hashes and stores; the FE hands the raw token to
   * POST /api/auth/verify-email, which compares the hash.
   */
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify your email address';
    const text =
      `Welcome! Please verify your email address by visiting this link:\n\n${url}\n\n` +
      `The link expires in 24 hours. If you didn't sign up, you can ignore this email.`;
    const html = `
      <h2>Verify your email</h2>
      <p>Welcome! Please verify your email address by clicking the button below:</p>
      <p><a href="${url}" style="background:#1677ff;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Verify email</a></p>
      <p>Or copy and paste this link: ${url}</p>
      <p style="color:#94a3b8;font-size:12px">The link expires in 24 hours.</p>`;
    await this.send({ to, subject, text, html });
  },

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Reset your password';
    const text =
      `Someone (hopefully you) requested a password reset. Visit this link to choose a new password:\n\n${url}\n\n` +
      `The link expires in 30 minutes. If you didn't request this, you can ignore this email.`;
    const html = `
      <h2>Reset your password</h2>
      <p>Someone (hopefully you) requested a password reset. Click below to choose a new password:</p>
      <p><a href="${url}" style="background:#1677ff;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reset password</a></p>
      <p>Or copy and paste this link: ${url}</p>
      <p style="color:#94a3b8;font-size:12px">The link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`;
    await this.send({ to, subject, text, html });
  },
};

/** Exposed for diagnostics / health checks so the FE / Swagger can
 *  surface whether real email is wired up. */
export const emailConfig = {
  configured: hasSmtp,
  from: FROM_ADDRESS,
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
};
