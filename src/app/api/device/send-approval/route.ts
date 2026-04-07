import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createDeviceApprovalToken } from '@/services/deviceService';
import {
  generateDeviceApprovalEmail,
  generateDeviceApprovalEmailPlainText,
  DeviceApprovalEmailProps,
} from '@/emails/deviceApprovalEmail';

// Lazy-initialize Resend
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Musa Security <noreply@musa-security.com>';

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://musa-security.com';
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

    // Send email via Resend
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: '🔐 Device Authorization Required - Musa Security',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to send device approval email' },
        { status: 500 }
      );
    }

    console.log('Device approval email sent via Resend:', data?.id);

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
