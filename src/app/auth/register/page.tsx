import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';
import { UserRole } from '@/types/user';

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Extract role from query parameters
  const roleParam = searchParams.role as string | undefined;
  const defaultRole = roleParam === 'guard' || roleParam === 'resident' 
    ? roleParam as UserRole 
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-musa-bg dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="flex items-center text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
          
          <div className="text-gray-700 dark:text-gray-300">
            <Link href="/auth/login" className="flex items-center hover:text-primary dark:hover:text-primary-light transition-colors">
              <span>Already have an account?</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-md mb-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-primary-light/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">Join Musa</h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                {defaultRole === 'guard' 
                  ? 'Register as a guard to help manage estate access and security.' 
                  : defaultRole === 'resident'
                  ? 'Register as a resident to create and manage access codes for your household.'
                  : 'Create your account to get started with Musa estate management.'}
              </p>
            </div>
            
            <div className="card">
              <AuthForm mode="register" defaultRole={defaultRole} />
            </div>
            
            <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
              By registering, you agree to our
              <a href="#" className="text-primary dark:text-primary-light hover:underline mx-1">Terms of Service</a>
              and
              <a href="#" className="text-primary dark:text-primary-light hover:underline mx-1">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
