import { User } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/infrastructure/firebase";

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

/**
 * Links accounts if a user exists with matching email or phone number
 * @param user - Firebase Auth user
 * @param provider - The authentication provider being used
 * @returns UserData if account was linked, null if no account to link
 */
export async function linkAccountsIfNeeded(user: User, provider: AuthProvider): Promise<UserData | null> {
  try {
    let existingUserQuery;
    let searchField;
    let searchValue;

    // Determine what to search for based on provider and available data
    if (provider === 'email' || provider === 'google') {
      if (user.email) {
        searchField = 'email';
        searchValue = user.email.toLowerCase();
        existingUserQuery = query(
          collection(db(), "Users"),
          where("email", "==", searchValue)
        );
      } else {
        return null;
      }
    } else if (provider === 'phone') {
      if (user.phoneNumber) {
        searchField = 'phone';
        searchValue = user.phoneNumber;
        existingUserQuery = query(
          collection(db(), "Users"),
          where("phone", "==", searchValue)
        );
      } else {
        return null;
      }
    } else {
      return null;
    }

    const existingUserSnap = await getDocs(existingUserQuery);

    if (!existingUserSnap.empty) {
      // Found an existing user with matching email/phone
      const existingDoc = existingUserSnap.docs[0];
      const existingData = existingDoc.data() as UserData;
      const existingUserId = existingDoc.id;

      // If it's the same user, just update providers
      if (existingUserId === user.uid) {
        const updatedData = {
          ...existingData,
          providers: {
            ...(existingData.providers || {}),
            [provider]: true
          },
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db(), "Users", user.uid), updatedData, { merge: true });
        return updatedData;
      }

      // Different user ID - need to merge accounts
      // We'll keep the existing account and update its auth info
      const mergedData: UserData = {
        ...existingData,
        // Update with new auth data
        email: user.email?.toLowerCase() || existingData.email,
        phone: user.phoneNumber || existingData.phone,
        photo: user.photoURL || existingData.photo,
        name: user.displayName || existingData.name,
        providers: {
          ...(existingData.providers || {}),
          [provider]: true
        },
        updatedAt: new Date().toISOString()
      };

      // Update the existing user document
      await setDoc(doc(db(), "Users", existingUserId), mergedData, { merge: true });

      // If the current user UID is different, we need to create a new document
      // with the existing data but new UID (Firebase auth will have created a new user)
      if (existingUserId !== user.uid) {
        await setDoc(doc(db(), "Users", user.uid), {
          ...mergedData,
          uid: user.uid
        });
      }

      return mergedData;
    }

    return null;
  } catch (error) {
    console.error("Error linking accounts:", error);
    return null;
  }
}

/**
 * Creates a new user document with the provided data and links existing tickets
 * @param user - Firebase Auth user
 * @param provider - The authentication provider used
 * @param additionalData - Any additional data to include
 * @returns UserData object
 */
export async function createUserDocument(
  user: User, 
  provider: AuthProvider, 
  additionalData: Partial<UserData> = {}
): Promise<UserData> {
  const userData: UserData = {
    uid: user.uid,
    email: user.email?.toLowerCase() || additionalData.email,
    phone: user.phoneNumber || additionalData.phone,
    name: user.displayName || additionalData.name || "",
    photo: user.photoURL || additionalData.photo,
    username: additionalData.username || "",
    bio: additionalData.bio || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    providers: {
      [provider]: true
    }
  };

  // Create user document
  await setDoc(doc(db(), "Users", user.uid), userData);

  // Link existing tickets if user has a phone number
  if (userData.phone) {
    await linkExistingTicketsToUser(user.uid, userData.phone);
  }

  return userData;
}

/**
 * Links existing tickets associated with a phone number to a user account
 * @param userId - The user's UID
 * @param phoneNumber - The phone number to search for
 */
