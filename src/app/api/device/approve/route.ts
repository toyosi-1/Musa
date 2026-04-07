import { NextRequest, NextResponse } from 'next/server';
import { approveDeviceWithToken } from '@/services/deviceService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_token', request.url)
      );
    }

    // Approve the device
    const result = await approveDeviceWithToken(token);

    if (result.success) {
      // Redirect to login with success message
      return NextResponse.redirect(
        new URL('/auth/login?deviceApproved=true', request.url)
      );
    } else {
      // Redirect to login with error message
      return NextResponse.redirect(
        new URL(`/auth/login?error=device_approval_failed&message=${encodeURIComponent(result.message)}`, request.url)
      );
    }
  } catch (error) {
    console.error('Error approving device:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=device_approval_error', request.url)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await approveDeviceWithToken(token);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('Error approving device:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
