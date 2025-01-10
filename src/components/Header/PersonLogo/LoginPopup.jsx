import React, { useState } from "react";
import SignInwithGoogle from "./components/signInWIthGoogle";
import Login from "./components/login";
import "./LoginPopup.css";

function LoginPopup({ onClose }) {
    const [showPhoneLogin, setShowPhoneLogin] = useState(false);

    // Show phone login directly when clicking organiser button
    const handleOrgClick = () => {
        setShowPhoneLogin(true);
    };

    // Simplified render content function
    const renderContent = () => {
        if (showPhoneLogin) {
            return (
                <div className="phone-login-container">
                    <Login />
                </div>
            );
        }
        
        return (
            <div className="org-question-container">
                <p className="org-question-text">Organiser?</p>
                <button 
                    className="continue-org-btn"
                    onClick={handleOrgClick}
                >
                    Continue as Organiser
                </button>
            </div>
        );
    };

    return (
        <div className="login-modal-wrapper">
            <div className="login-modal-inner">
                <button className="login-close-btn" onClick={onClose}>×</button>
                <h1 className="login-heading">Welcome to Zest</h1>
                
                {!showPhoneLogin && <SignInwithGoogle />}
                
                <div className="login-divider">
                    <div className="login-divider-line"></div>
                </div>
                
                {renderContent()}
            </div>
        </div>
    );
}

export default LoginPopup;