export async function linkExistingTicketsToUser(userId: string, phoneNumber: string): Promise<void> {
  try {
    console.log(`Linking existing tickets for phone ${phoneNumber} to user ${userId}`);

    // Find tickets associated with this phone number but no userId
    const ticketsQuery = query(
      collection(db(), "tickets"),
      where("phoneForFutureLink", "==", phoneNumber)
    );
    const ticketsSnapshot = await getDocs(ticketsQuery);

    // Find attendees associated with this phone number but no userId
    const attendeesQuery = query(
      collection(db(), "eventAttendees"),
      where("phoneForFutureLink", "==", phoneNumber)
    );
    const attendeesSnapshot = await getDocs(attendeesQuery);

    const batch = [];
    let linkedTicketsCount = 0;
    let linkedAttendeesCount = 0;

    // Update tickets
    for (const ticketDoc of ticketsSnapshot.docs) {
      const ticketData = ticketDoc.data();
      console.log(`Linking ticket ${ticketDoc.id} to user ${userId}`);
      
      batch.push(
        updateDoc(ticketDoc.ref, {
          userId: userId,
          phoneForFutureLink: null, // Clear the temporary field
          linkedToAccount: true,
          linkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );
      linkedTicketsCount++;
    }

    // Update attendees
    for (const attendeeDoc of attendeesSnapshot.docs) {
      const attendeeData = attendeeDoc.data();
      console.log(`Linking attendee ${attendeeDoc.id} to user ${userId}`);
      
      batch.push(
        updateDoc(attendeeDoc.ref, {
          userId: userId,
          phoneForFutureLink: null, // Clear the temporary field
          linkedToAccount: true,
          linkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );
      linkedAttendeesCount++;
    }

    // Execute all updates
    await Promise.all(batch);

    if (linkedTicketsCount > 0 || linkedAttendeesCount > 0) {
      console.log(`Successfully linked ${linkedTicketsCount} tickets and ${linkedAttendeesCount} attendee records to user ${userId}`);
      
      // Update user document with linked ticket IDs
      const linkedTicketIds = ticketsSnapshot.docs.map(doc => doc.id);
      if (linkedTicketIds.length > 0) {
        await updateDoc(doc(db(), "Users", userId), {
          linkedTickets: linkedTicketIds,
          ticketsLinkedFromPhone: true,
          ticketsLinkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      console.log(`No existing tickets found for phone ${phoneNumber}`);
    }
  } catch (error) {
    console.error("Error linking existing tickets to user:", error);
    // Don't throw error as this is not critical for account creation
  }
}

/**
 * Updates an existing user document with new provider information
 * @param userId - User ID
 * @param provider - The authentication provider being added
 * @param additionalData - Any additional data to merge
 * @returns Updated UserData object
 */
export async function updateUserProviders(
  userId: string, 
  provider: AuthProvider, 
  additionalData: Partial<UserData> = {}
): Promise<UserData | null> {
  try {
    const userRef = doc(db(), "Users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const existingData = userSnap.data() as UserData;
    const updatedData: UserData = {
      ...existingData,
      ...additionalData,
      providers: {
        ...(existingData.providers || {}),
        [provider]: true
      },
      updatedAt: new Date().toISOString()
    };

    await setDoc(userRef, updatedData, { merge: true });
    return updatedData;
  } catch (error) {
    console.error("Error updating user providers:", error);
    return null;
  }
}

/**
 * Handles the complete authentication flow for any provider
 * @param user - Firebase Auth user
 * @param provider - The authentication provider used
 * @param additionalData - Any additional data (like phone number for phone auth)
 * @returns UserData and navigation path
 */
export async function handleAuthenticationFlow(
  user: User, 
  provider: AuthProvider, 
  additionalData: Partial<UserData> = {}
): Promise<{ userData: UserData; navigationPath: string }> {
  try {
    console.log(`🔵 Starting authentication flow for ${provider} provider`, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber
    });

    // First, try to link with existing accounts
    console.log("🔵 Checking for existing accounts to link...");
    let userData = await linkAccountsIfNeeded(user, provider);

    if (userData) {
      // Account was linked
      console.log("🟢 Account linking successful!", {
        linkedProviders: Object.keys(userData.providers || {}),
        hasUsername: !!userData.username
      });
      const navigationPath = userData.username ? '/profile' : '/';
      return { userData, navigationPath };
    }

    console.log("🔵 No existing accounts found to link, checking for existing user document...");
    // Check if user document already exists
    const userDoc = await getDoc(doc(db(), "Users", user.uid));

    if (userDoc.exists()) {
      // User exists, update providers
      console.log("🔵 User document exists, updating providers...");
      userData = await updateUserProviders(user.uid, provider, additionalData);
      if (!userData) {
        throw new Error("Failed to update user providers");
      }
      
      console.log("🟢 User providers updated successfully!", {
        providers: Object.keys(userData.providers || {}),
        hasUsername: !!userData.username
      });
      
      const navigationPath = userData.username ? '/profile' : '/';
      return { userData, navigationPath };
    } else {
      // Create new user
      console.log("🔵 Creating new user document...");
      userData = await createUserDocument(user, provider, additionalData);
      
      console.log("🟢 New user document created successfully!", {
        uid: userData.uid,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        providers: Object.keys(userData.providers || {})
      });
      
      return { userData, navigationPath: '/' };
    }
  } catch (error) {
    console.error("🔴 Error in authentication flow:", error);
    console.error("🔴 Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      provider,
      additionalData
    });
    throw error;
  }
}

/**
 * Checks if a username is available across ALL user types (global uniqueness)
 * @param username - Username to check
 * @param excludeUserId - User ID to exclude from the check (for current user updates)
 * @param excludePageId - Page ID to exclude from the check (for current page updates)
 * @param excludePageType - Page type to exclude ('artist' | 'organisation' | 'venue')
 * @returns boolean - true if username is available, false if taken
 */
export async function checkGlobalUsernameAvailability(
  username: string,
  excludeUserId?: string,
  excludePageId?: string,
  excludePageType?: 'artist' | 'organisation' | 'venue'
): Promise<{ available: boolean; takenBy?: string }> {
  if (!username || username.length < 3) {
    return { available: false, takenBy: 'invalid' };
  }

  const normalizedUsername = username.toLowerCase().trim();

  try {
    // Check all collections in parallel
    const [usersQuery, artistsQuery, organisationsQuery, venuesQuery] = await Promise.all([
      getDocs(query(collection(db(), "Users"), where("username", "==", normalizedUsername))),
      getDocs(query(collection(db(), "Artists"), where("username", "==", normalizedUsername))),
      getDocs(query(collection(db(), "Organisations"), where("username", "==", normalizedUsername))),
      getDocs(query(collection(db(), "Venues"), where("username", "==", normalizedUsername)))
    ]);

    // Check Users collection
    if (!usersQuery.empty) {
      const userDoc = usersQuery.docs[0];
      if (!excludeUserId || userDoc.id !== excludeUserId) {
        return { available: false, takenBy: 'user' };
      }
    }

    // Check Artists collection
    if (!artistsQuery.empty) {
      const artistDoc = artistsQuery.docs[0];
      if (!excludePageId || artistDoc.id !== excludePageId || excludePageType !== 'artist') {
        return { available: false, takenBy: 'artist' };
      }
    }

    // Check Organisations collection
    if (!organisationsQuery.empty) {
      const orgDoc = organisationsQuery.docs[0];
      if (!excludePageId || orgDoc.id !== excludePageId || excludePageType !== 'organisation') {
        return { available: false, takenBy: 'organisation' };
      }
    }

    // Check Venues collection
    if (!venuesQuery.empty) {
      const venueDoc = venuesQuery.docs[0];
      if (!excludePageId || venueDoc.id !== excludePageId || excludePageType !== 'venue') {
        return { available: false, takenBy: 'venue' };
      }
    }

    return { available: true };
  } catch (error) {
    console.error("Error checking global username availability:", error);
    return { available: false, takenBy: 'error' };
  }
}

/**
 * Gets user data by email for account linking
 * @param email - Email address to search for
 * @returns UserData if found, null if not found
 */
export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    const userQuery = query(
      collection(db(), "Users"),
      where("email", "==", email.toLowerCase())
    );
    const userSnap = await getDocs(userQuery);

    if (!userSnap.empty) {
      return userSnap.docs[0].data() as UserData;
    }

    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

/**
 * Gets user data by phone number for account linking
 * @param phone - Phone number to search for
 * @returns UserData if found, null if not found
 */
export async function getUserByPhone(phone: string): Promise<UserData | null> {
  try {
    const userQuery = query(
      collection(db(), "Users"),
      where("phone", "==", phone)
    );
    const userSnap = await getDocs(userQuery);

    if (!userSnap.empty) {
      return userSnap.docs[0].data() as UserData;
    }

    return null;
  } catch (error) {
    console.error("Error getting user by phone:", error);
    return null;
  }
}

// Organization-specific types and interfaces
export interface OrganizationData {
  uid: string; // This will be a unique page ID, not user ID
  name?: string;
  username?: string;
  phoneNumber?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  isActive?: boolean;
  role?: string;
  ownerId: string; // User ID of the person who created/owns this page
  createdAt: string;
  updatedAt: string;
  settings?: {
    notifications?: boolean;
    emailUpdates?: boolean;
    privacy?: {
      profileVisibility?: string;
      contactVisibility?: string;
    };
  };
}

/**
 * Creates a new organization document with the provided data
 * @param user - Firebase Auth user
 * @param additionalData - Any additional data to include
 * @returns OrganizationData object
 */
export async function createOrganizationDocument(
  user: User, 
  additionalData: Partial<OrganizationData> = {}
): Promise<OrganizationData> {
  // Generate unique page ID or use provided one
  const pageId = additionalData.uid || `org_${user.uid}_${Date.now()}`;
  
  const organizationData: OrganizationData = {
    uid: pageId,
    ownerId: user.uid, // The user who creates this page becomes the owner
    phoneNumber: user.phoneNumber || additionalData.phoneNumber || "",
    name: additionalData.name || "",
    username: additionalData.username || "",
    bio: additionalData.bio || "",
    photoURL: additionalData.photoURL || "",
    bannerImage: additionalData.bannerImage || "",
    isActive: true,
    role: "Organisation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      notifications: true,
      emailUpdates: false,
      privacy: {
        profileVisibility: "public",
        contactVisibility: "followers"
      }
    }
  };

  await setDoc(doc(db(), "Organisations", pageId), organizationData);
  return organizationData;
}

/**
 * Gets organization data by phone number
 * @param phone - Phone number to search for
 * @returns OrganizationData if found, null if not found
 */
export async function getOrganizationByPhone(phone: string): Promise<OrganizationData | null> {
  try {
    const orgQuery = query(
      collection(db(), "Organisations"),
      where("phoneNumber", "==", phone)
    );
    const orgSnap = await getDocs(orgQuery);

    if (!orgSnap.empty) {
      return orgSnap.docs[0].data() as OrganizationData;
    }

    return null;
  } catch (error) {
    console.error("Error getting organization by phone:", error);
    return null;
  }
}

/**
 * Handles the complete authentication flow for organization login
 * @param user - Firebase Auth user
 * @param additionalData - Any additional data (like phone number for phone auth)
 * @returns OrganizationData and navigation path
 */
export async function handleOrganizationAuthenticationFlow(
  user: User, 
  additionalData: Partial<OrganizationData> = {}
): Promise<{ organizationData: OrganizationData; navigationPath: string }> {
  try {
    console.log(`🟠 Starting organization authentication flow`, {
      uid: user.uid,
      phoneNumber: user.phoneNumber
    });

    // Mark this session as organization to prevent user post-login flows
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('authType', 'organization');
      sessionStorage.setItem('organizationLogin', 'true');
    }

    // Wait for auth token to be ready
    await user.getIdToken();

    // Check if organization document already exists for this user
    const orgDoc = await getDoc(doc(db(), "Organisations", user.uid));

    if (orgDoc.exists()) {
      // Organization exists, return existing data
      const organizationData = orgDoc.data() as OrganizationData;
      console.log("🟢 Organization document exists, using existing data!");
      
      const navigationPath = organizationData.username ? '/organisation' : '/organisation';
      return { organizationData, navigationPath };
    } else {
      // Create new organization document
      console.log("🟠 Creating new organization document...");
      const organizationData = await createOrganizationDocument(user, {
        phoneNumber: user.phoneNumber || additionalData.phoneNumber
      });
      
      console.log("🟢 New organization document created successfully!", {
        uid: organizationData.uid,
        phoneNumber: organizationData.phoneNumber,
        role: organizationData.role
      });
      
      return { organizationData, navigationPath: '/organisation' };
    }
  } catch (error) {
    console.error("🔴 Error in organization authentication flow:", error);
    console.error("🔴 Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user: {
        uid: user.uid,
        phoneNumber: user.phoneNumber
      },
      additionalData
    });
    throw error;
  }
}

/**
 * Checks if current session is an organization login
 * @returns boolean indicating if this is an organization session
 */
export function isOrganizationSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('organizationLogin') === 'true';
}

/**
 * Clears organization session markers (used on logout)
 */
export function clearOrganizationSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('organizationLogin');
}

