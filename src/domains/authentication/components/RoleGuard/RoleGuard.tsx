'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/infrastructure/firebase';
import { checkPageOwnership, getUserOwnedPages } from '@/domains/authentication/services/auth.service';
import { ContentSharingSecurity } from '@/shared/utils/security/contentSharingSecurity';
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
          // Not authenticated, redirect to login
          router.push('/login');
          return;
        }

        try {
          // For user role, just check if they have a user profile
          if (allowedRole === 'user') {
            const userDoc = await getDoc(doc(db(), "Users", user.uid));
            if (userDoc.exists()) {
              setIsAuthorized(true);
            } else {
              router.push('/login');
            }
            setIsLoading(false);
            return;
          }

          // For other roles, check ownership of pages
          // Extract page ID from URL query parameters (e.g., /artist?page=pageId)
          const pageId = searchParams?.get('page');

          // Check if user owns this specific page or any pages of this type
          let hasAccess = false;
          const ownedPages = await getUserOwnedPages(user.uid);
          
          if (allowedRole === 'artist') {
            if (pageId) {
              // Check ownership of specific page
              hasAccess = ownedPages.artists.some(artist => artist.uid === pageId);
              
              // If not owned, check for shared access
              if (!hasAccess) {
                const sharedPermissions = await ContentSharingSecurity.verifyContentAccess('artist', pageId, user.uid);
                hasAccess = sharedPermissions.canView && sharedPermissions.role !== 'unauthorized';
                
                if (hasAccess) {
                  console.log(`🔓 Shared access granted for artist page: ${pageId} with role: ${sharedPermissions.role}`);
                }
              }
            } else {
              // No specific page, check if user owns any artist pages or has shared access
              hasAccess = ownedPages.artists.length > 0;
              
              if (!hasAccess) {
                // Check if user has shared access to any artist pages
                const sharedContent = await ContentSharingSecurity.getUserSharedContent(user.uid);
                hasAccess = sharedContent.artists.length > 0;
              }
            }
          } else if (allowedRole === 'organization') {
            if (pageId) {
              // Check ownership of specific page
              hasAccess = ownedPages.organizations.some(org => org.uid === pageId);
              
              // If not owned, check for shared access
              if (!hasAccess) {
                const sharedPermissions = await ContentSharingSecurity.verifyContentAccess('organization', pageId, user.uid);
                hasAccess = sharedPermissions.canView && sharedPermissions.role !== 'unauthorized';
                
                if (hasAccess) {
                  console.log(`🔓 Shared access granted for organization page: ${pageId} with role: ${sharedPermissions.role}`);
                }
              }
            } else {
              // No specific page, check if user owns any organization pages or has shared access
              hasAccess = ownedPages.organizations.length > 0;
              
              if (!hasAccess) {
                // Check if user has shared access to any organization pages
                const sharedContent = await ContentSharingSecurity.getUserSharedContent(user.uid);
                hasAccess = sharedContent.organizations.length > 0;
              }
            }
          } else if (allowedRole === 'venue') {
            if (pageId) {
              // Check ownership of specific page
              hasAccess = ownedPages.venues.some(venue => venue.uid === pageId);
              
              // If not owned, check for shared access
              if (!hasAccess) {
                const sharedPermissions = await ContentSharingSecurity.verifyContentAccess('venue', pageId, user.uid);
                hasAccess = sharedPermissions.canView && sharedPermissions.role !== 'unauthorized';
                
                if (hasAccess) {
                  console.log(`🔓 Shared access granted for venue page: ${pageId} with role: ${sharedPermissions.role}`);
                }
              }
            } else {
              // No specific page, check if user owns any venue pages or has shared access
              hasAccess = ownedPages.venues.length > 0;
              
              if (!hasAccess) {
                // Check if user has shared access to any venue pages
                const sharedContent = await ContentSharingSecurity.getUserSharedContent(user.uid);
                hasAccess = sharedContent.venues.length > 0;
              }
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
            // User doesn't own any pages of this type
            console.log(`🚫 Access denied: User doesn't own any ${allowedRole} pages`);
            
            // Show notification about lack of pages
            setShowNotification({ currentRole: 'user', attemptedRole: allowedRole });
            
            // Redirect to their profile page after a brief delay
            setTimeout(() => {
              router.push('/profile');
            }, 1000);
            return;
          }
        } catch (error) {
          console.error('Error in RoleGuard:', error);
          router.push('/login');
        } finally {
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    };

    checkRoleAccess();
  }, [allowedRole, router, pathname, redirectPath]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Verifying access...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <>
        {showNotification && (
          <RoleGuardNotification 
            currentRole={showNotification.currentRole}
            attemptedRole={showNotification.attemptedRole}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default RoleGuard; 