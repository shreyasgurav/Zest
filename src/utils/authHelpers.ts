import { User } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface UserData {
  uid: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
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
          collection(db, "Users"),
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
          collection(db, "Users"),
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

        await setDoc(doc(db, "Users", user.uid), updatedData, { merge: true });
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
      await setDoc(doc(db, "Users", existingUserId), mergedData, { merge: true });

      // If the current user UID is different, we need to create a new document
      // with the existing data but new UID (Firebase auth will have created a new user)
      if (existingUserId !== user.uid) {
        await setDoc(doc(db, "Users", user.uid), {
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
 * Creates a new user document with the provided data
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

  await setDoc(doc(db, "Users", user.uid), userData);
  return userData;
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
    const userRef = doc(db, "Users", userId);
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
    const userDoc = await getDoc(doc(db, "Users", user.uid));

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
 * Gets user data by email for account linking
 * @param email - Email address to search for
 * @returns UserData if found, null if not found
 */
export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    const userQuery = query(
      collection(db, "Users"),
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
      collection(db, "Users"),
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