// Artist-specific types and interfaces
export interface ArtistData {
  uid: string; // This will be a unique page ID, not user ID
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
  ownerId: string; // User ID of the person who created/owns this page
  createdAt: string;
  updatedAt: string;
  settings?: {
    notifications?: boolean;
    emailUpdates?: boolean;
    privacy?: {
      profileVisibility?: string;
      contactVisibility?: string;
    };
  };
}

/**
 * Creates a new artist document with the provided data
 * @param user - Firebase Auth user
 * @param additionalData - Any additional data to include
 * @returns ArtistData object
 */
export async function createArtistDocument(
  user: User, 
  additionalData: Partial<ArtistData> = {}
): Promise<ArtistData> {
  // Generate unique page ID or use provided one
  const pageId = additionalData.uid || `artist_${user.uid}_${Date.now()}`;
  
  const artistData: ArtistData = {
    uid: pageId,
    ownerId: user.uid, // The user who creates this page becomes the owner
    phoneNumber: user.phoneNumber || additionalData.phoneNumber || "",
    name: additionalData.name || "",
    username: additionalData.username || "",
    bio: additionalData.bio || "",
    photoURL: additionalData.photoURL || "",
    bannerImage: additionalData.bannerImage || "",
    genre: additionalData.genre || "",
    location: additionalData.location || "",
    isActive: true,
    role: "Artist",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      notifications: true,
      emailUpdates: false,
      privacy: {
        profileVisibility: "public",
        contactVisibility: "followers"
      }
    }
  };

  await setDoc(doc(db(), "Artists", pageId), artistData);
  return artistData;
}

