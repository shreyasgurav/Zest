import { User, getAuth } from "firebase/auth";

export interface UserData {
  uid: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  contactEmail?: string;
  photo?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  providers: {
    google?: boolean;
    phone?: boolean;
    email?: boolean;
  };
}

export type AuthProvider = 'google' | 'phone' | 'email';

export async function linkAccountsIfNeeded(user: User, provider: AuthProvider): Promise<UserData | null> {
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firebaseUid: user.uid,
        email: user.email,
        phone: user.phoneNumber,
        name: user.displayName,
        photo: user.photoURL
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    console.error("Error linking accounts:", error);
    return null;
  }
}

export async function createUserDocument(
  user: User, 
  provider: AuthProvider, 
  additionalData: Partial<UserData> = {}
): Promise<UserData> {
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        firebaseUid: user.uid,
        email: additionalData.email || user.email,
        phone: additionalData.phone || user.phoneNumber,
        name: additionalData.name || user.displayName,
        photo: additionalData.photo || user.photoURL
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    throw new Error('Failed to create user document');
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
}

export async function linkExistingTicketsToUser(userId: string, phoneNumber: string): Promise<void> {
  return Promise.resolve();
}

export async function updateUserProvider(
  user: User, 
  provider: AuthProvider, 
  currentProviders: UserData['providers']
): Promise<UserData> {
  return createUserDocument(user, provider, {});
}

export async function updateUserProviders(
  userId: string, 
  provider: AuthProvider, 
  additionalData: Partial<UserData> = {}
): Promise<UserData | null> {
  // Mock return, backend sync handles this
  return null;
}

export async function handleAuthenticationFlow(
  user: User, 
  provider: AuthProvider, 
  additionalData: Partial<UserData> = {}
): Promise<{ userData: UserData; navigationPath: string }> {
  let userData = await linkAccountsIfNeeded(user, provider);
  if (userData) {
    return { userData, navigationPath: userData.username ? '/profile' : '/' };
  }
  userData = await createUserDocument(user, provider, additionalData);
  return { userData, navigationPath: '/' };
}

export async function checkGlobalUsernameAvailability(
  username: string,
  excludeUserId?: string,
  excludePageId?: string,
  excludePageType?: 'artist' | 'organisation' | 'venue'
): Promise<{ available: boolean; takenBy?: string }> {
  try {
    const res = await fetch(`/api/users/check-handle?handle=${username}`);
    const data = await res.json();
    return data;
  } catch (error) {
    return { available: false, takenBy: 'error' };
  }
}

export async function getUserByEmail(email: string): Promise<UserData | null> {
  return null;
}

export async function getUserByPhone(phone: string): Promise<UserData | null> {
  return null;
}

// Organizations
export interface OrganizationData {
  uid: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  isActive?: boolean;
  role?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  settings?: any;
}

export async function createOrganizationDocument(user: User, additionalData: Partial<OrganizationData> = {}): Promise<OrganizationData> {
  const token = await user.getIdToken();
  const res = await fetch('/api/users/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'organisation', ...additionalData })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create organization page');
  return { ...data.page, uid: data.page.id, username: data.username };
}
export async function getOrganizationByPhone(phone: string): Promise<OrganizationData | null> {
  return null;
}
export async function handleOrganizationAuthenticationFlow(user: User, additionalData: Partial<OrganizationData> = {}): Promise<{ organizationData: OrganizationData; navigationPath: string }> {
  return { organizationData: {} as OrganizationData, navigationPath: '/organisation' };
}
export function isOrganizationSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('organizationLogin') === 'true';
}
export function clearOrganizationSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('organizationLogin');
}

// Artists
export interface ArtistData {
  uid: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  isActive?: boolean;
  role?: string;
  genre?: string;
  location?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  settings?: any;
}

export async function createArtistDocument(user: User, additionalData: Partial<ArtistData> = {}): Promise<ArtistData> {
  const token = await user.getIdToken();
  const res = await fetch('/api/users/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'artist', ...additionalData })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create artist page');
  return { ...data.page, uid: data.page.id, username: data.username };
}
export async function handleArtistAuthenticationFlow(user: User, additionalData: Partial<ArtistData> = {}): Promise<{ artistData: ArtistData; navigationPath: string }> {
  return { artistData: {} as ArtistData, navigationPath: '/artist' };
}
export function isArtistSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('artistLogin') === 'true';
}
export function clearArtistSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('artistLogin');
}

