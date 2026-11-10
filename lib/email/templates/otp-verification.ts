/**
 * FRZZY Studio - Human, Minimal, Device-Responsive OTP Verification Email Template
 * Adheres strictly to Curare Design System & Apple/Linear human typography.
 * Engineered for 100% compatibility across Gmail (iOS/Android/Web), Apple Mail, Outlook, and Samsung Mail.
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
  const safeName = name?.trim() ? name.trim() : 'there';
  const roleDisplay = role ? role.replace(/_/g, ' ') : 'team member';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>Your FRZZY Studio verification code</title>
  <style type="text/css">
    /* Core Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #090a0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Display', Helvetica, Arial, sans-serif; }

    /* Fluid Responsive Rules */
    @media only screen and (max-width: 580px) {
      .email-wrapper { width: 100% !important; padding: 16px 12px !important; }
      .email-card { width: 100% !important; border-radius: 16px !important; }
      .card-padding { padding: 32px 20px !important; }
      .otp-heading { font-size: 22px !important; }
      .otp-digit-box { font-size: 28px !important; letter-spacing: 5px !important; padding: 18px 12px !important; }
      .meta-box td { padding: 6px 10px !important; font-size: 13px !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #090a0d; -webkit-font-smoothing: antialiased; word-spacing: normal;">
  <!-- WRAPPER TABLE -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="background-color: #090a0d; padding: 48px 16px; margin: 0;">
    <tr>
      <td align="center" valign="top">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="520">
        <tr>
        <td align="center" valign="top" width="520">
        <![endif]-->

        <!-- MAIN CONTAINER CARD -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="max-width: 520px; width: 100%; background-color: #12141a; border: 1px solid #1f232d; border-radius: 20px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45); overflow: hidden; margin: 0 auto;">
          <tr>
            <td class="card-padding" style="padding: 40px 36px; text-align: left;">
              
              <!-- BRAND HEADER -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 8px; height: 8px; background-color: #26D67C; border-radius: 2px;"></td>
                        <td style="padding-left: 8px; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">
                          FRZZY STUDIO
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" style="font-size: 12px; color: #6b7280; font-weight: 500;">
                    Team Access
                  </td>
                </tr>
              </table>

              <!-- TITLE & GREETING -->
              <h1 class="otp-heading" style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #ffffff; letter-spacing: -0.4px; line-height: 1.3;">
                Your verification code
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                Hi ${safeName},<br />
                Here is your single-use code to verify your email and complete your FRZZY Studio account setup:
              </p>

              <!-- OTP CODE DISPLAY CARD -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #0b0c10; border: 1px solid #232836; border-radius: 14px; padding: 22px 16px;">
                    <div class="otp-digit-box" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Segoe UI Mono', Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #26D67C; line-height: 1; text-align: center; text-indent: 8px;">
                      ${formattedOtp}
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: #6b7280; text-align: center;">
                      Expires in ${expiresInMinutes} minutes &bull; Single-use only
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ACCOUNT SUMMARY (CLEAN & MINIMAL) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="meta-box" style="background-color: #0e1015; border: 1px solid #1a1e27; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 14px; font-size: 13px; color: #6b7280; border-bottom: 1px solid #171b23;">
                    Account
                  </td>
                  <td align="right" style="padding: 10px 14px; font-size: 13px; font-weight: 500; color: #e5e7eb; border-bottom: 1px solid #171b23;">
                    ${email}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 13px; color: #6b7280;">
                    Role
                  </td>
                  <td align="right" style="padding: 10px 14px; font-size: 13px; font-weight: 500; color: #26D67C; text-transform: capitalize;">
                    ${roleDisplay}
                  </td>
                </tr>
              </table>

              <!-- REASSURANCE NOTE -->
              <p style="margin: 0 0 28px 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                If you didn't request this code or weren't expecting an invitation, you can safely ignore this email. No changes will be made to your account.
              </p>

              <!-- HUMAN SIGNATURE -->
              <p style="margin: 0; font-size: 14px; color: #d1d5db; line-height: 1.5;">
                Best,<br />
                <strong style="color: #ffffff; font-weight: 600;">The FRZZY Team</strong>
              </p>

              <!-- DIVIDER & FOOTER -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px; border-top: 1px solid #1a1e26;">
                <tr>
                  <td align="center" style="padding-top: 24px; font-size: 12px; line-height: 1.6; color: #4b5563;">
                    &copy; ${year} FRZZY Studio. All rights reserved.<br />
                    Design, Motion & Visual Engineering
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
        <!-- END MAIN CONTAINER CARD -->

        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
  <!-- END WRAPPER TABLE -->
</body>
</html>`;
}
