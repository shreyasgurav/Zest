import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import { setDoc, doc, getDoc } from "firebase/firestore";
import GoogleSignInButton from "./GoogleButton";

function SignInwithGoogle() {
  async function googleLogin() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user) {
        // Check if user document exists
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        
        // Merge existing data if it exists
        const existingData = userSnap.exists() ? userSnap.data() : {};
        
        await setDoc(userRef, {
          ...existingData,
          email: user.email,
          name: user.displayName,
          photo: user.photoURL,
          username: existingData.username || "",
          bio: existingData.bio || "",
          phone: existingData.phone || ""
        });

        toast.success("User logged in Successfully", {
          position: "top-center",
        });
        window.location.href = "/#/profile";
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
    }
  }

  return (
    <div>
      <p className="login-continue-text"> Continue with Google</p>
      <div
        style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}
        onClick={googleLogin}
      >
        <GoogleSignInButton />
      </div>
    </div>
  );
}

export default SignInwithGoogle;