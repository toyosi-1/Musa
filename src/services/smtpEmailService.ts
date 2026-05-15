// Email Service for Musa App - Powered by Resend
// All emails are sent via the /api/send-email route which uses Resend
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface HouseholdInviteData {
  householdName: string;
  inviterName: string;
  acceptUrl: string;
  recipientEmail: string;
}

interface ApprovalNotificationData {
  userName: string;
  userEmail: string;
  userRole: string;
  approvedBy: string;
  loginUrl: string;
}

interface RejectionNotificationData {
  userName: string;
  userEmail: string;
  userRole: string;
  rejectedBy: string;
  reason: string;
  supportEmail?: string;
}

// The "from" address is controlled server-side via the RESEND_FROM_EMAIL
// environment variable set in Netlify. We do NOT hardcode it here.

/**
 * Send approval notification email via Resend
 */
export const sendApprovalNotificationEmail = async (data: ApprovalNotificationData): Promise<boolean> => {
  try {
    const emailHtml = generateApprovalNotificationHTML(data);
    
    const emailData: EmailData = {
      to: data.userEmail,
      subject: "🎉 Your Musa account has been approved!",
      html: emailHtml,
    };

    const response = await fetchWithAuth('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ emailData }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Email API responded with status: ${response.status} - ${errorBody?.error || 'Unknown'}`);
    }

    const result = await response.json();
    console.log('✅ Approval notification email sent successfully:', result);
    return true;

  } catch (error) {
    console.error('❌ Error sending approval notification email:', error);
    return false;
  }
};

/**
 * Send household invitation email via Resend
 */
