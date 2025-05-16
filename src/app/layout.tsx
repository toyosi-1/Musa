import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthWrapper from '@/components/auth/AuthWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Musa - Estate Access Control',
  description: 'A seamless, fast, and user-friendly access control system for estates',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
