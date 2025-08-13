/**
 * Authentication Debug Utility
 * Use these functions in development to diagnose authentication and profile issues
 */

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/infrastructure/firebase';
import { getUserOwnedPages } from '@/domains/authentication/services/auth.service';

export interface AuthDebugInfo {
  isAuthenticated: boolean;
  user: {
    uid: string;
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
  } | null;
  userProfile: {
    exists: boolean;
    data: any;
    isComplete: boolean;
    missingFields: string[];
  };
  ownedPages: {
    artists: any[];
    organizations: any[];
    venues: any[];
  };
  sessionStorage: {
    authType: string | null;
    organizationLogin: string | null;
  };
}

/**
 * Get comprehensive authentication debug information
 */
export async function getAuthDebugInfo(): Promise<AuthDebugInfo> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth(), async (user) => {
      try {
        const debugInfo: AuthDebugInfo = {
          isAuthenticated: !!user,
          user: user ? {
            uid: user.uid,
            email: user.email,
            phoneNumber: user.phoneNumber,
            displayName: user.displayName
          } : null,
          userProfile: {
            exists: false,
            data: null,
            isComplete: false,
            missingFields: []
          },
          ownedPages: {
            artists: [],
            organizations: [],
            venues: []
          },
          sessionStorage: {
            authType: typeof window !== 'undefined' ? sessionStorage.getItem('authType') : null,
            organizationLogin: typeof window !== 'undefined' ? sessionStorage.getItem('organizationLogin') : null
          }
        };

        if (user) {
          // Get user profile
          const userDoc = await getDoc(doc(db(), "Users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            debugInfo.userProfile.exists = true;
            debugInfo.userProfile.data = userData;

            // Check profile completion
            const requiredFields = ['name', 'username', 'phone', 'contactEmail'];
            const missingFields = requiredFields.filter(field => !userData[field]);
            
            debugInfo.userProfile.isComplete = missingFields.length === 0;
            debugInfo.userProfile.missingFields = missingFields;
          }

          // Get owned pages
          try {
            debugInfo.ownedPages = await getUserOwnedPages(user.uid);
          } catch (error) {
            console.error('Error fetching owned pages:', error);
          }
        }

        unsubscribe();
        resolve(debugInfo);
      } catch (error) {
        console.error('Error getting auth debug info:', error);
        unsubscribe();
        resolve({
          isAuthenticated: false,
          user: null,
          userProfile: { exists: false, data: null, isComplete: false, missingFields: [] },
          ownedPages: { artists: [], organizations: [], venues: [] },
          sessionStorage: { authType: null, organizationLogin: null }
        });
      }
    });
  });
}

/**
 * Print authentication debug information to console
 */
