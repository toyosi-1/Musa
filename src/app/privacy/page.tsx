import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <Link 
          href="/"
          className="inline-flex items-center text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 mb-6 transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last Updated: February 26, 2026</p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Welcome to Musa Security App ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              By using Musa, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-700 dark:text-gray-300">We collect the following personal information:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, and role (resident, guard, or administrator)</li>
              <li><strong>Authentication Data:</strong> Password (encrypted), authentication tokens, and session information</li>
              <li><strong>Profile Information:</strong> Estate assignment, household membership, and user status</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">2.2 Usage Information</h3>
            <p className="text-gray-700 dark:text-gray-300">We automatically collect:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li><strong>Access Logs:</strong> QR code scans, access code generation, and verification activities</li>
              <li><strong>Security Events:</strong> Login attempts, authentication events, and security-related actions</li>
              <li><strong>Device Information:</strong> Device type, operating system, app version, and unique device identifiers</li>
              <li><strong>Activity Data:</strong> Feed posts, comments, likes, and community interactions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">2.3 Camera and Storage Permissions</h3>
            <p className="text-gray-700 dark:text-gray-300">
              We request camera access for QR code scanning (guards only) and storage access for saving QR codes. These permissions are optional and only used for their stated purposes.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 dark:text-gray-300">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li>Provide and maintain our security access control services</li>
              <li>Authenticate users and manage access permissions</li>
              <li>Generate and verify access codes and QR codes</li>
              <li>Facilitate household management and member invitations</li>
              <li>Enable community features (feed, messaging, notifications)</li>
              <li>Monitor and log security events for estate safety</li>
              <li>Send important notifications about access requests and approvals</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Storage and Security</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">4.1 Firebase Services</h3>
            <p className="text-gray-700 dark:text-gray-300">
              We use Google Firebase services for data storage and authentication. Your data is stored on secure Firebase servers with industry-standard encryption. Firebase complies with GDPR, CCPA, and other privacy regulations.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">4.2 Security Measures</h3>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li>End-to-end encryption for sensitive data</li>
              <li>Secure authentication with Firebase Authentication</li>
              <li>Role-based access control (RBAC) for data permissions</li>
              <li>Regular security audits and updates</li>
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Password hashing and secure token management</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">4.3 Data Retention</h3>
            <p className="text-gray-700 dark:text-gray-300">
              We retain your personal information for as long as your account is active or as needed to provide services. Security logs and access history are retained for 90 days for security and compliance purposes. You may request deletion of your account and data at any time.
            </p>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">5.1 Within Your Estate</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Your information is shared within your assigned estate according to your role:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li><strong>Guards:</strong> Can verify access codes but cannot see resident names or personal details</li>
              <li><strong>Residents:</strong> Can see estate feed posts and household member information</li>
              <li><strong>Administrators:</strong> Have access to user management and estate-wide data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">5.2 Third-Party Services</h3>
            <p className="text-gray-700 dark:text-gray-300">We use the following third-party services:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li><strong>Firebase (Google):</strong> Authentication, database, and cloud storage</li>
              <li><strong>Netlify:</strong> Web hosting and deployment</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              These services have their own privacy policies and we encourage you to review them.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">5.3 Legal Requirements</h3>
            <p className="text-gray-700 dark:text-gray-300">
              We may disclose your information if required by law, court order, or government request, or to protect the rights, property, or safety of Musa, our users, or others.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Your Privacy Rights</h2>
            <p className="text-gray-700 dark:text-gray-300">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from non-essential notifications</li>
              <li><strong>Restriction:</strong> Request limitation of data processing</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              To exercise these rights, contact us at <a href="mailto:privacy@musa-security.com" className="text-primary hover:underline">privacy@musa-security.com</a>
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Children's Privacy</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Musa is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          {/* International Users */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. International Data Transfers</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using Musa, you consent to such transfers. We ensure appropriate safeguards are in place to protect your information.
            </p>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We use cookies and similar tracking technologies to maintain user sessions and improve user experience. You can control cookie preferences through your browser settings. Essential cookies required for authentication cannot be disabled.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Contact Us</h2>
            <p className="text-gray-700 dark:text-gray-300">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mt-4">
              <p className="text-gray-700 dark:text-gray-300"><strong>Email:</strong> <a href="mailto:privacy@musa-security.com" className="text-primary hover:underline">privacy@musa-security.com</a></p>
              <p className="text-gray-700 dark:text-gray-300 mt-2"><strong>Support:</strong> <a href="mailto:support@musa-security.com" className="text-primary hover:underline">support@musa-security.com</a></p>
              <p className="text-gray-700 dark:text-gray-300 mt-2"><strong>Website:</strong> <a href="https://musa-security-app.windsurf.build" className="text-primary hover:underline">https://musa-security-app.windsurf.build</a></p>
            </div>
          </section>

          {/* Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Regulatory Compliance</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Musa complies with applicable data protection regulations including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-2">
              <li>General Data Protection Regulation (GDPR) - EU</li>
              <li>California Consumer Privacy Act (CCPA) - USA</li>
              <li>Personal Information Protection and Electronic Documents Act (PIPEDA) - Canada</li>
              <li>Nigeria Data Protection Regulation (NDPR)</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            © 2026 Musa Security App. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
