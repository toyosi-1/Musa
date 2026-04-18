import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

// This API route handles email sending using Resend
// It's a server-side route that safely uses the RESEND_API_KEY

// Lazy-initialize to avoid build-time errors when env var isn't set
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Musa Security <noreply@musa-security.com>';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 emails per minute per IP.
    // Protects against spam/abuse of our Resend quota.
    const rl = rateLimit({
      key: `send-email:${getClientIp(request)}`,
      limit: 5,
      windowMs: 60_000,
    });
    if (!rl.success) return rateLimitResponse(rl);

    // Support both old format (with smtpConfig) and new format (just emailData)
    const body = await request.json();
    const emailData: EmailData = body.emailData || body;

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      return NextResponse.json(
        { error: 'Missing required email fields (to, subject, html)' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Email service not configured. RESEND_API_KEY is missing.' },
        { status: 500 }
      );
    }

    console.log('📧 Sending email via Resend:');
    console.log('To:', emailData.to);
    console.log('From:', emailData.from || FROM_EMAIL);
    console.log('Subject:', emailData.subject);

    const { data, error } = await getResend().emails.send({
      from: emailData.from || FROM_EMAIL,
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return NextResponse.json(
        { error: `Resend error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Email sent successfully via Resend:', data?.id);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      to: emailData.to,
      subject: emailData.subject,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
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
