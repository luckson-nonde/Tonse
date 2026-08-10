import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  cid?: string;
  contentType?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

/**
 * Thin SMTP mailer, configured entirely from env:
 *
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_SECURE / MAIL_FROM
 *
 * Deliberately fail-soft: with no SMTP_HOST configured (local dev, fresh
 * deploys) `send` logs and returns false instead of throwing — a missing mail
 * server must never break the flow that wanted to send (e.g. a ticket
 * purchase). Callers can branch on `enabled` to phrase their UI honestly.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  get enabled(): boolean {
    return !!process.env.SMTP_HOST;
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT || 587);
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // Implicit TLS on 465; STARTTLS upgrade everywhere else.
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }
    return this.transporter;
  }

  /** Returns true when the message was handed to the SMTP server. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.enabled) {
      this.logger.log(`SMTP not configured — skipped email "${message.subject}" to ${message.to}`);
      return false;
    }
    try {
      await this.getTransporter().sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: message.to,
        subject: message.subject,
        html: message.html,
        attachments: message.attachments,
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Failed to send "${message.subject}" to ${message.to}: ${e?.message}`);
      return false;
    }
  }
}
