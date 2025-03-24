import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, db } from "../../../firebase";
import { toast } from "react-toastify";
import { setDoc, doc, getDoc } from "firebase/firestore";
import GoogleSignInButton from "./GoogleButton";
import { useState } from "react";
import { useNavigate } from 'react-router-dom';

function SignInwithGoogle() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  async function googleLogin() {
    if (isLoading) return; // Prevent multiple clicks
    setIsLoading(true);

    try {
      // Set persistence first
      await setPersistence(auth, browserLocalPersistence);
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user) {
        try {
          const userRef = doc(db, "Users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: user.email,
              photo: user.photoURL,
              createdAt: new Date().toISOString()
            });
            navigate('/postlogin');
            return;
          }

          const userData = userSnap.data();
          
          if (!userData.username || !userData.phone) {
            navigate('/postlogin');
            return;
          }

          toast.success("Logged in successfully");
          navigate('/profile');
        } catch (dbError) {
          console.error("Database error:", dbError);
          toast.error("Error accessing user data. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        toast.info("Sign-in cancelled");
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Popup was blocked. Please allow popups for this site.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <p className="login-continue-text">Continue with Google</p>
      <div
        style={{ 
          display: "flex", 
          justifyContent: "center", 
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1
        }}
        onClick={googleLogin}
      >
        <GoogleSignInButton disabled={isLoading} />
      </div>
    </div>
  );
}

export default SignInwithGoogle;