"use client";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <a href="/" className="text-white hover:text-blue-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </a>
          <h1 className="text-lg font-bold">Musa</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow px-4 py-10">
        <article className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: February 27, 2025</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">1. Introduction</h2>
              <p>
                Musa (&quot;we&quot;, &quot;our&quot;, or &quot;the App&quot;) is an estate access control application operated by Musa Security. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the Musa application.
              </p>
              <p>
                By creating an account or using Musa, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">2. Information We Collect</h2>
              <p><strong>Account Information:</strong> When you register, we collect your full name, email address, phone number, and your selected role (Resident or Guard).</p>
              <p><strong>Household Data:</strong> If you are a resident, we store your estate name, household address, and household membership details.</p>
              <p><strong>Access Code Data:</strong> We store access codes you generate, including guest names, purpose of visit, expiry times, and QR code data.</p>
              <p><strong>Verification Records:</strong> For security guards, we log verification attempts including timestamps, code validity, and gate location.</p>
              <p><strong>Community Feed:</strong> Posts, comments, and interactions you make on the community feed are stored.</p>
              <p><strong>Device Information:</strong> We may collect basic device information for app functionality and push notifications.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide and maintain the access control service</li>
                <li>Verify your identity and manage your account</li>
                <li>Generate and validate access codes for estate entry</li>
                <li>Notify you when your access codes are scanned at the gate</li>
                <li>Manage household membership and permissions</li>
                <li>Display community feed content to estate residents</li>
                <li>Improve the App and fix technical issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">4. Data Storage and Security</h2>
              <p>
                Your data is stored securely using Google Firebase, which provides encryption in transit (HTTPS/TLS) and at rest. We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, or destruction.
              </p>
              <p>
                Access to user data is restricted to authorised estate administrators and is used solely for the purpose of managing estate access control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">5. Data Sharing</h2>
              <p>We do <strong>not</strong> sell, trade, or share your personal information with third parties for marketing purposes. Your data may be shared only in the following limited circumstances:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Estate Administration:</strong> Estate administrators may view resident and guard profiles for management purposes.</li>
                <li><strong>Access Verification:</strong> When a guard verifies an access code, they see only the validity status and guest name — not the resident&apos;s personal details.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect the safety of our users.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Access</strong> your personal data stored in the App</li>
                <li><strong>Correct</strong> inaccurate information via your profile settings</li>
                <li><strong>Delete</strong> your account and all associated data</li>
                <li><strong>Export</strong> your data upon request</li>
              </ul>
              <p className="mt-3">
                To request account deletion, visit{' '}
                <a href="/delete-account" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800">
                  musa-security.com/delete-account
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">7. Data Retention</h2>
              <p>
                We retain your personal data for as long as your account is active. Access codes and verification records are retained for audit and security purposes for up to 12 months after creation. When you request account deletion, all personal data is permanently removed within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">8. Children&apos;s Privacy</h2>
              <p>
                Musa is not intended for use by children under the age of 18. We do not knowingly collect personal information from children. If you believe a child has created an account, please contact us and we will promptly delete the account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mt-8 mb-3">10. Contact Us</h2>
              <p>If you have any questions or concerns about this Privacy Policy or your data, please contact us:</p>
              <ul className="list-none pl-0 space-y-1 mt-2">
                <li><strong>Email:</strong>{' '}
                  <a href="mailto:toyosiajibola@musa-security.com" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800">
                    toyosiajibola@musa-security.com
                  </a>
                </li>
                <li><strong>Website:</strong>{' '}
                  <a href="https://www.musa-security.com" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800">
                    www.musa-security.com
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} Musa - Estate Access Control. All rights reserved.</p>
      </footer>
    </div>
  );
}