/**
 * Handles the complete authentication flow for artist login (DEPRECATED - Use getUserOwnedPages instead)
 * @param user - Firebase Auth user
 * @param additionalData - Any additional data (like phone number for phone auth)
 * @returns ArtistData and navigation path
 */
export async function handleArtistAuthenticationFlow(
  user: User, 
  additionalData: Partial<ArtistData> = {}
): Promise<{ artistData: ArtistData; navigationPath: string }> {
  try {
    console.log(`🎵 Starting artist authentication flow (DEPRECATED)`, {
      uid: user.uid,
      phoneNumber: user.phoneNumber
    });

    // This function is deprecated in favor of the new ownership model
    // Check if user has any artist pages
    const ownedPages = await getUserOwnedPages(user.uid);
    
    if (ownedPages.artists.length > 0) {
      // Return the first artist page
      const artistData = ownedPages.artists[0];
      console.log("🟢 Found existing artist page!", artistData);
      return { artistData, navigationPath: '/artist' };
    } else {
      // No artist pages found, this should not happen in the new flow
      console.log("🎵 No artist pages found. User should create one through /business");
      throw new Error("No artist pages found. Please create an artist page first.");
    }
  } catch (error) {
    console.error("🔴 Error in artist authentication flow:", error);
    throw error;
  }
}

