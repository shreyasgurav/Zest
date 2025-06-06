import React, { useState } from "react";
import SignInwithGoogle from "../../GoogleSignin/SignInwithGoogle";
import styles from "./LoginPopup.module.css";

interface LoginPopupProps {
    onClose: () => void;
}

function LoginPopup({ onClose }: LoginPopupProps) {
    const [showPhoneLogin, setShowPhoneLogin] = useState(false);

    // Show phone login directly when clicking organiser button
    const handleOrgClick = () => {
        setShowPhoneLogin(true);
    };

    return (
        <div className={styles.signinModalWrapper}>
            <div className={styles.signinModalInner}>
                <button className={styles.signinCloseBtn} onClick={onClose}>×</button>
                <h1 className={styles.signinHeading}>Welcome to Zest</h1>
                <div className={styles.signinDivider}>
                    <div className={styles.signinDividerLine}></div>
                </div>
                <SignInwithGoogle />
            </div>
        </div>
    );
}

export default LoginPopup; 