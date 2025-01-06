import React, { useState } from "react";
import SignInwithGoogle from "./components/signInWIthGoogle";
import "./LoginPopup.css";

function LoginPopup({ onClose }) {
    const [isRegister, setIsRegister] = useState(false);

    return (
        <div className="login-modal-wrapper">
            <div className="login-modal-inner">
                <button className="login-close-btn" onClick={onClose}>×</button>
                <SignInwithGoogle />
            </div>
        </div>
    );
}

export default LoginPopup;