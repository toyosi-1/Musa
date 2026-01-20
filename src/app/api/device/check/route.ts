import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDevice } from '@/services/deviceService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fingerprint, userAgent, platform } = body;

    if (!userId || !fingerprint) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get client IP address (if available)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 
                     request.headers.get('x-real-ip') || undefined;

    // Get or create device
    const result = await getOrCreateDevice(
      userId,
      fingerprint,
      userAgent || 'Unknown',
      platform || 'Unknown',
      ipAddress
    );

    return NextResponse.json({
      success: true,
      deviceId: result.device.id,
      isNew: result.isNew,
      needsApproval: result.needsApproval,
      status: result.device.status,
    });
  } catch (error) {
    console.error('Error checking device:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check device' },
      { status: 500 }
    );
  }
}