/**
 * Checks if current session is an artist login
 * @returns boolean indicating if this is an artist session
 */
export function isArtistSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('artistLogin') === 'true';
}

/**
 * Clears artist session markers (used on logout)
 */
export function clearArtistSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('artistLogin');
}

// Venue-specific types and interfaces
export interface VenueData {
  uid: string; // This will be a unique page ID, not user ID
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
  ownerId: string; // User ID of the person who created/owns this page
  createdAt: string;
  updatedAt: string;
  settings?: {
    notifications?: boolean;
    emailUpdates?: boolean;
    privacy?: {
      profileVisibility?: string;
      contactVisibility?: string;
    };
  };
}

/**
 * Creates a new venue document with the provided data
 * @param user - Firebase Auth user
 * @param additionalData - Any additional data to include
 * @returns VenueData object
 */
export async function createVenueDocument(
  user: User, 
  additionalData: Partial<VenueData> = {}
): Promise<VenueData> {
  // Generate unique page ID or use provided one
  const pageId = additionalData.uid || `venue_${user.uid}_${Date.now()}`;
  
  const venueData: VenueData = {
    uid: pageId,
    ownerId: user.uid, // The user who creates this page becomes the owner
    phoneNumber: user.phoneNumber || additionalData.phoneNumber || "",
    name: additionalData.name || "",
    username: additionalData.username || "",
    bio: additionalData.bio || "",
    photoURL: additionalData.photoURL || "",
    bannerImage: additionalData.bannerImage || "",
    address: additionalData.address || "",
    city: additionalData.city || "",
    capacity: additionalData.capacity || 0,
    venueType: additionalData.venueType || "",
    isActive: true,
    role: "Venue",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      notifications: true,
      emailUpdates: false,
      privacy: {
        profileVisibility: "public",
        contactVisibility: "followers"
      }
    }
  };

  await setDoc(doc(db(), "Venues", pageId), venueData);
  return venueData;
}

