import React, { useState } from "react";
import SignInwithGoogle from "./components/signInWIthGoogle";
import Login from "./components/login"; // Login component handles phone login
import "./LoginPopup.css";

function LoginPopup({ onClose }) {
    const [isRegister, setIsRegister] = useState(false); // If registration-related logic is needed
    const [showOrgFlow, setShowOrgFlow] = useState(false); // To handle Organiser-specific flows
    const [showPhoneLogin, setShowPhoneLogin] = useState(false); // For phone login visibility

    // Show organiser flow
    const handleOrgClick = () => {
        setShowOrgFlow(true);
    };

    // Show phone number login
    const handleCreateOrgClick = () => {
        setShowPhoneLogin(true);
    };

    // Decide what to render
    const renderContent = () => {
        // Render Phone Login (final step for organiser)
        if (showPhoneLogin) {
            return (
                <div className="phone-login-container">
                    <h2 className="phone-login-title">Phone Number Login</h2>
                    <Login /> {/* Login component for phone number authentication */}
                </div>
            );
        }

        // Render Organisation Profile Flow
        if (showOrgFlow) {
            return (
                <div className="org-flow-container">
                    <p className="create-org-info">List and manage your services.</p>
                    <button 
                        className="org-flow-button"
                        onClick={handleCreateOrgClick}
                    >
                        Create Organisation Page
                    </button>
                </div>
            );
        }

        // Initial User/Organiser Choice
        return (
            <div className="org-question-container">
                <p className="org-question-text">Organiser?</p>
                <button 
                    className="org-flow-button"
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
                {/* Close button */}
                <button className="login-close-btn" onClick={onClose}>×</button>
                
                {/* Header */}
                <h1 className="login-heading">Welcome to Zest</h1>
                
                {/* Show Google Login only when not in Organiser flow */}
                {!showOrgFlow && !showPhoneLogin && <SignInwithGoogle />}
                
                {/* Divider */}
                <div className="login-divider">
                    <div className="login-divider-line"></div>
                </div>
                
                {/* Dynamic content based on flow */}
                {renderContent()}
            </div>
        </div>
    );
}

export default LoginPopup;