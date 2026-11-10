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
 * Never prints plaintext OTP in console logs.
 */
export async function sendOtpVerificationEmail(props: OtpEmailProps): Promise<SendOtpResult> {
  const { email, name, otp, role, expiresInMinutes = 10 } = props;
  const html = renderOtpEmailHtml({ email, name, otp, role, expiresInMinutes });
  const from = process.env.SMTP_FROM || `"FRZZY Studio" <${process.env.SMTP_GMAIL_USER || 'vault@frzzy.studio'}>`;

  const transporter = getEmailTransporter();

  // Log dispatch event securely without exposing plaintext OTP in terminal
  const maskedEmail = email.replace(/(?<=^.{2}).+(?=@)/, '***');
  console.log(`[Vault Security] OTP dispatch requested for ${maskedEmail} (Channel: ${transporter ? 'Gmail SMTP' : 'Local Sandbox'})`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `${otp} is your FRZZY Studio verification code`,
        html,
        text: `Hi ${name || 'there'},\n\nYour FRZZY Studio verification code is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.\nIf you did not request this code, you can safely ignore this email.\n\nBest,\nThe FRZZY Team`,
      });

      console.log(`[Vault Security] OTP email delivered to ${maskedEmail} via SMTP successfully.`);

      return {
        success: true,
        sentToEmail: true,
        debugOtp: process.env.NODE_ENV === 'test' ? otp : undefined,
      };
    } catch (err: any) {
      console.error('[Vault Security] SMTP dispatch failed:', err.message);
      return {
        success: true,
        sentToEmail: false,
        debugOtp: process.env.NODE_ENV === 'test' ? otp : undefined,
        error: `SMTP error: ${err.message}`,
      };
    }
  }

  return {
    success: true,
    sentToEmail: false,
    debugOtp: process.env.NODE_ENV === 'test' ? otp : undefined,
  };
}
