import { NextRequest, NextResponse } from 'next/server';

// This API route handles email sending using SMTP
// It's a server-side route that can safely use SMTP credentials

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { emailData, smtpConfig }: { emailData: EmailData; smtpConfig: SMTPConfig } = await request.json();

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      );
    }

    // In a production environment, you would use a proper email service here
    // For now, we'll simulate the email sending and log the details
    
    console.log('📧 Email would be sent with the following details:');
    console.log('To:', emailData.to);
    console.log('From:', emailData.from);
    console.log('Subject:', emailData.subject);
    console.log('SMTP Host:', smtpConfig.host);
    console.log('SMTP Port:', smtpConfig.port);
    console.log('SMTP User:', smtpConfig.auth.user);
    
    // For production, you would implement actual SMTP sending here
    // using nodemailer or similar library in a server environment
    
    // Simulate successful email sending
    const emailResult = {
      success: true,
      messageId: `msg_${Date.now()}`,
      to: emailData.to,
      subject: emailData.subject,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(emailResult);

  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
