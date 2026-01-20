import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createDeviceApprovalToken } from '@/services/deviceService';
import {
  generateDeviceApprovalEmail,
  generateDeviceApprovalEmailPlainText,
  DeviceApprovalEmailProps,
} from '@/emails/deviceApprovalEmail';

const SMTP_HOST = 'mail.hspace.cloud';
const SMTP_PORT = 465;
const SMTP_USER = 'toyosiajibola@musa-security.com';
const SMTP_PASS = 'Olatoyosi1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, userId, userEmail, userName, deviceInfo } = body;

    if (!deviceId || !userId || !userEmail) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create approval token
    const token = await createDeviceApprovalToken(deviceId, userId);

    // Generate approval link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const approvalLink = `${baseUrl}/api/device/approve?token=${token}`;

    // Prepare email props
    const emailProps: DeviceApprovalEmailProps = {
      userName: userName || userEmail.split('@')[0],
      userEmail,
      deviceInfo: {
        platform: deviceInfo.platform || 'Unknown',
        userAgent: deviceInfo.userAgent || 'Unknown Browser',
        ipAddress: deviceInfo.ipAddress,
        timestamp: new Date(deviceInfo.timestamp || Date.now()).toLocaleString(),
      },
      approvalLink,
    };

    // Generate email content
    const htmlContent = generateDeviceApprovalEmail(emailProps);
    const textContent = generateDeviceApprovalEmailPlainText(emailProps);

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"Musa Security" <${SMTP_USER}>`,
      to: userEmail,
      subject: '🔐 Device Authorization Required - Musa Security',
      text: textContent,
      html: htmlContent,
    });

    return NextResponse.json({
      success: true,
      message: 'Device approval email sent successfully',
    });
  } catch (error) {
    console.error('Error sending device approval email:', error);
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to send device approval email' },
      { status: 500 }
    );
  }
}
