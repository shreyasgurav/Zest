import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";
import "./login.css";
import { useNavigate } from "react-router-dom";

function Login({ onLoginSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    try {
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'send-otp-button', {
        size: 'invisible'
      });

      const formattedPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+91${phoneNumber}`;

      console.log("Sending OTP to:", formattedPhoneNumber);
      
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhoneNumber, 
        recaptchaVerifier
      );
      
      window.confirmationResult = confirmationResult;
      setShowOtp(true);
      toast.success("OTP sent successfully!");
      
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    try {
      const result = await window.confirmationResult.confirm(otp);
      console.log("User:", result.user);
      toast.success("Phone number verified successfully!");
      onLoginSuccess?.();
      navigate("/profile");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Invalid OTP");
    }
  };

  return (
    <div className="login-form">
      <h3 className="login-heading">Login to Zest</h3>
      
      {!showOtp ? (
        <form onSubmit={handleSendOtp}>
          <div className="phone-login">
            <label className="phone-no-text">Phone Number</label>
            <input
              type="tel"
              className="phone-no-input"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength={10}
            />
            <button type="submit" id="send-otp-button" className="send-otp-button">
              Send OTP
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <div className="otp-section">
            <label className="otp-label">Enter OTP</label>
            <input
              type="text"
              className="otp-input"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
            <button type="submit" className="verify-otp-button">
              Verify OTP
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Login;