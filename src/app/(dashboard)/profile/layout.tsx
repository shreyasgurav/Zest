import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | Zest',
  description: 'Manage your Zest profile settings and preferences',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'none',
      paddingTop: '44px' // Account for header height
    }}>
      {children}
    </div>
  );
} 