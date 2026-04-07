export interface DeviceApprovalEmailProps {
  userName: string;
  userEmail: string;
  deviceInfo: {
    platform: string;
    userAgent: string;
    ipAddress?: string;
    timestamp: string;
  };
  approvalLink: string;
}

export function generateDeviceApprovalEmail(props: DeviceApprovalEmailProps): string {
  const { userName, userEmail, deviceInfo, approvalLink } = props;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Device Authorization Required - Musa Security</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🔐 Device Authorization Required</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>${userName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                A login attempt was made to your <strong>Head of Household</strong> account from a new device that we don't recognize. For your security, we need you to authorize this device before it can be used.
              </p>

              <!-- Device Info Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 16px; font-weight: 600;">Device Information:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Platform:</strong></td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">${deviceInfo.platform}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Browser:</strong></td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">${deviceInfo.userAgent}</td>
                  </tr>
                  ${deviceInfo.ipAddress ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>IP Address:</strong></td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">${deviceInfo.ipAddress}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Time:</strong></td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">${deviceInfo.timestamp}</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Was this you?</strong> If you recognize this login attempt, please click the button below to authorize this device:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${approvalLink}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Authorize This Device
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${approvalLink}" style="color: #667eea; word-break: break-all;">${approvalLink}</a>
              </p>

              <!-- Security Notice -->
              <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #856404; font-size: 14px; font-weight: 600;">
                  ⚠️ Security Notice
                </p>
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  <strong>If you did not attempt to log in</strong>, your account may be compromised. Please:
                </p>
                <ul style="margin: 10px 0 0 20px; padding: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  <li>Do NOT click the authorization button</li>
                  <li>Change your password immediately</li>
                  <li>Contact your estate administrator</li>
                </ul>
              </div>

              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                This authorization link will expire in <strong>30 minutes</strong> for security reasons.
              </p>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                This is an automated security email from Musa Security App. Please do not reply to this email.
                If you have questions, contact your estate administrator.
              </p>

              <p style="margin: 15px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                Account: ${userEmail}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Musa Security App. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                Keeping your estate secure, one device at a time.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Plain text version for email clients that don't support HTML
export function generateDeviceApprovalEmailPlainText(props: DeviceApprovalEmailProps): string {
  const { userName, userEmail, deviceInfo, approvalLink } = props;

  return `
DEVICE AUTHORIZATION REQUIRED

Hello ${userName},

A login attempt was made to your Head of Household account from a new device that we don't recognize. For your security, we need you to authorize this device before it can be used.

DEVICE INFORMATION:
- Platform: ${deviceInfo.platform}
- Browser: ${deviceInfo.userAgent}
${deviceInfo.ipAddress ? `- IP Address: ${deviceInfo.ipAddress}\n` : ''}- Time: ${deviceInfo.timestamp}

WAS THIS YOU?
If you recognize this login attempt, please click the link below to authorize this device:

${approvalLink}

SECURITY NOTICE:
If you did not attempt to log in, your account may be compromised. Please:
- Do NOT click the authorization link
- Change your password immediately
- Contact your estate administrator

This authorization link will expire in 30 minutes for security reasons.

---
This is an automated security email from Musa Security App.
Account: ${userEmail}

© ${new Date().getFullYear()} Musa Security App. All rights reserved.
  `.trim();
}