/**
 * Handles the complete authentication flow for venue login
 * @param user - Firebase Auth user
 * @param additionalData - Any additional data (like phone number for phone auth)
 * @returns VenueData and navigation path
 */
export async function handleVenueAuthenticationFlow(
  user: User, 
  additionalData: Partial<VenueData> = {}
): Promise<{ venueData: VenueData; navigationPath: string }> {
  try {
    console.log(`🏢 Starting venue authentication flow`, {
      uid: user.uid,
      phoneNumber: user.phoneNumber
    });

    // Mark this session as venue to prevent user post-login flows
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('authType', 'venue');
      sessionStorage.setItem('venueLogin', 'true');
    }

    // Wait for auth token to be ready
    await user.getIdToken();

    // Check if venue document already exists for this user
    const venueDoc = await getDoc(doc(db(), "Venues", user.uid));

    if (venueDoc.exists()) {
      // Venue exists, return existing data
      const venueData = venueDoc.data() as VenueData;
      console.log("🟢 Venue document exists, using existing data!");
      
      const navigationPath = venueData.username ? '/venue' : '/venue';
      return { venueData, navigationPath };
    } else {
      // Create new venue document
      console.log("🏢 Creating new venue document...");
      const venueData = await createVenueDocument(user, {
        phoneNumber: user.phoneNumber || additionalData.phoneNumber
      });
      
      console.log("🟢 New venue document created successfully!", {
        uid: venueData.uid,
        phoneNumber: venueData.phoneNumber,
        role: venueData.role
      });
      
      return { venueData, navigationPath: '/venue' };
    }
  } catch (error) {
    console.error("🔴 Error in venue authentication flow:", error);
    console.error("🔴 Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user: {
        uid: user.uid,
        phoneNumber: user.phoneNumber
      },
      additionalData
    });
    throw error;
  }
}

/**
 * Checks if current session is a venue login
 * @returns boolean indicating if this is a venue session
 */
