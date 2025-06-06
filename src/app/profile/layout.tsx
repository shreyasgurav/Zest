import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | Zest',
  description: 'Manage your Zest profile',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  );
} 