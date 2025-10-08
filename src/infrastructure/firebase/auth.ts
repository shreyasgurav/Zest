import { 
  getAuth,
  Auth,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential,
  unlink,
  Unsubscribe
} from 'firebase/auth';
import { getFirebaseApp } from './config';
import type { 
  AuthProvider, 
  UserData, 
  AuthSession, 
  PhoneAuthData, 
  SocialAuthData,
  AuthError,
  AuthErrorCode 
} from '@/shared/types/auth';

// Initialize Firebase Auth
let authInstance: Auth;

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
};

// Auth service class
export class AuthService {
  private auth: Auth;
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  constructor() {
    this.auth = getFirebaseAuth();
  }

  // Email/Password Authentication
  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Google Authentication
  async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(this.auth, provider);
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Phone Authentication
  async initializePhoneAuth(phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
    try {
      // Clear existing reCAPTCHA verifier
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
      }

      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, recaptchaContainerId, {
        'size': 'invisible',
        'callback': () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });

      const confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber, this.recaptchaVerifier);
      return confirmationResult;
    } catch (error: any) {
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }
      throw this.handleAuthError(error);
    }
  }

  async verifyPhoneNumber(confirmationResult: ConfirmationResult, verificationCode: string): Promise<User> {
    try {
      const userCredential = await confirmationResult.confirm(verificationCode);
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Password Reset
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign Out
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      
      // Clear reCAPTCHA verifier
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Current User
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Auth State Listener
  onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(this.auth, callback);
  }

  // Link Accounts
  async linkEmailAccount(email: string, password: string): Promise<User> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      const credential = EmailAuthProvider.credential(email, password);
      const userCredential = await linkWithCredential(user, credential);
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async linkGoogleAccount(): Promise<User> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      const provider = new GoogleAuthProvider();
      const userCredential = await linkWithCredential(user, GoogleAuthProvider.credential());
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Unlink Accounts
  async unlinkProvider(providerId: string): Promise<User> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      const updatedUser = await unlink(user, providerId);
      return updatedUser;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Update Profile
  async updateUserProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      await updateProfile(user, updates);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Error Handler
  private handleAuthError(error: any): AuthError {
    let code: AuthErrorCode = 'generic';
    let message = 'An error occurred during authentication';

    switch (error.code) {
      case 'auth/invalid-email':
        code = 'invalid-credentials';
        message = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        code = 'account-disabled';
        message = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        code = 'user-not-found';
        message = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        code = 'invalid-credentials';
        message = 'Incorrect password';
        break;
      case 'auth/email-already-in-use':
        code = 'email-already-in-use';
        message = 'An account already exists with this email';
        break;
      case 'auth/weak-password':
        code = 'weak-password';
        message = 'Password is too weak';
        break;
      case 'auth/too-many-requests':
        code = 'too-many-requests';
        message = 'Too many failed attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        code = 'network-error';
        message = 'Network error. Please check your connection';
        break;
      case 'auth/popup-closed-by-user':
        code = 'popup-closed';
        message = 'Sign-in popup was closed';
        break;
      case 'auth/cancelled-popup-request':
        code = 'popup-cancelled';
        message = 'Sign-in was cancelled';
        break;
      case 'auth/invalid-verification-code':
        code = 'invalid-verification-code';
        message = 'Invalid verification code';
        break;
      case 'auth/invalid-verification-id':
        code = 'invalid-verification-id';
        message = 'Invalid verification ID';
        break;
      case 'auth/missing-verification-code':
        code = 'missing-verification-code';
        message = 'Verification code is required';
        break;
      case 'auth/missing-verification-id':
        code = 'missing-verification-id';
        message = 'Verification ID is required';
        break;
      default:
        message = error.message || message;
    }

    return {
      code,
      message,
      details: { originalError: error }
    };
  }

  // Cleanup
  cleanup(): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
  }
}

// Create singleton instance
export const authService = new AuthService();

// Helper functions
export const isAuthenticated = (): boolean => {
  return authService.getCurrentUser() !== null;
};

export const getCurrentUserId = (): string | null => {
  const user = authService.getCurrentUser();
  return user ? user.uid : null;
};

export const getCurrentUserEmail = (): string | null => {
  const user = authService.getCurrentUser();
  return user ? user.email : null;
};

// Export types and constants
export {
  GoogleAuthProvider,
  EmailAuthProvider,
  RecaptchaVerifier
};

export type {
  User,
  ConfirmationResult,
  Unsubscribe
}; 