export const sendHouseholdInvitationEmail = async (data: HouseholdInviteData): Promise<boolean> => {
  try {
    const emailHtml = generateHouseholdInvitationHTML(data);
    
    const emailData: EmailData = {
      to: data.recipientEmail,
      subject: "You've been invited to join a household on Musa",
      html: emailHtml,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetchWithAuth('/api/send-email', {
        method: 'POST',
        body: JSON.stringify({ emailData }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`Email API responded with status: ${response.status} - ${errorBody?.error || 'Unknown'}`);
      }

      const result = await response.json();
      console.log('✅ Household invitation email sent successfully:', result);
      return true;
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    console.error('❌ Error sending household invitation email:', error);
    return false;
  }
};

/**
 * Generate HTML template for household invitation
 */
export function generateHouseholdInvitationHTML(data: HouseholdInviteData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to Musa</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo / Brand header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#DAA520;width:64px;height:64px;border-radius:16px;text-align:center;vertical-align:middle;border:3px solid #FFD700;">
                    <span style="font-size:32px;line-height:64px;">🏠</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Musa</span><br>
                    <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Security &amp; Access</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#161b22;border-radius:16px;border:1px solid #21262d;overflow:hidden;">

              <!-- Top accent bar -->
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#DAA520,#f59e0b,#fbbf24);"></td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 32px;">

                  <!-- Heading -->
                  <p style="margin:0 0 6px;font-size:26px;font-weight:700;color:#f0f6fc;line-height:1.2;">You're invited! 🎉</p>
                  <p style="margin:0 0 28px;font-size:15px;color:#8b949e;line-height:1.5;">
                    <strong style="color:#c9d1d9;">${data.inviterName}</strong> has invited you to join their household on Musa.
                  </p>

                  <!-- Household card -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d1117;border-radius:10px;border:1px solid #30363d;margin-bottom:28px;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Household</p>
                        <p style="margin:0;font-size:20px;font-weight:600;color:#f0f6fc;">${data.householdName}</p>
                        <p style="margin:6px 0 0;font-size:13px;color:#8b949e;">Invited by ${data.inviterName}</p>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA button -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                    <tr>
                      <td align="center">
                        <a href="${data.acceptUrl}"
                           style="display:inline-block;background-color:#DAA520;color:#0d1117;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                          Accept Invitation
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1c2128;border-radius:8px;border:1px solid #fbbf2430;margin-bottom:20px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <p style="margin:0;font-size:13px;color:#d29922;line-height:1.5;">
                          ⏳ <strong>This invitation expires in 7 days.</strong> If you weren't expecting this, you can safely ignore it.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:13px;color:#8b949e;line-height:1.5;">
                    Having trouble with the button? Copy this link into your browser:<br>
                    <a href="${data.acceptUrl}" style="color:#DAA520;word-break:break-all;">${data.acceptUrl}</a>
                  </p>
                </td>
              </tr>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#484f58;">Sent by Musa Security &bull; <a href="https://musa-security.com" style="color:#6b7280;text-decoration:none;">musa-security.com</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate HTML template for approval notification
 */
function generateApprovalNotificationHTML(data: ApprovalNotificationData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Approved - Musa Security</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 100px;
            height: 100px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }
        .title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 10px 0;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin: 0;
        }
        .content {
            margin: 30px 0;
        }
        .approval-card {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .approval-card h2 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 700;
        }
        .approval-card p {
            margin: 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .role-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            margin: 10px 0;
            text-transform: capitalize;
        }
        .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .cta-button:hover {
            background: #2563eb;
        }
        .features {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .features h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 18px;
        }
        .features ul {
            margin: 0;
            padding-left: 20px;
        }
        .features li {
            margin: 8px 0;
            color: #4b5563;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <!-- Musa Character SVG -->
                <svg width="70" height="70" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <!-- Face -->
                  <circle cx="50" cy="45" r="25" fill="#d4a574"/>
                  <!-- Mustache -->
                  <path d="M 30 45 Q 50 55 70 45" stroke="#8b4513" stroke-width="2" fill="none"/>
                  <!-- Eyes -->
                  <circle cx="42" cy="42" r="2" fill="#333"/>
                  <circle cx="58" cy="42" r="2" fill="#333"/>
                  <!-- Golden Cap -->
                  <path d="M 25 25 L 75 25 L 65 10 L 35 10 Z" fill="#fbbf24"/>
                  <circle cx="50" cy="10" r="3" fill="#f59e0b"/>
                  <!-- Body -->
                  <rect x="35" y="65" width="30" height="25" fill="#8b4513" rx="2"/>
                </svg>
            </div>
            <h1 class="title">🎉 Account Approved!</h1>
            <p class="subtitle">Welcome to Musa Security</p>
        </div>

        <div class="content">
            <p>Hello ${data.userName}!</p>
            
            <div class="approval-card">
                <h2>✅ Your account has been approved!</h2>
                <p>You can now access all Musa Security features</p>
                <div class="role-badge">${data.userRole}</div>
            </div>

            <p>Great news! Your Musa Security account has been reviewed and approved by <strong>${data.approvedBy}</strong>. You now have full access to the estate security system.</p>

            <div style="text-align: center;">
                <a href="${data.loginUrl}" class="cta-button">Login to Your Account</a>
            </div>

            <div class="features">
                <h3>What you can do now:</h3>
                <ul>
                    ${data.userRole === 'resident' ? `
                    <li>Generate secure access codes for estate entry</li>
                    <li>Manage your household members</li>
                    <li>View access history and activity</li>
                    <li>Invite family members to your household</li>
                    ` : `
                    <li>Verify access codes at estate gates</li>
                    <li>View verification history and statistics</li>
                    <li>Monitor estate security activity</li>
                    <li>Generate security reports</li>
                    `}
                </ul>
            </div>

            <p>If you have any questions about using the system, please don't hesitate to contact estate management or check our help documentation.</p>
        </div>

        <div class="footer">
            <p>This email was sent by Musa Security System</p>
            <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">${data.loginUrl}</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Send rejection notification email via Resend
 */
export const sendRejectionNotificationEmail = async (data: RejectionNotificationData): Promise<boolean> => {
  try {
    const emailHtml = generateRejectionNotificationHTML(data);
    
    const emailData: EmailData = {
      to: data.userEmail,
      subject: "Important Information About Your Musa Account Application",
      html: emailHtml,
    };

    const response = await fetchWithAuth('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ emailData }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Email API responded with status: ${response.status} - ${errorBody?.error || 'Unknown'}`);
    }

    const result = await response.json();
    console.log('✅ Rejection notification email sent successfully:', result);
    return true;

  } catch (error) {
    console.error('❌ Error sending rejection notification email:', error);
    return false;
  }
};

/**
 * Generate HTML template for rejection notification
 */
export function generateRejectionNotificationHTML(data: RejectionNotificationData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Status - Musa Security</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 100px;
            height: 100px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #fef3c7, #fbbf24);
            border-radius: 50%;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .title {
            color: #1f2937;
            font-size: 28px;
            font-weight: 700;
            margin: 10px 0;
        }
        .subtitle {
            color: #6b7280;
            font-size: 18px;
        }
        .content {
            margin: 30px 0;
        }
        .rejection-card {
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            text-align: center;
        }
        .rejection-card h2 {
            color: #b91c1c;
            margin-top: 0;
        }
        .rejection-card p {
            color: #991b1b;
            margin-bottom: 0;
        }
        .role-badge {
            display: inline-block;
            padding: 5px 10px;
            background-color: #f3f4f6;
            color: #4b5563;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
        }
        .reason-section {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #d1d5db;
        }
        .support-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <!-- Updated Musa Character - Email Compatible Version -->
    <!-- Email-friendly Musa Mascot -->
    <table cellpadding="0" cellspacing="0" border="0" align="center" width="100px" style="margin: 0 auto;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="#DAA520" style="background-color: #DAA520; width: 90px; height: 90px; border-radius: 45px; border: 4px solid #FFD700; text-align: center; vertical-align: middle;">
                <span style="font-size: 45px; line-height: 90px;">🏠</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  
            </div>
            <h1 class="title">Application Status Update</h1>
            <p class="subtitle">Musa Security Account Information</p>
        </div>

        <div class="content">
            <p>Hello ${data.userName},</p>
            
            <div class="rejection-card">
                <h2>Your application requires additional information</h2>
                <p>We are unable to approve your account at this time</p>
                <div class="role-badge">${data.userRole}</div>
            </div>

            <p>Thank you for your interest in using the Musa Security platform. After reviewing your application, our team is unable to approve your account request at this time.</p>

            <div class="reason-section">
                <strong>Reason for decision:</strong>
                <p>${data.reason || 'Your information could not be verified'}</p>
            </div>

            <div class="support-section">
                <p>If you believe this decision was made in error or would like to provide additional information, please contact our support team at ${data.supportEmail || 'support@musa-security.com'}.</p>
                <p>You can also submit a new application with updated information if you'd like to try again.</p>
            </div>

            <p>The Musa Security Team</p>
        </div>

        <div class="footer">
            <p>This email was sent by Musa Security System</p>
            <p>© ${new Date().getFullYear()} Musa Security. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Send welcome/registration confirmation email via Resend
 */
interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  userRole: string;
}

export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<boolean> => {
  try {
    const emailHtml = generateWelcomeEmailHTML(data);
    
    const emailData: EmailData = {
      to: data.userEmail,
      subject: "Welcome to Musa Security! 🏠",
      html: emailHtml,
    };

    const response = await fetchWithAuth('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ emailData }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Email API responded with status: ${response.status} - ${errorBody?.error || 'Unknown'}`);
    }

    const result = await response.json();
    console.log('✅ Welcome email sent successfully:', result);
    return true;

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};

/**
 * Generate HTML template for welcome/registration confirmation
 */
export function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  const roleLabel = data.userRole === 'guard' ? 'Security Guard' : 'Resident';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Musa Security</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
    <!-- Musa Character SVG -->
    <div style="width: 100px; height: 100px; margin: 0 auto 20px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <svg width="70" height="70" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <!-- Face -->
        <circle cx="50" cy="45" r="25" fill="#d4a574"/>
        <!-- Mustache -->
        <path d="M 30 45 Q 50 55 70 45" stroke="#8b4513" stroke-width="2" fill="none"/>
        <!-- Eyes -->
        <circle cx="42" cy="42" r="2" fill="#333"/>
        <circle cx="58" cy="42" r="2" fill="#333"/>
        <!-- Golden Cap -->
        <path d="M 25 25 L 75 25 L 65 10 L 35 10 Z" fill="#fbbf24"/>
        <circle cx="50" cy="10" r="3" fill="#f59e0b"/>
        <!-- Body -->
        <rect x="35" y="65" width="30" height="25" fill="#8b4513" rx="2"/>
      </svg>
    </div>
    <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 700;">Welcome to Musa Security!</h1>
    <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin-top: 8px;">Your trusted estate security guardian</p>
  </div>

  <div style="background: white; border-radius: 0 0 16px 16px; padding: 32px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <p style="font-size: 16px; margin-top: 0;">Hello <strong>${data.userName}</strong>,</p>
    <p>Thank you for registering on <strong>Musa Security</strong> as a <strong>${roleLabel}</strong>! We're excited to have you on board.</p>

    <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">⏳ What happens next?</p>
      <p style="margin: 8px 0 0; color: #78350f; font-size: 14px;">
        Your account is now <strong>pending approval</strong> by your estate administrator. You'll receive another email once your account has been reviewed and approved.
      </p>
    </div>

    <div style="background: #f0f9ff; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: #1e40af;">📋 Your Details</p>
      <table style="width: 100%; margin-top: 10px; font-size: 14px;">
        <tr><td style="color: #6b7280; padding: 4px 0;">Name:</td><td style="font-weight: 500;">${data.userName}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Email:</td><td style="font-weight: 500;">${data.userEmail}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Role:</td><td style="font-weight: 500;">${roleLabel}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">Status:</td><td><span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">Pending Approval</span></td></tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #6b7280;">If you did not create this account, please ignore this email.</p>

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; background: #fef3c7; padding: 16px; margin: 32px -30px -30px -30px; border-radius: 0 0 16px 16px;">
      <p style="margin: 0; color: #92400e; font-size: 12px; font-weight: 600;">🛡️ Musa Security - Your Estate Guardian</p>
      <p style="margin: 4px 0 0; color: #78350f; font-size: 12px;">&copy; ${new Date().getFullYear()} Musa Security. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    const testData: HouseholdInviteData = {
      householdName: "Test Household",
      inviterName: "Test User",
      acceptUrl: "https://musa-security.com/invite/test",
      recipientEmail: "toyosiajibola@musa-security.com" // Send to yourself for testing
    };

    return await sendHouseholdInvitationEmail(testData);
  } catch (error) {
    console.error('Email test failed:', error);
    return false;
  }
};
