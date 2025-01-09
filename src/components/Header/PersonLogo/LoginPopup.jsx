import React, { useState } from "react";
import SignInwithGoogle from "./components/signInWIthGoogle";
import Login from "./components/login";
import "./LoginPopup.css";

function LoginPopup({ onClose }) {
    const [isRegister, setIsRegister] = useState(false);

    return (
        <div className="login-modal-wrapper">
            <div className="login-modal-inner">
                <button className="login-close-btn" onClick={onClose}>×</button>
                <Login />
                <div className="login-divider">
                    <div className="login-divider-line"></div>
                    <span className="login-divider-text">or</span>
                    <div className="login-divider-line"></div>
                </div>
                <SignInwithGoogle />
            </div>
        </div>
    );
}

export default LoginPopup;