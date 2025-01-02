import React, { useState } from "react";
import Login from "./components/login";
import Register from "./components/register";
import "./LoginPopup.css";

function LoginPopup({ onClose }) {
    const [isRegister, setIsRegister] = useState(false);

    return (
        <div className="auth-wrapper">
            <div className="auth-inner">
                {isRegister ? (
                    <Register />
                ) : (
                    <Login />
                )}
                <div className="toggle-link">
                    {isRegister ? (
                        <p>
                            Already have an account?{" "}
                            <span onClick={() => setIsRegister(false)} className="link">
                                Login
                            </span>
                        </p>
                    ) : (
                        <p>
                            New user?{" "}
                            <span onClick={() => setIsRegister(true)} className="link">
                                Register Now
                            </span>
                        </p>
                    )}
                </div>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
            
        </div>
    );
}

export default LoginPopup;
