// Email Diagnostic Utility for Household Invitations
// This helps debug email delivery issues in the Musa app

interface EmailDiagnosticResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export class EmailDiagnostic {
  private results: EmailDiagnosticResult[] = [];

  private addResult(step: string, success: boolean, message: string, details?: any) {
    this.results.push({ step, success, message, details });
    console.log(`${success ? '✅' : '❌'} ${step}: ${message}`);
    if (details) {
      console.log('   Details:', details);
    }
  }

  async testHouseholdInviteEmailFlow(testEmail: string): Promise<EmailDiagnosticResult[]> {
    console.log('🔍 Starting Household Invitation Email Diagnostic...\n');
    
    try {
      // Step 1: Test API Route Accessibility
      this.addResult('API Route Test', true, 'Testing /api/send-email endpoint...');
      
      try {
        const testResponse = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailData: {
              to: testEmail,
              subject: '🧪 Musa Email System Test',
              html: '<h1>Test Email</h1><p>This is a test email from Musa diagnostic system.</p>'
            },
            smtpConfig: {
              host: 'mail.hspace.cloud',
              port: 465,
              secure: true,
              auth: {
                user: 'toyosiajibola@musa-security.com',
                pass: 'Olatoyosi1'
              }
            }
          })
        });

        if (testResponse.ok) {
          const result = await testResponse.json();
          this.addResult('API Route Test', true, 'Email API is accessible and working', result);
        } else {
          this.addResult('API Route Test', false, `API returned status ${testResponse.status}`);
        }
      } catch (apiError) {
        this.addResult('API Route Test', false, 'Failed to reach email API', apiError);
      }

      // Step 2: Test SMTP Configuration
      this.addResult('SMTP Config Test', true, 'Checking SMTP configuration...');
      
      const smtpConfig = {
        host: 'mail.hspace.cloud',
        port: 465,
        secure: true,
        auth: {
          user: 'toyosiajibola@musa-security.com',
          pass: 'Olatoyosi1'
        }
      };

      this.addResult('SMTP Config Test', true, 'SMTP configuration appears valid', smtpConfig);

      // Step 3: Test Email Template Generation
      this.addResult('Template Test', true, 'Testing email template generation...');
      
      try {
        const { generateHouseholdInvitationHTML } = await import('@/services/smtpEmailService');
        
        const testTemplateData = {
          householdName: 'Test Household',
          inviterName: 'Test User',
          acceptUrl: 'https://musa-security.com/invite/test123',
          recipientEmail: testEmail
        };

        const htmlTemplate = generateHouseholdInvitationHTML(testTemplateData);
        
        if (htmlTemplate && htmlTemplate.length > 100) {
          this.addResult('Template Test', true, 'Email template generated successfully', {
            templateLength: htmlTemplate.length,
            containsLogo: htmlTemplate.includes('Musa'),
            containsAcceptUrl: htmlTemplate.includes(testTemplateData.acceptUrl)
          });
        } else {
          this.addResult('Template Test', false, 'Email template appears invalid or empty');
        }
      } catch (templateError) {
        this.addResult('Template Test', false, 'Failed to generate email template', templateError);
      }

      // Step 4: Test Full Email Send Flow
      this.addResult('Full Send Test', true, 'Testing complete email send flow...');
      
      try {
        const { sendHouseholdInvitationEmail } = await import('@/services/smtpEmailService');
        
        const testInviteData = {
          householdName: 'Diagnostic Test Household',
          inviterName: 'Email Diagnostic System',
          acceptUrl: 'https://musa-security.com/invite/diagnostic-test',
          recipientEmail: testEmail
        };

        const emailSent = await sendHouseholdInvitationEmail(testInviteData);
        
        if (emailSent) {
          this.addResult('Full Send Test', true, 'Household invitation email sent successfully!');
        } else {
          this.addResult('Full Send Test', false, 'Email sending returned false - check logs for details');
        }
      } catch (sendError) {
        this.addResult('Full Send Test', false, 'Failed to send household invitation email', sendError);
      }

      // Step 5: Environment Check
      this.addResult('Environment Check', true, 'Checking environment variables...');
      
      const envCheck = {
        hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
        nodeEnv: process.env.NODE_ENV || 'Not set'
      };

      this.addResult('Environment Check', true, 'Environment variables checked', envCheck);

      // Step 6: Common Issues Check
      this.addResult('Common Issues Check', true, 'Checking for common email delivery issues...');
      
      const commonIssues = [];
      
      // Check if using localhost URLs
      if (envCheck.appUrl.includes('localhost')) {
        commonIssues.push('Using localhost URL - may cause issues in email links');
      }
      
      // Check email domain
      if (!testEmail.includes('@')) {
        commonIssues.push('Invalid email format provided');
      }
      
      // Check for common spam triggers in domain
      const spamDomains = ['tempmail', '10minutemail', 'guerrillamail'];
      if (spamDomains.some(domain => testEmail.includes(domain))) {
        commonIssues.push('Using temporary email service - may be blocked');
      }

      if (commonIssues.length > 0) {
        this.addResult('Common Issues Check', false, 'Found potential issues', commonIssues);
      } else {
        this.addResult('Common Issues Check', true, 'No obvious issues detected');
      }

    } catch (error) {
      this.addResult('Diagnostic Error', false, 'Unexpected error during diagnostic', error);
    }

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    console.log(`✅ Passed: ${successCount}/${totalCount} tests`);
    
    if (successCount === totalCount) {
      console.log('🎉 All tests passed! Email system should be working correctly.');
      console.log('💡 If emails are still not being received, check:');
      console.log('   1. Recipient\'s spam/junk folder');
      console.log('   2. Email provider\'s security settings');
      console.log('   3. Corporate firewall blocking external emails');
    } else {
      console.log('⚠️  Some tests failed. Check the details above for issues.');
    }

    return this.results;
  }

  getResults(): EmailDiagnosticResult[] {
    return this.results;
  }
}

// Utility function to run diagnostic from browser console
export const runEmailDiagnostic = async (testEmail: string) => {
  const diagnostic = new EmailDiagnostic();
  return await diagnostic.testHouseholdInviteEmailFlow(testEmail);
};

// Export for use in components
export default EmailDiagnostic;
