import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions
type HandlebarsTemplateDelegate = handlebars.TemplateDelegate;

// Initialize Firebase Admin
admin.initializeApp();

// SMTP Configuration for mail.hspace.cloud
const SMTP_CONFIG = {
  host: 'mail.hspace.cloud',
  port: 465, // SSL
  secure: true, // true for 465, false for other ports
  auth: {
    user: functions.config().smtp?.user || 'toyosiajibola@musa-security.com',
    pass: functions.config().smtp?.password || 'Olatoyosi1'
  }
};

// Create nodemailer transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Email templates
const EMAIL_TEMPLATES = {
  ACCOUNT_APPROVED: 'account_approved',
  ACCOUNT_REJECTED: 'account_rejected',
};

// Template cache
const templates: Record<string, HandlebarsTemplateDelegate> = {};

/**
 * Load and compile an email template
 */
function getTemplate(templateName: string): HandlebarsTemplateDelegate {
  if (templates[templateName]) {
    return templates[templateName];
  }

  try {
    const templatePath = path.join(__dirname, `../templates/${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    templates[templateName] = template;
    return template;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error(`Template ${templateName} not found`);
  }
}

/**
 * Send an email using SMTP (mail.hspace.cloud)
 */
export const sendEmail = functions.https.onCall(async (data: any, context: any) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  try {
    const { template, recipient, data: templateData } = data;
    
    // Validate inputs
    if (!template || !recipient) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with template and recipient arguments.'
      );
    }

    // Get the correct template
    let subject: string;
    let templateFn: HandlebarsTemplateDelegate;
    
    switch (template) {
      case EMAIL_TEMPLATES.ACCOUNT_APPROVED:
        templateFn = getTemplate('account_approved');
        subject = 'Your Musa Account Has Been Approved';
        break;
      case EMAIL_TEMPLATES.ACCOUNT_REJECTED:
        templateFn = getTemplate('account_rejected');
        subject = 'Regarding Your Musa Account Application';
        break;
      case 'household_invitation':
        templateFn = getTemplate('household_invitation');
        subject = 'You\'ve been invited to join a household on Musa';
        break;
      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid template: ${template}`
        );
    }

    // Create email content
    const html = templateFn(templateData);
    
    // Set up email message for SMTP
    const mailOptions = {
      from: `"Musa Security" <${SMTP_CONFIG.auth.user}>`,
      to: recipient,
      subject: subject,
      html: html,
    };
    
    // Send email using SMTP
    await transporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully to ${recipient}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send email',
      error
    );
  }
});

/**
 * Automatically send email when a user's status changes
 * This is triggered by database changes
 */
export const onUserStatusChange = functions.database
  .ref('/users/{userId}/status')
  .onUpdate(async (change: any, context: any) => {
    const userId = context.params.userId;
    const newStatus = change.after.val();
    const previousStatus = change.before.val();
    
    // Only proceed if status changed to approved or rejected
    if (newStatus === previousStatus ||
       (newStatus !== 'approved' && newStatus !== 'rejected')) {
      return null;
    }
    
    try {
      // Get user data
      const userSnapshot = await admin.database().ref(`/users/${userId}`).once('value');
      const userData = userSnapshot.val();
      
      if (!userData || !userData.email) {
        console.error('User data or email not found');
        return null;
      }
      
      // SMTP is already configured globally
      
      let subject: string;
      let templateName: string;
      let templateData: any;
      
      if (newStatus === 'approved') {
        // User was approved
        templateName = 'account_approved';
        subject = 'Your Musa Account Has Been Approved';
        templateData = {
          displayName: userData.displayName || 'Resident',
          role: userData.role,
          approvedAt: userData.approvedAt ? new Date(userData.approvedAt).toLocaleString() : new Date().toLocaleString(),
        };
      } else {
        // User was rejected
        templateName = 'account_rejected';
        subject = 'Regarding Your Musa Account Application';
        templateData = {
          displayName: userData.displayName || 'Resident',
          reason: userData.rejectionReason || 'No reason provided',
          contactEmail: 'support@yourestate.com', // Replace with your actual support email
        };
      }
      
      // Get template
      const templateFn = getTemplate(templateName);
      
      // Create email content
      const html = templateFn(templateData);
      
      // Set up email message for SMTP
      const mailOptions = {
        from: `"Musa Security" <${SMTP_CONFIG.auth.user}>`,
        to: userData.email,
        subject: subject,
        html: html,
      };
      
      // Send email using SMTP
      await transporter.sendMail(mailOptions);
      console.log(`Status change email sent to ${userData.email}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending status change email:', error);
      return null;
    }
  });
