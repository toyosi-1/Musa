import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

/**
 * POST /api/device-approval
 * 
 * Actions:
 * - "send": Generate a device approval token, store it, and send email
 * - "verify": Verify a token and approve the device
 * - "check": Check if a device is already approved for a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'check') {
      return handleCheck(body);
    } else if (action === 'send') {
      return handleSend(body);
    } else if (action === 'verify') {
      return handleVerify(body);
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Device approval error:', error?.message || error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

/**
 * Check if a device is approved for a given user.
 */
async function handleCheck(body: any) {
  const { userId, deviceId } = body;
  if (!userId || !deviceId) {
    return NextResponse.json({ success: false, message: 'Missing userId or deviceId' }, { status: 400 });
  }

  const db = getAdminDatabase();
  const snapshot = await db.ref(`users/${userId}/knownDevices/${deviceId}`).once('value');

  return NextResponse.json({
    success: true,
    approved: snapshot.exists(),
  });
}

/**
 * Generate a token and send device approval email.
 */
async function handleSend(body: any) {
  const { userId, deviceId, deviceLabel, email, displayName } = body;
  if (!userId || !deviceId || !email) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
  }

  const db = getAdminDatabase();

  // Generate a random token
  const token = generateToken();
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes

  // Store the pending approval
  await db.ref(`deviceApprovals/${token}`).set({
    userId,
    deviceId,
    deviceLabel: deviceLabel || 'Unknown Device',
    email,
    createdAt: now,
    expiresAt,
    status: 'pending',
  });

  // Send the approval email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://musa-security.com';
  const approvalLink = `${appUrl}/approve-device?token=${token}`;

  try {
    // Use the existing SMTP email route
    const emailHtml = generateDeviceApprovalEmailHTML({
      displayName: displayName || 'User',
      deviceLabel: deviceLabel || 'Unknown Device',
      approvalLink,
      expiresInMinutes: 15,
    });

    const smtpConfig = {
      host: 'mail.hspace.cloud',
      port: 465,
      secure: true,
      auth: {
        user: 'toyosiajibola@musa-security.com',
        pass: 'Olatoyosi1',
      },
    };

    // Use internal fetch to the send-email route
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://musa-security.com';
    
    // Send email directly using nodemailer since we're on the server
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Musa Security" <${smtpConfig.auth.user}>`,
      to: email,
      subject: '🔐 New Device Login – Approval Required',
      html: emailHtml,
    });

    console.log('Device approval email sent to:', email);
  } catch (emailError) {
    console.error('Failed to send device approval email:', emailError);
    // Don't fail the request — the token is stored, user can retry
  }

  return NextResponse.json({
    success: true,
    message: 'Approval email sent. Please check your inbox.',
  });
}

/**
 * Verify a token and approve the device.
 */
async function handleVerify(body: any) {
  const { token } = body;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Missing token' }, { status: 400 });
  }

  const db = getAdminDatabase();
  const snapshot = await db.ref(`deviceApprovals/${token}`).once('value');

  if (!snapshot.exists()) {
    return NextResponse.json({ success: false, message: 'Invalid or expired approval link.' });
  }

  const data = snapshot.val();

  if (data.status !== 'pending') {
    return NextResponse.json({ success: false, message: 'This link has already been used.' });
  }

  if (data.expiresAt < Date.now()) {
    await db.ref(`deviceApprovals/${token}`).update({ status: 'expired' });
    return NextResponse.json({ success: false, message: 'This approval link has expired. Please try logging in again.' });
  }

  // Approve the device
  await db.ref(`users/${data.userId}/knownDevices/${data.deviceId}`).set({
    label: data.deviceLabel,
    approvedAt: Date.now(),
  });

  // Mark token as used
  await db.ref(`deviceApprovals/${token}`).update({ status: 'approved', approvedAt: Date.now() });

  return NextResponse.json({
    success: true,
    message: 'Device approved! You can now sign in.',
  });
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateDeviceApprovalEmailHTML(data: {
  displayName: string;
  deviceLabel: string;
  approvalLink: string;
  expiresInMinutes: number;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Device Approval - Musa Security</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; margin: 0 auto 16px; background: linear-gradient(135deg, #fef3c7, #fbbf24); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 36px;">🔐</span>
      </div>
      <h1 style="color: #1f2937; font-size: 24px; margin: 0;">New Device Login</h1>
      <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Approval required for your Musa account</p>
    </div>

    <div style="margin: 24px 0;">
      <p>Hello <strong>${data.displayName}</strong>,</p>
      <p>Someone is trying to sign in to your Musa account from a new device:</p>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-weight: 600; color: #1f2937;">📱 ${data.deviceLabel}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Time: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</p>
      </div>

      <p>If this was you, click the button below to approve this device:</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.approvalLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Approve This Device
        </a>
      </div>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; font-size: 13px; color: #92400e;">
        <strong>⚠️ Security:</strong> This link expires in ${data.expiresInMinutes} minutes. If you didn't try to sign in, please ignore this email and consider changing your password.
      </div>
    </div>

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
      <p>Musa Security App &middot; Keeping your estate safe</p>
    </div>
  </div>
</body>
</html>`;
}
