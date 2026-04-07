import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for generating email-friendly assets for Musa emails
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get('asset');
  
  if (asset === 'musa-logo') {
    // Return HTML for an email-friendly Musa logo
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .musa-logo {
            width: 90px;
            height: 90px;
            background-color: #DAA520;
            border-radius: 45px;
            border: 4px solid #FFD700;
            text-align: center;
            font-size: 40px;
            line-height: 90px;
          }
        </style>
      </head>
      <body>
        <div class="musa-logo">🏠</div>
      </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
  
  // Return 404 for unknown assets
  return new NextResponse('Asset not found', { status: 404 });
}
