'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { HelmetProvider } from 'react-helmet-async';
import Header from '@/components/layout/Header/header';
import Footer from '@/components/layout/Footer/Footer';
import ProfileGuard from '@/domains/authentication/components/ProfileGuard/ProfileGuard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Debug utilities temporarily disabled during reorganization
// if (process.env.NODE_ENV === 'development') {
//   import('@/domains/authentication/utils/authDebugger');
//   import('@/domains/events/utils/debugCollaboration');
// }

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const pathname = usePathname();

  // Define routes where footer should be visible
  const footerRoutes = [
    '/',                        // Home page
    '/events',                  // All events page
    '/activities',              // All activities page
    '/business',                // Business page
    '/about',                   // About page
    '/contact',                 // Contact page
    '/termsandconditions',      // Terms and conditions page
    '/privacypolicy',           // Privacy policy page
    '/refundpolicy'             // Refund policy page
  ];

  // Define routes that should show secondary nav (affects top padding)
  const secondaryNavRoutes = ['/', '/events', '/activities'];
  const shouldShowSecondaryNav = pathname ? secondaryNavRoutes.includes(pathname) : false;

  // Check if current route should show footer
  const shouldShowFooter = pathname ? footerRoutes.includes(pathname) : false;

  return (
    <HelmetProvider>
      <ProfileGuard>
        <div className="layout-container bg-gradient-to-b from-black via-blue-900/20 to-black">
          <Header />
          <main 
            style={{ 
              flex: '1 0 auto',
              // Add proper top padding to account for fixed header
              paddingTop: shouldShowSecondaryNav 
                ? 'var(--total-header-height-mobile, 100px)' // Mobile with secondary nav
                : 'var(--header-height, 44px)', // Desktop or pages without secondary nav
              minHeight: '100vh',
              position: 'relative'
            }}
            className={`
              ${shouldShowSecondaryNav ? 'md:pt-[44px]' : 'md:pt-[44px]'}
            `}
          >
            {children}
          </main>
          {shouldShowFooter && <Footer />}
        </div>
      </ProfileGuard>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </HelmetProvider>
  );
};

export default ClientLayout;