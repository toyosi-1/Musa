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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="flex items-center mb-8 text-primary hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Home
        </Link>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Join Musa</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {defaultRole === 'guard' 
                ? 'Register as a guard to manage estate access' 
                : defaultRole === 'resident'
                ? 'Register as a resident to create and manage access codes'
                : 'Create an account to get started'}
            </p>
          </div>
          
          <AuthForm mode="register" defaultRole={defaultRole} />
        </div>
      </div>
    </div>
  );
}
