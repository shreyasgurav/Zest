import React, { useState } from "react";
import SignInwithGoogle from "../components/GoogleSignin/signInWIthGoogle";
import "./LoginPopup.css";

function LoginPopup({ onClose }) {
    const [showPhoneLogin, setShowPhoneLogin] = useState(false);

    // Show phone login directly when clicking organiser button
    const handleOrgClick = () => {
        setShowPhoneLogin(true);
    };

    return (
        <div className="signin-modal-wrapper">
            <div className="signin-modal-inner">
                <button className="signin-close-btn" onClick={onClose}>×</button>
                <h1 className="signin-heading">Welcome to Zest</h1>
                <div className="signin-divider">
                    <div className="signin-divider-line"></div>
                </div>
                
                {<SignInwithGoogle />}
                
            </div>
        </div>
    );
}

export default LoginPopup;