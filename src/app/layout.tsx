import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from './ClientLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Zest',
  description: 'Your guide to everything',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          <div className="bg-gradient-to-b from-black via-blue-900/20 to-black">
            {children}
          </div>
        </ClientLayout>
      </body>
    </html>
  );
} 