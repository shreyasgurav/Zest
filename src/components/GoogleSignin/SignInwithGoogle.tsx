import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, db } from "@/lib/firebase";
import { toast } from "react-toastify";
import { setDoc, doc, getDoc } from "firebase/firestore";
import GoogleSignInButton from "./GoogleButton";
import { useRouter } from 'next/navigation';
import styles from './SignInwithGoogle.module.css';


function SignInwithGoogle() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function googleLogin() {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user) {
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            photo: user.photoURL,
            createdAt: new Date().toISOString()
          });
          router.push('/postlogin');
          return;
        }

        const userData = userSnap.data();
        if (!userData.username || !userData.phone) {
          router.push('/postlogin');
          return;
        }

        toast.success("Logged in successfully");
        router.push('/profile');
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-closed-by-user') {
          toast.info("Sign-in cancelled");
        } else if (error.code === 'auth/popup-blocked') {
          toast.error("Popup was blocked. Please allow popups for this site.");
        } else {
          toast.error("Login failed. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
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
        <GoogleSignInButton disabled={isLoading} onClick={googleLogin} />
      </div>
    </div>
  );
}

export default SignInwithGoogle; 