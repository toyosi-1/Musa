"use client";

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-musa-bg dark:bg-gray-900">
      {/* Header */}
      <header className="bg-musa-lightmint dark:bg-gray-800 p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="ml-2 text-xl font-semibold text-gray-800 dark:text-white">Musa</span>
          </Link>
          <Link 
            href="/auth/register"
            className="text-primary hover:text-blue-600 font-medium"
          >
            Back to Registration
          </Link>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            Terms and Conditions
          </h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By accessing and using the Musa Security Application ("the App"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                2. Use License
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Permission is granted to temporarily use the Musa Security Application for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 ml-4">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained in the application</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                3. User Accounts and Registration
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To access certain features of the App, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 ml-4">
                <li>provide accurate, current, and complete information during registration</li>
                <li>maintain and update your information to keep it accurate and current</li>
                <li>maintain the security of your password and account</li>
                <li>notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                4. Account Approval Process
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                All user accounts are subject to administrator approval. We reserve the right to:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 ml-4">
                <li>approve or reject any registration application at our sole discretion</li>
                <li>suspend or terminate accounts that violate these terms</li>
                <li>require additional verification for account approval</li>
              </ul>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                5. Privacy Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our service. By using the App, you agree to the collection and use of information in accordance with our Privacy Policy.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                6. Prohibited Uses
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You may not use the App:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-4 ml-4">
                <li>for any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>to violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>to infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>to harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>to submit false or misleading information</li>
              </ul>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                7. Disclaimer
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The information on this application is provided on an 'as is' basis. To the fullest extent permitted by law, this Company excludes all representations, warranties, conditions and terms.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                8. Limitations
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                In no event shall Musa Security Application or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the application, even if authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                9. Modifications
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may revise these terms of service at any time without notice. By using this application, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                10. Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Email: support@musa-app.com
              </p>
            </section>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link 
              href="/auth/register"
              className="btn-primary inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
