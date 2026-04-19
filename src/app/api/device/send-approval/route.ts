import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createDeviceApprovalToken } from '@/services/deviceService';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { requireAuth, AuthError } from '@/lib/requireAuth';
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
    // Auth first — a signed-in user may only request device-approval emails
    // for their OWN account. Without this, anyone could fire approval emails
    // at arbitrary users (inbox bombing / phishing dry-run).
    let authUser;
    try {
      authUser = await requireAuth(request);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }

    // Rate limit: 3 device-approval emails per 10 minutes per IP.
    const rl = rateLimit({
      key: `device-send-approval:${getClientIp(request)}`,
      limit: 3,
      windowMs: 10 * 60_000,
    });
    if (!rl.success) return rateLimitResponse(rl);

    const body = await request.json();
    const { deviceId, userId, userEmail, userName, deviceInfo } = body;

    if (!deviceId || !userId || !userEmail) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // The body-supplied userId/userEmail must match the verified token.
    if (userId !== authUser.uid) {
      return NextResponse.json(
        { success: false, message: 'You can only request approval for your own account.' },
        { status: 403 }
      );
    }
    if (authUser.email && userEmail.toLowerCase() !== authUser.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'Email must match your authenticated account.' },
        { status: 403 }
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
