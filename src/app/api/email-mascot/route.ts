import { NextRequest, NextResponse } from 'next/server';
import { getMusaEmailMascotHTML, getMusaEmailMascotTestHTML } from '@/components/email/MusaEmailMascot';

/**
 * API route that returns a preview of the email-friendly Musa mascot
 * @returns HTML preview page showing the email mascot
 */
export async function GET(req: NextRequest) {
  try {
    // Use the test HTML function that displays the mascot in various contexts
    const previewHTML = getMusaEmailMascotTestHTML();

    return new NextResponse(previewHTML, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating email mascot preview:', error);
    return new NextResponse('Error generating preview', { status: 500 });
  }
}
