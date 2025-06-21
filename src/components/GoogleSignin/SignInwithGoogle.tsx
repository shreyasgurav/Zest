import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { toast } from "react-toastify";
import GoogleSignInButton from "./GoogleButton";
import { useRouter } from 'next/navigation';
import styles from './SignInwithGoogle.module.css';
import { handleAuthenticationFlow } from '../../utils/authHelpers';

interface SignInwithGoogleProps {
  onSuccess?: () => void;
}

function SignInwithGoogle({ onSuccess }: SignInwithGoogleProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function googleLogin() {
    if (isLoading) return;
    setIsLoading(true);
    
    console.log("🔵 Starting Google Sign-in process...");

    try {
      await setPersistence(auth, browserLocalPersistence);
      console.log("🔵 Persistence set to local storage");
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      console.log("🔵 Google provider configured");

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("🟢 Google Sign-in successful!", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      if (user) {
        // Use unified authentication flow
        console.log("🔵 Starting unified authentication flow...");
        const { userData, navigationPath } = await handleAuthenticationFlow(user, 'google');
        
        console.log("🟢 Authentication flow completed!", {
          hasUsername: !!userData.username,
          hasPhone: !!userData.phone,
          hasEmail: !!userData.email,
          providersCount: userData.providers ? Object.keys(userData.providers).length : 0,
          navigationPath
        });
        
        // Enhanced success messaging
        if (userData.username && userData.phone) {
          toast.success("Welcome back to Zest!");
          console.log("🟢 Returning user with complete profile");
        } else if (userData.providers && Object.keys(userData.providers).length > 1) {
          toast.success("Account linked successfully!");
          console.log("🟢 Account linked with existing profile");
        } else {
          toast.success("Welcome to Zest! Profile created successfully!");
          console.log("🟢 New user profile created");
        }
        
        // Let the parent component handle navigation
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error("🔴 Google Sign-in error:", error);
      
      if (error instanceof FirebaseError) {
        console.log("🔴 Firebase error details:", {
          code: error.code,
          message: error.message
        });
        
        if (error.code === 'auth/popup-closed-by-user') {
          toast.info("Sign-in cancelled");
        } else if (error.code === 'auth/popup-blocked') {
          toast.error("Popup was blocked. Please allow popups for this site.");
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          toast.error("An account already exists with this email using a different sign-in method.");
        } else if (error.code === 'auth/invalid-credential') {
          toast.error("Invalid credentials. Please try again.");
        } else if (error.code === 'auth/network-request-failed') {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.code === 'auth/too-many-requests') {
          toast.error("Too many sign-in attempts. Please try again later.");
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
      } else {
        // Handle non-Firebase errors (likely from handleAuthenticationFlow)
        console.error("🔴 Non-Firebase error during authentication:", error);
        toast.error("Error creating user profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
      console.log("🔵 Google Sign-in process completed");
    }
  }

  return (
    <div>
      <p className={styles.loginContinueText}>Continue with Google</p>
      <div
        style={{ 
          display: "flex", 
          justifyContent: "center", 
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1
        }}
      >
        <GoogleSignInButton 
          disabled={isLoading} 
          onClick={googleLogin} 
        />
      </div>
      
      {/* Development mode indicator */}
      {process.env.NODE_ENV === 'development' && isLoading && (
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          Signing in with Google...
        </div>
      )}
    </div>
  );
}

export default SignInwithGoogle; 