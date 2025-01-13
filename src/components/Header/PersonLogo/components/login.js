import React, { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import "./login.css";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const recaptchaVerifier = useRef(null);

  useEffect(() => {
    const setupRecaptcha = () => {
      if (!window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'normal',
            callback: () => {
              console.log("reCAPTCHA verified");
            },
            'expired-callback': () => {
              window.recaptchaVerifier = null;
              toast.error("reCAPTCHA expired. Please refresh the page.");
            }
          });
          window.recaptchaVerifier.render();
        } catch (error) {
          console.error("Error setting up reCAPTCHA:", error);
          toast.error("Error setting up verification. Please refresh the page.");
        }
      }
    };

    const timer = setTimeout(() => {
      setupRecaptcha();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    console.log("Sending OTP to:", phoneNumber);

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
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          console.log("reCAPTCHA verified");
        },
        'expired-callback': () => {
          window.recaptchaVerifier = null;
          toast.error("reCAPTCHA expired. Please try again.");
        }
      });

      await window.recaptchaVerifier.render();
      console.log("Sending OTP...");
      
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        window.recaptchaVerifier
      );
      
      window.confirmationResult = confirmationResult;
      setShowOtp(true);
      setTimeLeft(30);
      toast.success("OTP sent successfully!");
    } catch (error) {
      console.error("Error sending OTP:", error);
      if (error.code === 'auth/too-many-requests') {
        toast.error("Too many attempts. Please try again later.");
        setTimeLeft(60);
      } else {
        toast.error(error.message || "Error sending OTP. Please try again.");
      }
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    console.log("Starting OTP verification");

    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      console.log("Confirming OTP...");
      const result = await window.confirmationResult.confirm(otp);
      console.log("OTP confirmed, creating organization document");

      if (result.user) {
        const user = result.user;
        console.log("User authenticated:", user.uid);

        // Create the organization document
        const orgData = {
          uid: user.uid,
          phoneNumber: phoneNumber,
          name: "",
          username: "",
          bio: "",
          profileImage: "",
          bannerImage: "",
          isActive: true,
          role: 'Organisation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {
            notifications: true,
            emailUpdates: false,
            privacy: {
              profileVisibility: 'public',
              contactVisibility: 'followers'
            }
          }
        };

        try {
          // Set the document with merge option to handle existing documents
          await setDoc(doc(db, "Organisations", user.uid), orgData, { merge: true });
          console.log("Organization document created successfully");
          
          toast.success("Login successful!");
          window.location.href = "/#/org-profile";
        } catch (error) {
          console.error("Error creating organization document:", error);
          toast.error("Error creating profile. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Invalid OTP. Please try again.");
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