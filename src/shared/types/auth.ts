import { BaseEntity, OwnedEntity, Settings, ContactInfo } from './common';

// Core authentication types
export type AuthProvider = 'google' | 'phone' | 'email';

export interface AuthProviders {
  google?: boolean;
  phone?: boolean;
  email?: boolean;
}

export interface UserData extends BaseEntity {
  uid: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  contactEmail?: string;
  photo?: string;
  bio?: string;
  providers: AuthProviders;
  linkedTickets?: string[];
  ticketsLinkedFromPhone?: boolean;
  ticketsLinkedAt?: string;
  linkedToAccount?: boolean;
  linkedAt?: string;
}

// Profile types for different entities
export interface ArtistData extends OwnedEntity {
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
  settings?: Settings;
  contactInfo?: ContactInfo;
  verified?: boolean;
  followers?: number;
  following?: number;
}

export interface OrganizationData extends OwnedEntity {
  uid: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  isActive?: boolean;
  role?: string;
  website?: string;
  location?: string;
  organizationType?: 'company' | 'nonprofit' | 'government' | 'other';
  settings?: Settings;
  contactInfo?: ContactInfo;
  verified?: boolean;
  employees?: number;
}

export interface VenueData extends OwnedEntity {
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
  venueType?: 'indoor' | 'outdoor' | 'mixed';
  amenities?: string[];
  settings?: Settings;
  contactInfo?: ContactInfo;
  verified?: boolean;
  rating?: number;
}

// Authentication session types
export interface AuthSession {
  user: UserData | null;
  currentRole: 'user' | 'artist' | 'organization' | 'venue' | null;
  currentPageId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Authentication flow types
export interface AuthFlowResult {
  userData: UserData;
  navigationPath: string;
}

export interface ArtistFlowResult {
  artistData: ArtistData;
  navigationPath: string;
}

export interface OrganizationFlowResult {
  organizationData: OrganizationData;
  navigationPath: string;
}

export interface VenueFlowResult {
  venueData: VenueData;
  navigationPath: string;
}

// Permission and ownership types
export interface UserOwnedPages {
  artists: ArtistData[];
  organizations: OrganizationData[];
  venues: VenueData[];
}

export interface PageOwnership {
  pageType: 'artist' | 'organization' | 'venue';
  pageId: string;
  ownerId: string;
  permissions: string[];
}

// Username availability
export interface UsernameAvailability {
  available: boolean;
  takenBy?: 'user' | 'artist' | 'organisation' | 'venue' | 'error' | 'invalid';
}

// Account linking
export interface AccountLinkingResult {
  linked: boolean;
  userData?: UserData;
  message?: string;
}

// Authentication errors
export type AuthErrorCode = 
  | 'generic'
  | 'invalid-credentials'
  | 'user-not-found'
  | 'email-already-in-use'
  | 'phone-already-in-use'
  | 'username-taken'
  | 'account-linking-failed'
  | 'session-expired'
  | 'insufficient-permissions'
  | 'profile-incomplete'
  | 'account-disabled'
  | 'weak-password'
  | 'too-many-requests'
  | 'network-error'
  | 'popup-closed'
  | 'popup-cancelled'
  | 'invalid-verification-code'
  | 'invalid-verification-id'
  | 'missing-verification-code'
  | 'missing-verification-id';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, any>;
}

// Phone authentication
export interface PhoneAuthData {
  phoneNumber: string;
  verificationCode?: string;
  verificationId?: string;
}

// Social authentication
export interface SocialAuthData {
  provider: 'google' | 'facebook' | 'twitter';
  accessToken?: string;
  idToken?: string;
} 