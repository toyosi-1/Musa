import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

    // Create nodemailer transporter with SMTP configuration
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass
      },
      // Additional options for better deliverability
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    console.log('📧 Sending email via SMTP:');
    console.log('To:', emailData.to);
    console.log('From:', emailData.from);
    console.log('Subject:', emailData.subject);
    console.log('SMTP Host:', smtpConfig.host);
    console.log('SMTP Port:', smtpConfig.port);
    console.log('SMTP User:', smtpConfig.auth.user);

    // Send the email
    const info = await transporter.sendMail({
      from: emailData.from || `"Musa Security" <${smtpConfig.auth.user}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html
    });

    console.log('✅ Email sent successfully:', info.messageId);
    
    const emailResult = {
      success: true,
      messageId: info.messageId,
      to: emailData.to,
      subject: emailData.subject,
      timestamp: new Date().toISOString(),
      response: info.response
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
