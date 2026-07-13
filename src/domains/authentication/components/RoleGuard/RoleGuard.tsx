'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { checkPageOwnership, getUserOwnedPages } from '@/domains/authentication/services/auth.service';
import RoleGuardNotification from './RoleGuardNotification';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole: 'user' | 'organization' | 'artist' | 'venue';
  redirectPath?: string;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRole, redirectPath }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showNotification, setShowNotification] = useState<{currentRole: string, attemptedRole: string} | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkRoleAccess = async () => {
      const unsubscribe = onAuthStateChanged(auth(), async (user) => {
        if (!user) {
          router.push('/login');
          return;
        }

        try {
          // For user role, just check if they have a user profile
          if (allowedRole === 'user') {
            const token = await user.getIdToken();
            const response = await fetch('/api/users/profile', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              setIsAuthorized(true);
            } else {
              router.push('/login');
            }
            setIsLoading(false);
            return;
          }

          // For other roles, check ownership of pages via Postgres API
          const pageId = searchParams?.get('page');
          let hasAccess = false;
          const ownedPages = await getUserOwnedPages(user.uid);
          
          if (allowedRole === 'artist') {
            if (pageId) {
              hasAccess = ownedPages.artists.some(artist => artist.uid === pageId);
            } else {
              hasAccess = ownedPages.artists.length > 0;
            }
          } else if (allowedRole === 'organization') {
            if (pageId) {
              hasAccess = ownedPages.organizations.some(org => org.uid === pageId);
            } else {
              hasAccess = ownedPages.organizations.length > 0;
            }
          } else if (allowedRole === 'venue') {
            if (pageId) {
              hasAccess = ownedPages.venues.some(venue => venue.uid === pageId);
            } else {
              hasAccess = ownedPages.venues.length > 0;
            }
          }

          console.log(`🔒 RoleGuard Check:`, {
            requiredRole: allowedRole,
            pageId,
            hasAccess,
            pathname,
            userId: user.uid
          });

          if (hasAccess) {
            setIsAuthorized(true);
          } else {
            // Show notification about role mismatch
            const currentRole = ownedPages.artists.length > 0 ? 'artist' :
              ownedPages.organizations.length > 0 ? 'organization' :
              ownedPages.venues.length > 0 ? 'venue' : 'user';
            
            setShowNotification({
              currentRole,
              attemptedRole: allowedRole
            });
          }
          
          setIsLoading(false);
        } catch (error) {
          console.error('Error checking role access:', error);
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    };

    checkRoleAccess();
  }, [allowedRole, pathname, router, searchParams]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Checking access...</p>
      </div>
    );
  }

  if (showNotification) {
    return (
      <RoleGuardNotification 
        currentRole={showNotification.currentRole}
        attemptedRole={showNotification.attemptedRole}
      />
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;