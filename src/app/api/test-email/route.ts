import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/test-email?to=you@example.com
 * Quick diagnostic — sends a plain test email via Resend and returns the full
 * Resend response so we can see exactly what error (if any) is returned.
 * REMOVE or protect this endpoint after debugging.
 */
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to');

  if (!to) {
    return NextResponse.json({ error: 'Add ?to=your@email.com to the URL' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Musa Security <noreply@musa-security.com>';

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set on this server' }, { status: 500 });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: 'Musa Email Test',
      html: '<p>This is a test email from Musa Security to verify the email system is working.</p>',
    });

    return NextResponse.json({
      apiKeyPrefix: `${apiKey.substring(0, 8)}...`,
      fromEmail,
      to,
      resendData: data,
      resendError: error,
      success: !error,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || String(err),
      fromEmail,
      to,
    }, { status: 500 });
  }
}
