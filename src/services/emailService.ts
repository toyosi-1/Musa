import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { User, HouseholdInvite, Household } from '@/types/user';

// Email templates
const EMAIL_TEMPLATES = {
  ACCOUNT_APPROVED: 'account_approved',
  ACCOUNT_REJECTED: 'account_rejected',
  HOUSEHOLD_INVITATION: 'household_invitation',
};

// Initialize Firebase Functions
const getFirebaseFunctions = () => {
  try {
    const app = getApp();
    return getFunctions(app);
  } catch (error) {
    console.error('Error initializing Firebase Functions:', error);
    throw new Error('Failed to initialize email service');
  }
};

/**
 * Send email notification when a user account is approved
 * @param user The approved user
 */
export const sendApprovalEmail = async (user: User): Promise<void> => {
  try {
    const functions = getFirebaseFunctions();
    const sendEmail = httpsCallable(functions, 'sendEmail');
    
    await sendEmail({
      template: EMAIL_TEMPLATES.ACCOUNT_APPROVED,
      recipient: user.email,
      data: {
        displayName: user.displayName || 'Resident',
        role: user.role,
        approvedAt: user.approvedAt ? new Date(user.approvedAt).toLocaleString() : new Date().toLocaleString(),
      }
    });
    
    console.log(`Approval email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending approval email:', error);
    // Non-blocking error - we don't want to prevent approval if email fails
  }
};

/**
 * Send email notification when a user account is rejected
 * @param user The rejected user
 * @param reason The rejection reason
 */
export const sendRejectionEmail = async (user: User, reason: string): Promise<void> => {
  try {
    const functions = getFirebaseFunctions();
    const sendEmail = httpsCallable(functions, 'sendEmail');
    
    await sendEmail({
      template: EMAIL_TEMPLATES.ACCOUNT_REJECTED,
      recipient: user.email,
      data: {
        displayName: user.displayName || 'User',
        reason: reason,
        contactEmail: 'support@musa-app.com', // Replace with your actual support email
      }
    });
    
    console.log(`Rejection email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending rejection email:', error);
    // Non-blocking error - we don't want to prevent rejection if email fails
  }
};

/**
 * Send household invitation email
 * @param invite The household invitation
 * @param household The household details
 * @param inviterName The name of the person who sent the invitation
 */
export const sendHouseholdInvitationEmail = async (
  invite: HouseholdInvite, 
  household: Household, 
  inviterName: string
): Promise<void> => {
  try {
    const functions = getFirebaseFunctions();
    const sendEmail = httpsCallable(functions, 'sendEmail');
    
    // Create invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://musa-security-app.windsurf.build'}/invite/${invite.id}`;
    
    await sendEmail({
      template: EMAIL_TEMPLATES.HOUSEHOLD_INVITATION,
      recipient: invite.email,
      data: {
        inviterName: inviterName,
        householdName: household.name,
        householdAddress: household.address,
        invitationLink: invitationLink,
        expiresAt: new Date(invite.expiresAt).toLocaleDateString(),
        appName: 'Musa Security App'
      }
    });
    
    console.log(`Household invitation email sent to ${invite.email}`);
  } catch (error) {
    console.error('Error sending household invitation email:', error);
    // Non-blocking error - we don't want to prevent invitation creation if email fails
    throw error; // Re-throw to let caller know email failed
  }
};

/**
 * Send batch notification emails for approved users
 * @param users Array of approved users
 */
export const sendBatchApprovalEmails = async (users: User[]): Promise<void> => {
  const promises = users.map(user => sendApprovalEmail(user));
  await Promise.allSettled(promises);
  console.log(`Batch approval emails sent to ${users.length} users`);
};

/**
 * Send batch notification emails for rejected users
 * @param users Array of rejected users
 * @param reason The rejection reason
 */
export const sendBatchRejectionEmails = async (users: User[], reason: string): Promise<void> => {
  const promises = users.map(user => sendRejectionEmail(user, reason));
  await Promise.allSettled(promises);
  console.log(`Batch rejection emails sent to ${users.length} users`);
};

/**
 * Fallback email sending using a simple HTTP service (for development/testing)
 * This can be used when Firebase Functions are not available
 */
export const sendSimpleEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  try {
    // This is a fallback for development - in production, use Firebase Functions
    console.log('Sending email (fallback mode):', {
      to,
      subject,
      content: htmlContent.substring(0, 100) + '...'
    });
    
    // For now, just log the email content
    // In a real implementation, you would integrate with a service like SendGrid, Mailgun, etc.
    console.log('Email content:', htmlContent);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Fallback email sent to ${to}`);
  } catch (error) {
    console.error('Error sending fallback email:', error);
    throw error;
  }
};

/**
 * Send household invitation using fallback method (for development)
 */
export const sendHouseholdInvitationFallback = async (
  invite: HouseholdInvite,
  household: Household,
  inviterName: string
): Promise<void> => {
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://musa-security-app.windsurf.build'}/invite/${invite.id}`;
  
  const subject = `You're invited to join ${household.name} on Musa Security App`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Household Invitation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏠 Household Invitation</h1>
        </div>
        <div class="content">
          <h2>You're invited to join a household!</h2>
          <p>Hi there!</p>
          <p><strong>${inviterName}</strong> has invited you to join their household <strong>"${household.name}"</strong> on the Musa Security App.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3>Household Details:</h3>
            <p><strong>Name:</strong> ${household.name}</p>
            <p><strong>Address:</strong> ${household.address}</p>
            <p><strong>Invited by:</strong> ${inviterName}</p>
          </div>
          
          <p>To accept this invitation, click the button below:</p>
          <a href="${invitationLink}" class="button">Accept Invitation</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="background: #eee; padding: 10px; border-radius: 4px; word-break: break-all;">${invitationLink}</p>
          
          <p><strong>Important:</strong> This invitation will expire on ${new Date(invite.expiresAt).toLocaleDateString()}.</p>
          
          <p>If you don't have a Musa Security App account yet, you'll be prompted to create one when you click the invitation link.</p>
        </div>
        <div class="footer">
          <p>This invitation was sent by the Musa Security App</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendSimpleEmail(invite.email, subject, htmlContent);
};
