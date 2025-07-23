// Direct SMTP Email Service for Musa App
// This bypasses Firebase Functions and sends emails directly

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

// SMTP Configuration for mail.hspace.cloud
const SMTP_CONFIG = {
  host: 'mail.hspace.cloud',
  port: 465,
  secure: true,
  auth: {
    user: 'toyosiajibola@musa-security.com',
    pass: 'Olatoyosi1'
  }
};

/**
 * Send household invitation email using direct SMTP
 */
export const sendHouseholdInvitationEmail = async (data: HouseholdInviteData): Promise<boolean> => {
  try {
    const emailHtml = generateHouseholdInvitationHTML(data);
    
    const emailData: EmailData = {
      to: data.recipientEmail,
      subject: "You've been invited to join a household on Musa",
      html: emailHtml,
      from: `"Musa Security" <${SMTP_CONFIG.auth.user}>`
    };

    // Send via API route (we'll create this)
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailData,
        smtpConfig: SMTP_CONFIG
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API responded with status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Household invitation email sent successfully:', result);
    return true;

  } catch (error) {
    console.error('Error sending household invitation email:', error);
    return false;
  }
};

/**
 * Generate HTML template for household invitation
 */
function generateHouseholdInvitationHTML(data: HouseholdInviteData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Household Invitation - Musa Security</title>
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
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 16px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            position: relative;
        }
        .logo::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
        }
        .logo-text {
            position: relative;
            z-index: 1;
            font-family: 'Arial Black', Arial, sans-serif;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .title {
            color: #1f2937;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
        }
        .subtitle {
            color: #6b7280;
            font-size: 16px;
            margin: 8px 0 0;
        }
        .content {
            margin: 30px 0;
        }
        .invitation-card {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .household-name {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .inviter-name {
            color: #6b7280;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-1px);
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .security-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <span class="logo-text">MUSA</span>
            </div>
            <h1 class="title">You're Invited!</h1>
            <p class="subtitle">Join a household on Musa Security</p>
        </div>

        <div class="content">
            <p>Hello!</p>
            
            <p>You've been invited to join a household on Musa, the secure estate access control system.</p>

            <div class="invitation-card">
                <div class="household-name">${data.householdName}</div>
                <div class="inviter-name">Invited by: ${data.inviterName}</div>
            </div>

            <p>By joining this household, you'll be able to:</p>
            <ul>
                <li>Generate secure access codes for estate entry</li>
                <li>Manage your household members</li>
                <li>View access history and activity</li>
                <li>Communicate with estate security</li>
            </ul>

            <div style="text-align: center;">
                <a href="${data.acceptUrl}" class="cta-button">Accept Invitation</a>
            </div>

            <div class="security-note">
                <strong>Security Note:</strong> This invitation will expire in 7 days. If you didn't expect this invitation, please ignore this email.
            </div>

            <p>If you have any questions, please contact the person who invited you or reach out to estate management.</p>
        </div>

        <div class="footer">
            <p>This email was sent by Musa Security System</p>
            <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">${data.acceptUrl}</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Test email configuration
 */
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
