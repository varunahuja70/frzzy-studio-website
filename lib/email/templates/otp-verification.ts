/**
 * Premium FRZZY Studio Vault - OTP Verification Email Template
 * Adheres to Curare Design System: Deep Obsidian/Dark background,
 * luminous Primary Green (#26D67C) accents, clean typography, and Apple-grade precision.
 */

export interface OtpEmailProps {
  name: string;
  email: string;
  otp: string;
  role: string;
  expiresInMinutes?: number;
}

export function renderOtpEmailHtml({
  name,
  email,
  otp,
  role,
  expiresInMinutes = 10,
}: OtpEmailProps): string {
  // Format OTP as spaced digits for instant legibility
  const formattedOtp = otp.split('').join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FRZZY Studio Vault - Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #08090a;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f2f3f5;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #08090a;
      padding: 48px 16px;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background: #101216;
      border: 1px solid #1f232b;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
    }
    .header {
      padding: 36px 36px 24px 36px;
      border-bottom: 1px solid #1a1e26;
      text-align: center;
      background: linear-gradient(180deg, rgba(38, 214, 124, 0.08) 0%, rgba(16, 18, 22, 0) 100%);
    }
    .brand-pill {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(38, 214, 124, 0.12);
      border: 1px solid rgba(38, 214, 124, 0.3);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #26D67C;
      margin-bottom: 16px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0 0 8px 0;
    }
    .subtitle {
      font-size: 14px;
      color: #8b929e;
      margin: 0;
    }
    .body {
      padding: 36px;
    }
    .salutation {
      font-size: 15px;
      line-height: 1.6;
      color: #c9ced6;
      margin: 0 0 24px 0;
    }
    .otp-card {
      background: #090a0d;
      border: 1px solid #232833;
      border-radius: 18px;
      padding: 28px 20px;
      text-align: center;
      margin: 28px 0;
      position: relative;
    }
    .otp-code {
      font-family: 'SF Mono', Menlo, Consolas, Monaco, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #26D67C;
      text-shadow: 0 0 24px rgba(38, 214, 124, 0.4);
      margin: 0;
      padding: 0;
    }
    .otp-meta {
      display: inline-block;
      margin-top: 14px;
      font-size: 12px;
      color: #838b96;
      background: rgba(255, 255, 255, 0.04);
      padding: 4px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .info-list {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 6px 0;
      color: #9aa2ae;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 500;
    }
    .info-value {
      font-weight: 600;
      color: #f0f2f5;
    }
    .security-notice {
      font-size: 12px;
      line-height: 1.5;
      color: #6d7582;
      background: rgba(255, 180, 50, 0.05);
      border: 1px solid rgba(255, 180, 50, 0.15);
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: 24px;
    }
    .footer {
      padding: 24px 36px 36px 36px;
      border-top: 1px solid #1a1e26;
      text-align: center;
      font-size: 12px;
      color: #555d69;
    }
    .footer a {
      color: #26D67C;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- HEADER -->
      <div class="header">
        <div class="brand-pill">FRZZY STUDIO VAULT</div>
        <h1 class="title">Account Verification Code</h1>
        <p class="subtitle">Ultra-Secure Access Control System</p>
      </div>

      <!-- BODY -->
      <div class="body">
        <p class="salutation">
          Hello <strong>${name}</strong>,<br>
          A new administrator profile has been configured for your email address on the <strong>FRZZY Studio Vault</strong>. Use the single-use verification code below to authorize your account.
        </p>

        <!-- OTP BOX -->
        <div class="otp-card">
          <div class="otp-code">${formattedOtp}</div>
          <div class="otp-meta">⏳ Expires in ${expiresInMinutes} minutes &bull; Single-use only</div>
        </div>

        <!-- USER SPECIFICATIONS -->
        <table width="100%" cellpadding="6" cellspacing="0" style="background: rgba(255, 255, 255, 0.02); border: 1px solid #1f232b; border-radius: 12px; margin-bottom: 24px; font-size: 13px;">
          <tr>
            <td style="color: #8b929e; padding-left: 14px;">Target Account:</td>
            <td style="color: #ffffff; font-weight: 600; text-align: right; padding-right: 14px;">${email}</td>
          </tr>
          <tr>
            <td style="color: #8b929e; padding-left: 14px;">Assigned Scope:</td>
            <td style="color: #26D67C; font-weight: 600; text-align: right; padding-right: 14px; text-transform: uppercase;">${role}</td>
          </tr>
          <tr>
            <td style="color: #8b929e; padding-left: 14px;">Security Protocol:</td>
            <td style="color: #ffffff; font-weight: 600; text-align: right; padding-right: 14px;">SHA-256 HMAC OTP</td>
          </tr>
        </table>

        <!-- SECURITY ADVISORY -->
        <div class="security-notice">
          🔒 <strong>Security Notice:</strong> Never forward or share this verification code with anyone. FRZZY Studio engineers will never ask for your authentication codes. If you did not request this account, please immediately contact security.
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        &copy; ${new Date().getFullYear()} FRZZY Studio Inc. &bull; All Rights Reserved.<br>
        Autonomous Digital Production & Creative Engineering<br>
        <span style="display: inline-block; margin-top: 8px; color: #3c424d;">Origin IP: Authenticated Vault Cluster</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
