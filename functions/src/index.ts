import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid with API key from environment
const SENDGRID_API_KEY = functions.config().sendgrid?.key;

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
 * Send an email using SendGrid
 */
export const sendEmail = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  try {
    // Set SendGrid API key
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is not configured');
    }
    sgMail.setApiKey(SENDGRID_API_KEY);

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
      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid template: ${template}`
        );
    }

    // Create email content
    const html = templateFn(templateData);
    
    // Set up email message
    const msg = {
      to: recipient,
      from: 'noreply@yourestate.com', // Replace with your verified sender
      subject: subject,
      html: html,
    };
    
    // Send email
    await sgMail.send(msg);
    
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
  .onUpdate(async (change, context) => {
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
      
      // Set SendGrid API key
      if (!SENDGRID_API_KEY) {
        console.error('SendGrid API key is not configured');
        return null;
      }
      sgMail.setApiKey(SENDGRID_API_KEY);
      
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
      
      // Set up email message
      const msg = {
        to: userData.email,
        from: 'noreply@yourestate.com', // Replace with your verified sender
        subject: subject,
        html: html,
      };
      
      // Send email
      await sgMail.send(msg);
      console.log(`Status change email sent to ${userData.email}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending status change email:', error);
      return null;
    }
  });
