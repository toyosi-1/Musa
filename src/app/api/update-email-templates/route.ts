import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMusaEmailMascotHTML } from '@/components/email/MusaEmailMascot';

/**
 * API route that updates all email templates to use the email-friendly mascot
 * This is a utility API that should only be used in development
 */
export async function GET(req: NextRequest) {
  // Security check to prevent execution in production
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('This utility is only available in development mode', {
      status: 403
    });
  }

  try {
    const emailServicePath = path.join(process.cwd(), 'src', 'services', 'smtpEmailService.ts');
    
    if (!fs.existsSync(emailServicePath)) {
      return new NextResponse(`File not found: ${emailServicePath}`, {
        status: 404
      });
    }

    // Read the current file content
    let fileContent = fs.readFileSync(emailServicePath, 'utf-8');

    // Create the mascot HTML to inject
    const mascotHTML = getMusaEmailMascotHTML();

    // Define the pattern to look for and replace - avoiding the 's' flag for compatibility
    const oldMascotPattern = /<!-- Musa Character - Email Compatible Version -->([\s\S]*?)<div style="width: 80px; height: 80px; background: linear-gradient([\s\S]*?)🏠([\s\S]*?)<div style="position: absolute([\s\S]*?)<\/div>([\s\S]*?)<\/div>/g;

    // Replace all instances of the pattern
    const updatedContent = fileContent.replace(oldMascotPattern, `<!-- Updated Musa Character - Email Compatible Version -->${mascotHTML}`);

    // Write the updated content back to the file
    fs.writeFileSync(emailServicePath, updatedContent, 'utf-8');

    // Count how many replacements were made
    const instanceCount = (fileContent.match(oldMascotPattern) || []).length;

    return new NextResponse(JSON.stringify({
      success: true,
      message: `Successfully updated ${instanceCount} instances of the Musa mascot in email templates`,
      mascotHTML: mascotHTML
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error updating email templates:', error);
    return new NextResponse(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
