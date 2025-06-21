'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

interface ProfileGuardProps {
  children: React.ReactNode;
}

const ProfileGuard: React.FC<ProfileGuardProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Pages that don't require profile completion
  const publicPages = [
    '/',
    '/login',
    '/login/organisation',
    '/about',
    '/contact',
    '/privacypolicy',
    '/refundpolicy',
    '/termsandconditions'
  ];

  // Pages that are accessible for organizations (start with these prefixes)
  const organizationPages = [
    '/organisation',
    '/organization',
    '/listevents'
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        // User not logged in
        setIsLoading(false);
        setIsProfileComplete(false);
        return;
      }

      try {
        // Check if current page is public or organization-related
        const currentPath = pathname || '/';
        const isPublicPage = publicPages.includes(currentPath);
        const isOrganizationPage = organizationPages.some(orgPath => currentPath.startsWith(orgPath));
        
        if (isPublicPage || isOrganizationPage) {
          setIsLoading(false);
          setIsProfileComplete(true); // Allow access
          return;
        }

        // Check user profile completeness
        const userRef = doc(db, "Users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const hasCompleteProfile = userData.name && userData.username && userData.phone;
          
          setIsProfileComplete(hasCompleteProfile);
          
          if (!hasCompleteProfile) {
            console.log("🚫 Incomplete profile detected, redirecting to login...");
            router.push('/login');
          }
        } else {
          // User document doesn't exist
          console.log("🚫 No user document found, redirecting to login...");
          setIsProfileComplete(false);
          router.push('/login');
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        setIsProfileComplete(false);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #000000, rgba(37, 99, 235, 0.2), #000000)',
        color: 'white'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '20px'
        }}>
          <div 
            className="spinner"
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid #a855f7',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}
          ></div>
          <p style={{ margin: 0, fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Loading...
          </p>
          <style dangerouslySetInnerHTML={{
            __html: `
              .spinner {
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `
          }}></style>
        </div>
      </div>
    );
  }

  // Check if current page is public
  const currentPath = pathname || '/';
  const isPublicPage = publicPages.includes(currentPath);
  const isOrganizationPage = organizationPages.some(orgPath => currentPath.startsWith(orgPath));

  // Allow access to public pages and organization pages
  if (isPublicPage || isOrganizationPage || !user) {
    return <>{children}</>;
  }

  // For authenticated users, only allow access if profile is complete
  if (user && isProfileComplete) {
    return <>{children}</>;
  }

  // If we reach here, user has incomplete profile and is trying to access protected page
  // The redirect is handled in the useEffect, so we just show loading
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #000000, rgba(37, 99, 235, 0.2), #000000)',
      color: 'white'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '20px'
      }}>
        <p style={{ margin: 0, fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)' }}>
          Redirecting to complete your profile...
        </p>
      </div>
    </div>
  );
};

export default ProfileGuard; 