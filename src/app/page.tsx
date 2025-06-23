import Link from 'next/link';
import Image from 'next/image';
import AccessIllustration from '@/components/ui/illustrations/AccessIllustration';
import LogoAnimation from '@/components/ui/illustrations/LogoAnimation';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-primary p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white dark:text-white">Musa</h1>
          <div className="space-x-4">
            <Link href="/auth/login" className="hover:underline">Login</Link>
            <Link href="/auth/register" className="bg-white text-primary px-4 py-2 rounded-md font-semibold hover:bg-gray-100">
              Register
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-grow container mx-auto py-16 px-4 flex flex-col md:flex-row items-center justify-between gap-12">

        <div className="md:w-1/2 space-y-6 animate-slide-in-right">
          <h2 className="text-4xl font-bold text-gray-800">Modern Estate Access Control</h2>
          <p className="text-xl text-gray-600">
            Musa is a seamless, fast, and user-friendly access control system designed for estates.
            No more manual security checks – just scan and go.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/auth/register?role=resident" className="btn-primary text-center">
              Register as Resident
            </Link>
            <Link href="/auth/register?role=guard" className="btn-secondary text-center">
              Register as Guard
            </Link>
          </div>
        </div>
        <div className="md:w-1/2 flex justify-center animate-slide-in-left">
          <div className="flex flex-col items-center">
            <LogoAnimation />
          </div>
        </div>
      </section>

      <section className="bg-gray-100 dark:bg-gray-800 py-16 px-4 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-white animate-fade-in">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg hover:shadow-card-hover transition-all duration-300 transform hover:scale-105 animate-slide-up">
                <div className="bg-primary-50 dark:bg-primary-900/30 w-16 h-16 rounded-full flex items-center justify-center text-primary dark:text-primary-300 shadow-md mb-4 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white text-center">For Residents</h3>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Generate private QR or text-based access codes to share with guests. Family heads can manage household members.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg hover:shadow-card-hover transition-all duration-300 transform hover:scale-105 animate-slide-up" style={{animationDelay: '0.2s'}}>
                <div className="bg-secondary-50 dark:bg-secondary-900/30 w-16 h-16 rounded-full flex items-center justify-center text-secondary dark:text-secondary-300 shadow-md mb-4 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white text-center">For Guards</h3>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Easily scan or enter access codes for instant verification. Simple green/red indicators for fast access control.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg hover:shadow-card-hover transition-all duration-300 transform hover:scale-105 animate-slide-up" style={{animationDelay: '0.4s'}}>
                <div className="bg-info-50 dark:bg-info-900/30 w-16 h-16 rounded-full flex items-center justify-center text-info dark:text-info-300 shadow-md mb-4 mx-auto transform transition-transform duration-300 hover:scale-110 hover:rotate-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white text-center">Privacy-Focused</h3>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Guards can verify access without knowing who codes belong to. Family heads cannot see members' codes.
                </p>
              </div>
            </div>
        </div>
      </section>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold text-white dark:text-white">Musa</h2>
              <p className="text-gray-400">Estate Access Control System</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400"> {new Date().getFullYear()} Musa. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
