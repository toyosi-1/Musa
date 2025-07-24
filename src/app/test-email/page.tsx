import EmailDiagnosticTest from '@/components/debug/EmailDiagnosticTest';

export default function TestEmailPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            🔧 Musa Email System Diagnostic
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test household invitation email delivery
          </p>
        </div>
        
        <EmailDiagnosticTest />
        
        <div className="mt-8 text-center">
          <a 
            href="/"
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            ← Back to Musa App
          </a>
        </div>
      </div>
    </div>
  );
}
