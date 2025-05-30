import React from "react";
import "./GoogleButton.css"

const GoogleSignInButton = () => {
  const handleGoogleSignIn = () => {
    // Handle Google sign-in logic here
    console.log("Sign in with Google clicked");
  };

  return (
    <button className="google-sign-in" onClick={handleGoogleSignIn}>
      <img
        src="https://img.icons8.com/?size=100&id=17950&format=png&color=FFFFFF"
        alt="Google Logo"
      />
      Sign in with Google
    </button>
  );
};

export default GoogleSignInButton;
