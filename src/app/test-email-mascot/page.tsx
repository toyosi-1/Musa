import { getMusaEmailMascotTestHTML } from '@/components/email/MusaEmailMascot';

/**
 * This page renders a preview of the email-friendly Musa mascot
 */
export default function TestEmailMascotPage() {
  // Use dangerouslySetInnerHTML to render the full HTML template
  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: getMusaEmailMascotTestHTML() 
      }}
    />
  );
}
