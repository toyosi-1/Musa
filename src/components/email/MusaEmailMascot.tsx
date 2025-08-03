/**
 * Email-friendly Musa mascot component
 * This provides a reusable, email-client compatible version of the Musa mascot
 * Uses the actual Musa character illustration embedded directly in emails
 */

// URLs for the Musa mascot images (SVG preferred, PNG as fallback)
const MUSA_SVG_URL = 'https://musa-security-app.windsurf.build/images/musa-icon.svg';
const MUSA_PNG_URL = 'https://musa-security-app.windsurf.build/new-musa-logo.png';

export function getMusaEmailMascotHTML(): string {
  return `
    <!-- Email-friendly Musa Mascot -->
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
      <tr>
        <td align="center" style="padding: 10px;">
          <!--[if mso]>
            <img 
              src="${MUSA_PNG_URL}" 
              width="120" 
              height="120" 
              alt="Musa Character" 
              style="border: 0; display: block; max-width: 100%;" 
            />
          <![endif]-->
          <!--[if !mso]><!-->
            <img 
              src="${MUSA_SVG_URL}" 
              width="120" 
              height="120" 
              alt="Musa Character" 
              style="border: 0; display: block; max-width: 100%;" 
            />
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

/**
 * Creates a simple HTML test page that shows how the mascot would look in emails
 */
export function getMusaEmailMascotTestHTML(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Musa Email Mascot</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          background-color: #f8f8f8;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dark-mode-preview {
          background-color: #333;
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Email-Friendly Musa Mascot</h1>
      <p>This is how the Musa mascot will appear in email clients:</p>
      
      <div class="container">
        <h2>Light Mode</h2>
        ${getMusaEmailMascotHTML()}
      </div>
      
      <div class="container dark-mode-preview">
        <h2>Dark Mode Preview</h2>
        ${getMusaEmailMascotHTML()}
      </div>
      
      <h2>Implementation Notes:</h2>
      <ul>
        <li>Uses the SVG Musa character for modern email clients</li>
        <li>Falls back to PNG for Outlook and other legacy clients</li>
        <li>Shows the actual Musa character illustration</li>
        <li>Compatible with all email clients including Outlook</li>
      </ul>
      
      <h2>How to Use:</h2>
      <p>1. Import the component: <code>import { getMusaEmailMascotHTML } from '@/components/email/MusaEmailMascot';</code></p>
      <p>2. Include it in your email templates: <code>${'{getMusaEmailMascotHTML()}'}</code></p>
    </body>
    </html>
  `;
}
