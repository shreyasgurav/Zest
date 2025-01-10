import React, { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "./firebase";
import { toast } from "react-toastify";
import "./login.css";
import { useNavigate } from "react-router-dom";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

function Login({ onLoginSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (timeLeft > 0) {
      toast.error(`Please wait ${timeLeft} seconds before trying again`);
      return;
    }
    
    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }

    setLoading(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'normal',
          callback: () => {},
          'expired-callback': () => {
            window.recaptchaVerifier = null;
            toast.error("reCAPTCHA expired. Please try again.");
          }
        });
      }

      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        window.recaptchaVerifier
      );
      window.confirmationResult = confirmationResult;
      setShowOtp(true);
      setTimeLeft(30); // 30 seconds cooldown
      toast.success("OTP sent!");
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/too-many-requests') {
        toast.error("Too many attempts. Please try again later.");
        setTimeLeft(60); // 1 minute cooldown on rate limit
      } else {
        toast.error(error.message);
      }
      window.recaptchaVerifier = null;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const result = await window.confirmationResult.confirm(otp);
      if (result.user) {
        toast.success("Phone number verified!");
        onLoginSuccess?.();
        navigate("/org-profile");
      }
    } catch (error) {
      console.error(error);
      toast.error("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      {!showOtp ? (
        <form onSubmit={handleSendOtp}>
          <div className="phone-login">
            <label className="phone-no-text">Phone Number</label>
            <PhoneInput
              international
              defaultCountry="IN"
              value={phoneNumber}
              onChange={setPhoneNumber}
              className="phone-no-input"
              disabled={loading}
            />
            <div id="recaptcha-container" className="mt-3 mb-3"></div>
            <button 
              type="submit" 
              className="send-otp-button"
              disabled={loading || timeLeft > 0}
            >
              {loading ? "Sending..." : timeLeft > 0 ? `Wait ${timeLeft}s` : "Send OTP"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyOtp}>
          <div className="otp-section">
            <label className="otp-label">Enter OTP</label>
            <input
              type="text"
              className="otp-input" 
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="verify-otp-button"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Login;