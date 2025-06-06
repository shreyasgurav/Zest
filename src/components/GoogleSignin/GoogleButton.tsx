import React from 'react';
import styles from "./GoogleButton.module.css";

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ disabled, onClick }) => {
  return (
    <button 
      className={styles.googleButton} 
      disabled={disabled}
      onClick={onClick}
    >
      <img
        src="/google-icon.svg"
        alt="Google logo"
        className={styles.googleIcon}
      />
      <span className={styles.buttonText}>Sign in with Google</span>
    </button>
  );
};

export default GoogleSignInButton; 