// Venues
export interface VenueData {
  uid: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  isActive?: boolean;
  role?: string;
  address?: string;
  city?: string;
  capacity?: number;
  venueType?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  settings?: any;
}

export async function createVenueDocument(user: User, additionalData: Partial<VenueData> = {}): Promise<VenueData> {
  const token = await user.getIdToken();
  const res = await fetch('/api/users/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'venue', ...additionalData })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create venue page');
  return { ...data.page, uid: data.page.id, username: data.username };
}
export async function handleVenueAuthenticationFlow(user: User, additionalData: Partial<VenueData> = {}): Promise<{ venueData: VenueData; navigationPath: string }> {
  return { venueData: {} as VenueData, navigationPath: '/venue' };
}
export function isVenueSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('venueLogin') === 'true';
}
export function clearVenueSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('venueLogin');
}

export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('userLogin');
  sessionStorage.removeItem('organizationLogin');
  sessionStorage.removeItem('artistLogin');
  sessionStorage.removeItem('venueLogin');
  sessionStorage.removeItem('roleSelectionCompleted');
}

export function getCurrentRole(): string | null {
  if (typeof window === 'undefined') return null;
  if (isOrganizationSession()) return 'organization';
  if (isArtistSession()) return 'artist';
  if (isVenueSession()) return 'venue';
  const authType = sessionStorage.getItem('authType');
  if (authType === 'user' || (!authType && sessionStorage.getItem('userLogin'))) {
    return 'user';
  }
  return null;
}

export async function getUserOwnedPages(userId: string): Promise<{ artists: ArtistData[]; organizations: OrganizationData[]; venues: VenueData[]; }> {
  try {
    const user = getAuth().currentUser;
    if (!user) return { artists: [], organizations: [], venues: [] };
    
    const token = await user.getIdToken();
    const res = await fetch('/api/users/pages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) return { artists: [], organizations: [], venues: [] };
    
    const data = await res.json();
    console.log("getUserOwnedPages response:", data);
    
    const pages = data.pages || [];
    console.log("getUserOwnedPages pages array:", pages);
    
    return {
      artists: pages.filter((p: any) => p.type === 'ARTIST').map((p: any) => ({
        uid: p.id,
        name: p.name,
        username: p.handle?.value,
        ownerId: p.ownerId,
        bio: p.bio,
        photoURL: p.photo,
        location: p.city
      })),
      organizations: pages.filter((p: any) => p.type === 'ORGANISATION').map((p: any) => ({
        uid: p.id,
        name: p.name,
        username: p.handle?.value,
        ownerId: p.ownerId,
        bio: p.bio,
        photoURL: p.photo
      })),
      venues: pages.filter((p: any) => p.type === 'VENUE').map((p: any) => ({
        uid: p.id,
        name: p.name,
        username: p.handle?.value,
        ownerId: p.ownerId,
        bio: p.bio,
        photoURL: p.photo,
        city: p.city,
        address: p.address
      }))
    };
  } catch (error) {
    return { artists: [], organizations: [], venues: [] };
  }
}

export async function checkPageOwnership(userId: string, pageType: 'artist' | 'organization' | 'venue', pageId: string): Promise<boolean> {
  return false;
}

export function isProfileComplete(userData: any): boolean {
  if (!userData) return false;
  return !!(userData.name && (userData.username || userData.handle));
}

export function getMissingProfileFields(userData: any): string[] {
  const missing: string[] = [];
  if (!userData?.name) missing.push('name');
  if (!userData?.username && !userData?.handle) missing.push('username');
  return missing;
}

export function getProfileCompletionStatus(userData: any): { isComplete: boolean; missingFields: string[]; completionPercentage: number; } {
  const missingFields = getMissingProfileFields(userData);
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage: missingFields.length === 0 ? 100 : 50
  };
}