/**
 * FRZZY Studio - Exact Reference Match Luxury Light OTP Verification Template
 * Pixel-accurate reproduction of the reference design:
 * - Pure white floating luxury card (#FFFFFF) on soft ambient canvas (#F4F6F8)
 * - FRZZY STUDIO® with Lock Icon "Account Verification" header
 * - Large bold "Verify your email" title with human greeting
 * - 6 individual pale green (#E8F7F0) luxury rounded digit boxes
 * - Centered clock icon with "Expires in 10 minutes"
 * - Soft rounded security alert box with green checkmark icon
 * - Human sign-off: "Best, The FRZZY Team"
 * - Minimal footer with FRZZY emblem, copyright, and social icons (Instagram, YouTube, LinkedIn)
 * - 100% email client compatible with responsive mobile adaptation
 */

export interface OtpEmailProps {
  name: string;
  email: string;
  otp: string;
  role?: string;
  expiresInMinutes?: number;
}

export function renderOtpEmailHtml({
  name,
  email,
  otp,
  role = 'team member',
  expiresInMinutes = 10,
}: OtpEmailProps): string {
  // Ensure we have exactly 6 individual digits
  const rawOtp = (otp || '').trim().padStart(6, '0').slice(0, 6);
  const digits = rawOtp.split('');
  const safeName = name?.trim() ? name.trim() : 'there';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Verify your email - FRZZY Studio</title>
  <style type="text/css">
    /* Resets & Base */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f4f6f8;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Mobile Responsive Adaptation */
    @media only screen and (max-width: 580px) {
      .email-wrapper { padding: 16px 8px !important; }
      .email-card { width: 100% !important; border-radius: 20px !important; }
      .card-padding { padding: 32px 20px 28px 20px !important; }
      .header-title { font-size: 26px !important; }
      .otp-box { width: 42px !important; height: 56px !important; font-size: 26px !important; border-radius: 10px !important; }
      .otp-gap { width: 5px !important; }
      .security-box { padding: 14px 14px !important; }
      .footer-left { display: block !important; width: 100% !important; margin-bottom: 16px !important; }
      .footer-right { display: block !important; width: 100% !important; text-align: left !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, p, span { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; -webkit-font-smoothing: antialiased; word-spacing: normal;">
  <!-- OUTER WRAPPER TABLE -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="background-color: #f4f6f8; padding: 48px 16px; margin: 0;">
    <tr>
      <td align="center" valign="top">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="560">
        <tr>
        <td align="center" valign="top" width="560">
        <![endif]-->

        <!-- MAIN FLOATING WHITE CARD -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="max-width: 560px; width: 100%; background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 28px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); overflow: hidden; margin: 0 auto;">
          <tr>
            <td class="card-padding" style="padding: 44px 44px 36px 44px; text-align: left;">
              
              <!-- TOP HEADER (BRAND + ACCOUNT VERIFICATION PILL) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #f0f2f5; padding-bottom: 24px; margin-bottom: 36px;">
                <tr>
                  <td align="left" valign="middle">
                    <span style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px; color: #111827; text-transform: uppercase;">
                      FRZZY STUDIO<sup style="font-size: 9px; font-weight: 700; vertical-align: super; line-height: 0;">&reg;</sup>
                    </span>
                  </td>
                  <td align="right" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="right">
                      <tr>
                        <td valign="middle" style="padding-right: 5px;">
                          <!-- Minimalist Lock Icon -->
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </td>
                        <td valign="middle" style="font-size: 13px; color: #6b7280; font-weight: 500; letter-spacing: -0.1px;">
                          Account Verification
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- MAIN TITLE -->
              <h1 class="header-title" style="margin: 0 0 18px 0; font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.7px; line-height: 1.2;">
                Verify your email
              </h1>

              <!-- GREETING & INTRO TEXT -->
              <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #1f2937; line-height: 1.5;">
                Hi ${safeName},
              </p>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #4b5563; line-height: 1.55;">
                Use the verification code below to confirm your email and complete your FRZZY Studio account setup.
              </p>

              <!-- OTP DIGIT BOXES (6 INDIVIDUAL LUXURY ROUNDED TILES) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  <!-- Digit 1 -->
                  <td class="otp-box" align="center" valign="middle" style="width: 52px; height: 64px; background-color: #e8f7f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Helvetica, sans-serif; font-size: 30px; font-weight: 700; color: #111827; text-align: center; vertical-align: middle;">
                    ${digits[0]}
                  </td>
                  <td class="otp-gap" style="width: 8px;"></td>
                  <!-- Digit 2 -->
                  <td class="otp-box" align="center" valign="middle" style="width: 52px; height: 64px; background-color: #e8f7f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Helvetica, sans-serif; font-size: 30px; font-weight: 700; color: #111827; text-align: center; vertical-align: middle;">
                    ${digits[1]}
                  </td>
                  <td class="otp-gap" style="width: 8px;"></td>
                  <!-- Digit 3 -->
                  <td class="otp-box" align="center" valign="middle" style="width: 52px; height: 64px; background-color: #e8f7f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Helvetica, sans-serif; font-size: 30px; font-weight: 700; color: #111827; text-align: center; vertical-align: middle;">
                    ${digits[2]}
                  </td>
                  <td class="otp-gap" style="width: 8px;"></td>
                  <!-- Digit 4 -->
                  <td class="otp-box" align="center" valign="middle" style="width: 52px; height: 64px; background-color: #e8f7f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Helvetica, sans-serif; font-size: 30px; font-weight: 700; color: #111827; text-align: center; vertical-align: middle;">
                    ${digits[3]}
                  </td>
                  <td class="otp-gap" style="width: 8px;"></td>
                  <!-- Digit 5 -->
                  <td class="otp-box" align="center" valign="middle" style="width: 52px; height: 64px; background-color: #e8f7f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Helvetica, sans-serif; font-size: 30px; font-weight: 700; color: #111827; text-align: center; vertical-align: middle;">
                    ${digits[4]}
                  </td>
                  <td class="otp-gap" style="width: 8px;"></td>
                  <!-- Digit 6 -->
                  <td class="otp-box" align="center" valign="middle" style="width: 52px; height: 64px; background-color: #e8f7f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Helvetica, sans-serif; font-size: 30px; font-weight: 700; color: #111827; text-align: center; vertical-align: middle;">
                    ${digits[5]}
                  </td>
                </tr>
              </table>

              <!-- EXPIRY TIME WITH CLOCK ICON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 34px auto;">
                <tr>
                  <td valign="middle" style="padding-right: 6px;">
                    <!-- Minimalist Clock Icon -->
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </td>
                  <td valign="middle" style="font-size: 13px; color: #6b7280; font-weight: 500;">
                    Expires in ${expiresInMinutes} minutes
                  </td>
                </tr>
              </table>

              <!-- SECURITY ADVISORY / REASSURANCE CARD -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="security-box" style="background-color: #f8faf9; border-radius: 16px; margin-bottom: 34px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 14px; padding-top: 1px;">
                          <!-- Circular Green Shield/Checkmark Icon -->
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="display: block;">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="m9 12 2 2 4-4" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #4b5563;">
                          If you didn't request this code, you can safely ignore this email.<br />
                          Your account will remain secure.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- SIGN-OFF -->
              <p style="margin: 0 0 44px 0; font-size: 14px; line-height: 1.6; color: #374151;">
                Best,<br />
                <strong style="color: #111827; font-weight: 700;">The FRZZY Team</strong>
              </p>

              <!-- BOTTOM FOOTER (FRZZY ICON + COPYRIGHT + SOCIAL ICONS) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f0f2f5; padding-top: 24px;">
                <tr>
                  <!-- Left: Emblem + Copyright -->
                  <td class="footer-left" align="left" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- FRZZY Stylized Blade/F Emblem -->
                        <td valign="middle" style="padding-right: 14px;">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="display: block;">
                            <path d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6C21 7.10457 20.1046 8 19 8H7V11H16C17.1046 11 18 11.8954 18 13C18 14.1046 17.1046 15 16 15H7V20H3V6Z" fill="#111827"/>
                          </svg>
                        </td>
                        <!-- Vertical Hairline Divider -->
                        <td style="width: 1px; height: 28px; background-color: #e5e7eb;"></td>
                        <!-- Copyright & Tagline -->
                        <td valign="middle" style="padding-left: 14px; font-size: 12px; line-height: 1.5; color: #6b7280;">
                          &copy; ${year} FRZZY Studio. All rights reserved.<br />
                          Design, Motion & Visual Engineering.
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right: Social Media Icons -->
                  <td class="footer-right" align="right" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="right">
                      <tr>
                        <!-- Instagram -->
                        <td style="padding: 0 8px;">
                          <a href="https://instagram.com" target="_blank" style="text-decoration: none; display: inline-block;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                            </svg>
                          </a>
                        </td>
                        <!-- YouTube -->
                        <td style="padding: 0 8px;">
                          <a href="https://youtube.com" target="_blank" style="text-decoration: none; display: inline-block;">
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#111827"></polygon>
                            </svg>
                          </a>
                        </td>
                        <!-- LinkedIn -->
                        <td style="padding: 0 0 0 8px;">
                          <a href="https://linkedin.com" target="_blank" style="text-decoration: none; display: inline-block;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                              <rect x="2" y="9" width="4" height="12"></rect>
                              <circle cx="4" cy="4" r="2"></circle>
                            </svg>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
        <!-- END MAIN FLOATING WHITE CARD -->

        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
  <!-- END OUTER WRAPPER TABLE -->
</body>
</html>`;
}
