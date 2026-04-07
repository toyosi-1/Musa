// Professional Email Service using SendGrid
// This provides reliable email delivery with proper authentication

import sgMail from '@sendgrid/mail';

interface HouseholdInviteData {
  householdName: string;
  inviterName: string;
  acceptUrl: string;
  recipientEmail: string;
}

// Initialize SendGrid with API key
const initializeSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SendGrid API key not found. Email sending will be disabled.');
    return false;
  }
  sgMail.setApiKey(apiKey);
  return true;
};

/**
 * Generate HTML email template for household invitations
 */
const generateHouseholdInvitationHTML = (data: HouseholdInviteData): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Household Invitation - Musa Security</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center; }
        .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .header-text { color: #e0e7ff; font-size: 16px; }
        .content { padding: 40px 30px; }
        .invitation-card { background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .btn { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
        .btn-secondary { background: #6b7280; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        .security-note { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
        @media (max-width: 600px) { .content { padding: 20px; } .btn { display: block; margin: 10px 0; text-align: center; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏠 Musa Security</div>
            <div class="header-text">Estate Access Control System</div>
        </div>
        
        <div class="content">
            <h1 style="color: #1e293b; margin-bottom: 20px;">You're Invited!</h1>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has invited you to join their household on Musa Security.
            </p>
            
            <div class="invitation-card">
                <h2 style="color: #3b82f6; margin-top: 0;">Household: ${data.householdName}</h2>
                <p style="color: #64748b; margin-bottom: 0;">
                    Join this household to access secure entry codes and communicate with other members.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.acceptUrl}" class="btn">Accept Invitation</a>
                <a href="${data.acceptUrl}" class="btn btn-secondary">View Details</a>
            </div>
            
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This invitation is specifically for ${data.recipientEmail}. 
                Make sure you're signed in with the correct account when accepting.
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
                If you don't want to join this household, you can safely ignore this email or decline the invitation.
                This invitation will expire automatically after 7 days.
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Musa Security</strong> - Estate Access Control System</p>
            <p>This email was sent to ${data.recipientEmail}</p>
            <p style="margin-top: 20px;">
                <a href="https://musa-security.com" style="color: #3b82f6;">Visit Musa Security</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Send household invitation email using SendGrid
 */
export const sendHouseholdInvitationEmail = async (data: HouseholdInviteData): Promise<boolean> => {
  try {
    // Initialize SendGrid
    if (!initializeSendGrid()) {
      console.error('SendGrid not initialized. Falling back to SMTP.');
      return false;
    }

    const emailHtml = generateHouseholdInvitationHTML(data);
    
    const msg = {
      to: data.recipientEmail,
      from: {
        email: 'noreply@musa-security.com',
        name: 'Musa Security'
      },
      subject: `You've been invited to join ${data.householdName} on Musa`,
      html: emailHtml,
      text: `You've been invited to join ${data.householdName} by ${data.inviterName}. Visit ${data.acceptUrl} to accept the invitation.`,
      // Add tracking and categories
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      categories: ['household-invitation']
    };

    console.log('📧 Sending email via SendGrid to:', data.recipientEmail);
    
    const response = await sgMail.send(msg);
    
    console.log('✅ Email sent successfully via SendGrid:', response[0].statusCode);
    
    return true;
    
  } catch (error) {
    console.error('❌ SendGrid email failed:', error);
    
    // Log detailed error information
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as any;
      console.error('SendGrid Error Details:', {
        statusCode: sgError.code,
        message: sgError.message,
        response: sgError.response?.body
      });
    }
    
    return false;
  }
};

/**
 * Test SendGrid email configuration
 */
export const testSendGridConfiguration = async (): Promise<boolean> => {
  try {
    const testData: HouseholdInviteData = {
      householdName: "Test Household",
      inviterName: "Test User",
      acceptUrl: "https://musa-security.com/invite/test",
      recipientEmail: "toyosiajibola@gmail.com" // Send to your Gmail for testing
    };

    return await sendHouseholdInvitationEmail(testData);
  } catch (error) {
    console.error('SendGrid test failed:', error);
    return false;
  }
};
