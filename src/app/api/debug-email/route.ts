import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * GET /api/debug-email
 * Tests whether RESEND_API_KEY is configured and can send email.
 * TEMPORARY - remove after debugging.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testTo = searchParams.get('to') || 'cardojay1@gmail.com';
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'RESEND_API_KEY is not set in environment variables',
    }, { status: 500 });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Musa Security <noreply@musa-security.com>',
      to: [testTo],
      subject: 'Musa - Email Diagnostic Test',
      html: `<p>Test email sent to <strong>${testTo}</strong>. If you received this, Resend is delivering to this address correctly.</p>`,
    });

    if (error) {
      return NextResponse.json({ ok: false, sentTo: testTo, error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sentTo: testTo, messageId: data?.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
