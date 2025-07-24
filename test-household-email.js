// Test script for household email invitation system
// This will help diagnose email delivery issues

const nodemailer = require('nodemailer');

// SMTP Configuration (same as in the app)
const SMTP_CONFIG = {
  host: 'mail.hspace.cloud',
  port: 465,
  secure: true,
  auth: {
    user: 'toyosiajibola@musa-security.com',
    pass: 'Olatoyosi1'
  }
};

async function testEmailDelivery() {
  console.log('🔍 Testing Household Email Invitation System...\n');
  
  try {
    // Test 1: SMTP Connection
    console.log('1️⃣ Testing SMTP Connection...');
    const transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: SMTP_CONFIG.auth,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log('✅ SMTP Connection: SUCCESS\n');

    // Test 2: Send Test Email
    console.log('2️⃣ Sending Test Household Invitation Email...');
    
    const testEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Household Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="color: white; font-size: 32px; font-weight: bold;">M</span>
          </div>
          <h1 style="color: #1f2937; margin: 0;">Musa Security</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">🏠 Household Invitation Test</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            This is a test email to verify the household invitation system is working correctly.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            <strong>Test Details:</strong><br>
            • SMTP Server: mail.hspace.cloud<br>
            • Port: 465 (SSL)<br>
            • From: toyosiajibola@musa-security.com<br>
            • Timestamp: ${new Date().toISOString()}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            This is a test email from the Musa Security App
          </p>
        </div>
      </body>
      </html>
    `;

    const testEmail = {
      from: `"Musa Security Test" <${SMTP_CONFIG.auth.user}>`,
      to: 'toyosiajibola@musa-security.com', // Send to yourself first
      subject: '🧪 Test: Household Invitation System',
      html: testEmailHTML
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test Email Sent Successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📤 Response:', info.response);
    console.log('📬 Recipient:', testEmail.to);
    console.log('📝 Subject:', testEmail.subject);
    
    // Test 3: Check for common delivery issues
    console.log('\n3️⃣ Checking for Common Email Delivery Issues...');
    
    // Check if email contains spam triggers
    const spamTriggers = [
      'free', 'urgent', 'act now', 'limited time', 'click here',
      'guaranteed', 'no obligation', 'risk free'
    ];
    
    const hasSpamTriggers = spamTriggers.some(trigger => 
      testEmailHTML.toLowerCase().includes(trigger.toLowerCase())
    );
    
    if (hasSpamTriggers) {
      console.log('⚠️  Warning: Email content may contain spam triggers');
    } else {
      console.log('✅ Email content: No obvious spam triggers detected');
    }
    
    // Check email size
    const emailSize = Buffer.byteLength(testEmailHTML, 'utf8');
    console.log(`📏 Email size: ${emailSize} bytes`);
    
    if (emailSize > 102400) { // 100KB
      console.log('⚠️  Warning: Email is quite large (>100KB)');
    } else {
      console.log('✅ Email size: Within normal limits');
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('1. Check the recipient\'s spam/junk folder');
    console.log('2. Verify the recipient email address is correct');
    console.log('3. Ask recipient to whitelist toyosiajibola@musa-security.com');
    console.log('4. Consider adding SPF/DKIM/DMARC records for better deliverability');
    console.log('5. Test with different email providers (Gmail, Outlook, Yahoo)');
    
  } catch (error) {
    console.error('❌ Email Test Failed:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔐 Authentication Error - Check SMTP credentials');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🌐 Connection Error - Check SMTP server and port');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n⏰ Timeout Error - SMTP server may be slow or unreachable');
    }
  }
}

// Run the test
testEmailDelivery().then(() => {
  console.log('\n✨ Email test completed!');
}).catch(error => {
  console.error('💥 Test script error:', error);
});
