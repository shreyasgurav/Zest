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
      background: 'rgba(17, 17, 17, 0.95)',
      paddingTop: '44px' // Account for header height
    }}>
      {children}
    </div>
  );
} 