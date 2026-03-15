import nodemailer, { Transporter } from 'nodemailer';
import { ENVIRONMENT } from '../config/env';
import { logger } from '../utils/logger';

class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: ENVIRONMENT.email.smtp.host,
        port: ENVIRONMENT.email.smtp.port,
        secure: ENVIRONMENT.email.smtp.secure,
        auth: {
          user: ENVIRONMENT.email.smtp.user,
          pass: ENVIRONMENT.email.smtp.pass,
        },
      });
    }
    return this.transporter;
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<void> {
    try {
      const transporter = this.getTransporter();
      const recipients = Array.isArray(to) ? to : [to];

      await transporter.sendMail({
        from: `"${ENVIRONMENT.email.fromName}" <${ENVIRONMENT.email.from}>`,
        to: recipients.join(', '),
        subject,
        text,
        html,
      });

      logger.info(`Email sent to ${recipients.join(', ')}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