export function isVenueSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('venueLogin') === 'true';
}

/**
 * Clears venue session markers (used on logout)
 */
export function clearVenueSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('venueLogin');
}

/**
 * Clears ALL session markers (used on logout or role conflicts)
 */
export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('authType');
  sessionStorage.removeItem('userLogin');
  sessionStorage.removeItem('organizationLogin');
  sessionStorage.removeItem('artistLogin');
  sessionStorage.removeItem('venueLogin');
  sessionStorage.removeItem('roleSelectionCompleted');
}

/**
 * Gets the current active role from session storage
 */
export function getCurrentRole(): string | null {
  if (typeof window === 'undefined') return null;
  
  if (isOrganizationSession()) return 'organization';
  if (isArtistSession()) return 'artist';
  if (isVenueSession()) return 'venue';
  
  // If no specific role session is set, assume user
  const authType = sessionStorage.getItem('authType');
  if (authType === 'user' || (!authType && sessionStorage.getItem('userLogin'))) {
    return 'user';
  }
  
  return null;
}

/**
 * Gets all pages owned by a user
 */
export async function getUserOwnedPages(userId: string): Promise<{
  artists: ArtistData[];
  organizations: OrganizationData[];
  venues: VenueData[];
}> {
  try {
    const [artistsQuery, orgsQuery, venuesQuery] = await Promise.all([
      getDocs(query(collection(db(), "Artists"), where("ownerId", "==", userId))),
      getDocs(query(collection(db(), "Organisations"), where("ownerId", "==", userId))),
      getDocs(query(collection(db(), "Venues"), where("ownerId", "==", userId)))
    ]);

    const artists = artistsQuery.docs.map(doc => doc.data() as ArtistData);
    const organizations = orgsQuery.docs.map(doc => doc.data() as OrganizationData);
    const venues = venuesQuery.docs.map(doc => doc.data() as VenueData);

    return { artists, organizations, venues };
  } catch (error) {
    console.error("Error fetching user owned pages:", error);
    return { artists: [], organizations: [], venues: [] };
  }
}

/**
 * Checks if user owns a specific page
 */
export async function checkPageOwnership(userId: string, pageType: 'artist' | 'organization' | 'venue', pageId: string): Promise<boolean> {
  try {
    let collection_name = "";
    switch (pageType) {
      case 'artist':
        collection_name = "Artists";
        break;
      case 'organization':
        collection_name = "Organisations";
        break;
      case 'venue':
        collection_name = "Venues";
        break;
    }

    const pageDoc = await getDoc(doc(db(), collection_name, pageId));
    if (pageDoc.exists()) {
      const pageData = pageDoc.data();
      return pageData.ownerId === userId;
    }
    return false;
  } catch (error) {
    console.error("Error checking page ownership:", error);
    return false;
  }
}

/**
 * Centralized profile completion check
 * This ensures consistent validation across the entire app
 */
export function isProfileComplete(userData: any): boolean {
  if (!userData) return false;
  
  // Required fields for complete user profile
  const requiredFields = ['name', 'username', 'contactEmail', 'phone'];
  
  return requiredFields.every(field => {
    const value = userData[field];
    return value && typeof value === 'string' && value.trim().length > 0;
  });
}

/**
 * Get missing profile fields for debugging
 */
export function getMissingProfileFields(userData: any): string[] {
  if (!userData) return ['name', 'username', 'contactEmail', 'phone'];
  
  const requiredFields = ['name', 'username', 'contactEmail', 'phone'];
  
  return requiredFields.filter(field => {
    const value = userData[field];
    return !value || typeof value !== 'string' || value.trim().length === 0;
  });
}

/**
 * Profile completion status with details
 */
export function getProfileCompletionStatus(userData: any): {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
} {
  const missingFields = getMissingProfileFields(userData);
  const totalFields = 4; // name, username, contactEmail, phone
  const completedFields = totalFields - missingFields.length;
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage: Math.round((completedFields / totalFields) * 100)
  };
} 