export async function debugAuthState(): Promise<void> {
  console.group('🔍 Authentication Debug Information');
  
  const debugInfo = await getAuthDebugInfo();
  
  console.log('🔐 Authentication Status:', debugInfo.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated');
  
  if (debugInfo.user) {
    console.group('👤 User Information');
    console.log('UID:', debugInfo.user.uid);
    console.log('Email:', debugInfo.user.email || 'Not provided');
    console.log('Phone:', debugInfo.user.phoneNumber || 'Not provided');
    console.log('Display Name:', debugInfo.user.displayName || 'Not provided');
    console.groupEnd();
  }

  console.group('📋 Profile Information');
  console.log('Profile Exists:', debugInfo.userProfile.exists ? '✅ Yes' : '❌ No');
  console.log('Profile Complete:', debugInfo.userProfile.isComplete ? '✅ Complete' : '❌ Incomplete');
  
  if (debugInfo.userProfile.missingFields.length > 0) {
    console.log('Missing Fields:', debugInfo.userProfile.missingFields);
  }
  
  if (debugInfo.userProfile.data) {
    console.log('Profile Data:', debugInfo.userProfile.data);
  }
  console.groupEnd();

  console.group('🏢 Owned Pages');
  console.log('Artists:', debugInfo.ownedPages.artists.length, debugInfo.ownedPages.artists);
  console.log('Organizations:', debugInfo.ownedPages.organizations.length, debugInfo.ownedPages.organizations);
  console.log('Venues:', debugInfo.ownedPages.venues.length, debugInfo.ownedPages.venues);
  console.groupEnd();

  console.group('💾 Session Storage');
  console.log('Auth Type:', debugInfo.sessionStorage.authType || 'Not set');
  console.log('Organization Login:', debugInfo.sessionStorage.organizationLogin || 'Not set');
  console.groupEnd();

  console.groupEnd();
}

/**
 * Check if user should be able to access a specific role area
 */
export async function debugRoleAccess(role: 'user' | 'organization' | 'artist' | 'venue', pageId?: string): Promise<void> {
  console.group(`🔒 Role Access Debug: ${role.toUpperCase()}`);
  
  const debugInfo = await getAuthDebugInfo();
  
  if (!debugInfo.isAuthenticated) {
    console.log('❌ Access Denied: User not authenticated');
    console.groupEnd();
    return;
  }

  if (role === 'user') {
    console.log('✅ Access Granted: User role only requires authentication');
    console.groupEnd();
    return;
  }

  const ownedPages = debugInfo.ownedPages[role === 'organization' ? 'organizations' : role === 'artist' ? 'artists' : 'venues'];
  
  if (pageId) {
    const hasSpecificAccess = ownedPages.some((page: any) => page.uid === pageId);
    console.log(`Page ID: ${pageId}`);
    console.log(`Specific Page Access: ${hasSpecificAccess ? '✅ Granted' : '❌ Denied'}`);
    
    if (!hasSpecificAccess) {
      console.log('User does not own this specific page');
      console.log('Owned pages of this type:', ownedPages.map((p: any) => p.uid));
    }
  } else {
    console.log(`General ${role} area access: ${ownedPages.length > 0 ? '✅ Granted' : '❌ Denied'}`);
    console.log(`Owned ${role} pages:`, ownedPages.length);
    
    if (ownedPages.length === 0) {
      console.log(`User needs to create a ${role} page to access this area`);
    }
  }
  
  console.groupEnd();
}

/**
 * Simulate profile completion check
 */
export async function debugProfileCompletion(): Promise<void> {
  console.group('📋 Profile Completion Debug');
  
  const debugInfo = await getAuthDebugInfo();
  
  if (!debugInfo.isAuthenticated) {
    console.log('❌ User not authenticated');
    console.groupEnd();
    return;
  }

  if (!debugInfo.userProfile.exists) {
    console.log('❌ User profile document does not exist');
    console.log('User needs to complete profile creation');
    console.groupEnd();
    return;
  }

  console.log('Required Fields: name, username, phone, contactEmail');
  console.log('Profile Status:', debugInfo.userProfile.isComplete ? '✅ Complete' : '❌ Incomplete');
  
  if (!debugInfo.userProfile.isComplete) {
    console.log('Missing Fields:', debugInfo.userProfile.missingFields);
    console.log('Action Required: User should be redirected to login page to complete profile');
  } else {
    console.log('✅ Profile is complete, user can access protected pages');
  }
  
  console.groupEnd();
}

/**
 * Debug booking flow requirements
 */
export async function debugBookingRequirements(): Promise<void> {
  console.group('🎫 Booking Flow Debug');
  
  const debugInfo = await getAuthDebugInfo();
  
  if (!debugInfo.isAuthenticated || !debugInfo.userProfile.exists) {
    console.log('❌ Cannot book: User not authenticated or profile missing');
    console.groupEnd();
    return;
  }

  const userData = debugInfo.userProfile.data;
  const bookingRequiredFields = ['name', 'email', 'phone'];
  const availableFields = bookingRequiredFields.filter(field => userData[field]);
  const missingBookingFields = bookingRequiredFields.filter(field => !userData[field]);

  console.log('Booking Required Fields:', bookingRequiredFields);
  console.log('Available Fields:', availableFields);
  
  if (missingBookingFields.length === 0) {
    console.log('✅ All booking fields available');
    console.log('User can proceed with booking');
  } else {
    console.log('❌ Missing Booking Fields:', missingBookingFields);
    console.log('Note: contactEmail should be copied to email field during profile creation');
  }
  
  console.log('User Data for Booking:');
  console.log('- Name:', userData.name || 'Missing');
  console.log('- Email:', userData.email || 'Missing');
  console.log('- Phone:', userData.phone || 'Missing');
  console.log('- Contact Email:', userData.contactEmail || 'Missing');
  
  console.groupEnd();
}

// Export a global debug function for easy console access
if (typeof window !== 'undefined') {
  (window as any).debugAuth = {
    getInfo: getAuthDebugInfo,
    logState: debugAuthState,
    checkRole: debugRoleAccess,
    checkProfile: debugProfileCompletion,
    checkBooking: debugBookingRequirements
  };
  
  console.log('🔍 Auth debugger available at window.debugAuth');
  console.log('Usage:');
  console.log('- window.debugAuth.logState() - Full auth state');
  console.log('- window.debugAuth.checkRole("artist") - Check role access');
  console.log('- window.debugAuth.checkProfile() - Check profile completion');
  console.log('- window.debugAuth.checkBooking() - Check booking requirements');
} 