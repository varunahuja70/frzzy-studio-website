import nodemailer from 'nodemailer';
import { renderOtpEmailHtml, OtpEmailProps } from './templates/otp-verification';

export interface SendOtpResult {
  success: boolean;
  sentToEmail: boolean;
  debugOtp?: string;
  error?: string;
}

/**
 * Creates a Nodemailer transport if SMTP credentials are provided in environment variables.
 */
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Also support standard Gmail Service config if SMTP_GMAIL_USER and SMTP_GMAIL_PASS are provided
  if (process.env.SMTP_GMAIL_USER && process.env.SMTP_GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_GMAIL_USER,
        pass: process.env.SMTP_GMAIL_PASS,
      },
    });
  }

  return null;
}

/**
 * Dispatches an ultra-secure OTP verification email to the user.
 * If SMTP is configured, sends the email immediately.
 * In local/offline development, prints a glowing console banner and provides debugOtp.
 */
export async function sendOtpVerificationEmail(props: OtpEmailProps): Promise<SendOtpResult> {
  const { email, name, otp, role, expiresInMinutes = 10 } = props;
  const html = renderOtpEmailHtml({ email, name, otp, role, expiresInMinutes });
  const from = process.env.SMTP_FROM || `"FRZZY Studio Vault" <${process.env.SMTP_USER || 'vault@frzzy.studio'}>`;

  const transporter = getEmailTransporter();

  // Always log prominently to terminal in development for testing convenience
  console.log(`
\x1b[32m╔══════════════════════════════════════════════════════════════════════╗
║                FRZZY STUDIO VAULT - OTP DISPATCH                     ║
╠══════════════════════════════════════════════════════════════════════╣
║ Recipient : \x1b[37m${email.padEnd(52)}\x1b[32m║
║ User Name : \x1b[37m${name.padEnd(52)}\x1b[32m║
║ Role Scope: \x1b[37m${role.padEnd(52)}\x1b[32m║
║ OTP Code  : \x1b[1m\x1b[36m[ ${otp.split('').join(' ')} ]\x1b[0m\x1b[32m (Valid for ${expiresInMinutes} mins)             ║
╚══════════════════════════════════════════════════════════════════════╝\x1b[0m
  `);

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `[${otp}] Your FRZZY Studio Vault Verification Code`,
        html,
        text: `Hello ${name},\n\nYour FRZZY Studio Vault verification code is: ${otp}\nValid for ${expiresInMinutes} minutes.\n\nDo not share this code with anyone.`,
      });

      return {
        success: true,
        sentToEmail: true,
        debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      };
    } catch (err: any) {
      console.error('[Email Dispatch] SMTP error:', err.message);
      // Fallback in dev/local mode
      return {
        success: true,
        sentToEmail: false,
        debugOtp: otp,
        error: `SMTP error: ${err.message}. Code logged to server console.`,
      };
    }
  }

  // When SMTP is not configured: local testing mode
  return {
    success: true,
    sentToEmail: false,
    debugOtp: otp,
  };
}
