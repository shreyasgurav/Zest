import React from "react";
import SignInwithGoogle from "../../GoogleSignin/SignInwithGoogle";
import styles from "./LoginPopup.module.css";

interface LoginPopupProps {
    onClose: () => void;
}

function LoginPopup({ onClose }: LoginPopupProps) {
    const handleLoginSuccess = () => {
        onClose();
    };

    return (
        <div className={styles.signinModalWrapper}>
            <div className={styles.signinModalInner}>
                <button className={styles.signinCloseBtn} onClick={onClose}>×</button>
                <h1 className={styles.signinHeading}>Welcome to Zest</h1>
                <p className={styles.signinSubtext}>Sign in to discover amazing events and activities</p>
                
                <div className={styles.googleSigninContainer}>
                    <SignInwithGoogle onSuccess={handleLoginSuccess} />
                </div>
                
                <div className={styles.organizationLink}>
                    <p className={styles.organizationText}>Are you an organizer?</p>
                    <a href="/login/organisation" className={styles.organizationLinkBtn}>
                        Organization Login
                    </a>
                </div>
            </div>
        </div>
    );
}

export default LoginPopup; 