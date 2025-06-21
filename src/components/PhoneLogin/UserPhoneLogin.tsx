import React, { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { toast } from "react-toastify";
import styles from "./Login.module.css";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useRouter } from 'next/navigation';
import { handleAuthenticationFlow } from '../../utils/authHelpers';

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    userRecaptchaVerifier: RecaptchaVerifier | null;
    userConfirmationResult: ConfirmationResult | null;
  }
}

interface UserPhoneLoginProps {
  onSuccess?: () => void;
}

function UserPhoneLogin({ onSuccess }: UserPhoneLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [showOtp, setShowOtp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [recaptchaReady, setRecaptchaReady] = useState<boolean>(false);
  const [initializingRecaptcha, setInitializingRecaptcha] = useState<boolean>(true);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const cleanupRecaptcha = () => {
    if (window.userRecaptchaVerifier) {
      try {
        window.userRecaptchaVerifier.clear();
      } catch (error) {
        console.log("Error clearing reCAPTCHA:", error);
      }
      window.userRecaptchaVerifier = null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initRecaptcha = async () => {
      if (!mounted) return;
      
      try {
        setInitializingRecaptcha(true);
        
        // Clean up any existing reCAPTCHA
        cleanupRecaptcha();
        
        // Wait a bit for the DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!document.getElementById('user-recaptcha-container')) {
          console.error("reCAPTCHA container not found");
          return;
        }

        window.userRecaptchaVerifier = new RecaptchaVerifier(
          auth,
          'user-recaptcha-container',
          {
            size: 'normal',
            callback: () => {
              console.log("reCAPTCHA verified for user");
              if (mounted) {
                setRecaptchaReady(true);
                setInitializingRecaptcha(false);
              }
            },
            'expired-callback': () => {
              console.log("reCAPTCHA expired");
              if (mounted) {
                setRecaptchaReady(false);
                toast.error("reCAPTCHA expired. Please refresh.");
              }
            },
            'error-callback': (error: any) => {
              console.error("reCAPTCHA error:", error);
              if (mounted) {
                setRecaptchaReady(false);
                setInitializingRecaptcha(false);
                toast.error("reCAPTCHA error. Please refresh the page.");
              }
            }
          }
        );

        await window.userRecaptchaVerifier.render();
        
        if (mounted) {
          setInitializingRecaptcha(false);
          // Auto-verify reCAPTCHA for better UX
          setTimeout(() => {
            if (mounted && !recaptchaReady) {
              setRecaptchaReady(true);
            }
          }, 1000);
        }
      } catch (error: any) {
        console.error("reCAPTCHA initialization error:", error);
        if (mounted) {
          setInitializingRecaptcha(false);
          setRecaptchaReady(false);
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying reCAPTCHA initialization (${retryCount}/${maxRetries})`);
            setTimeout(() => {
              if (mounted) initRecaptcha();
            }, 2000);
          } else {
            toast.error("Unable to initialize phone verification. Please check your internet connection and refresh the page.");
          }
        }
      }
    };

    // Initialize reCAPTCHA with a delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initRecaptcha();
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      cleanupRecaptcha();
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }

    if (timeLeft > 0) {
      toast.error(`Please wait ${timeLeft} seconds before trying again`);
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      if (!window.userRecaptchaVerifier) {
        throw new Error("reCAPTCHA not initialized. Please refresh the page.");
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.userRecaptchaVerifier
      );

      window.userConfirmationResult = confirmationResult;
      setShowOtp(true);
      setTimeLeft(30);
      toast.success("OTP sent successfully!");
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      
      if (error.code === 'auth/too-many-requests') {
        toast.error("Too many attempts. Please try again later.");
        setTimeLeft(60);
      } else if (error.code === 'auth/invalid-phone-number') {
        toast.error("Please enter a valid phone number.");
      } else if (error.code === 'auth/invalid-app-credential') {
        toast.error("Phone verification is currently unavailable. Please try again later or contact support.");
      } else if (error.message.includes("reCAPTCHA")) {
        toast.error("Verification failed. Please refresh the page and try again.");
        // Reset reCAPTCHA
        cleanupRecaptcha();
        setRecaptchaReady(false);
        setInitializingRecaptcha(true);
        window.location.reload();
      } else {
        toast.error("Error sending OTP. Please refresh and try again.");
      }

      cleanupRecaptcha();
      setRecaptchaReady(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    if (!window.userConfirmationResult) {
      toast.error("Session expired. Please request a new OTP.");
      setShowOtp(false);
      return;
    }

    setLoading(true);
    try {
      const result = await window.userConfirmationResult.confirm(otp);
      
      if (result.user) {
        // Use unified authentication flow
        const { userData, navigationPath } = await handleAuthenticationFlow(
          result.user, 
          'phone', 
          { phone: phoneNumber }
        );
        
        if (userData.username && userData.email) {
          toast.success("Welcome back!");
        } else if (userData.providers && Object.keys(userData.providers).length > 1) {
          toast.success("Account linked successfully!");
        } else {
          toast.success("Account created successfully!");
        }
        
        router.push(navigationPath);
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      if (error.code === 'auth/invalid-verification-code') {
        toast.error("Invalid OTP. Please check and try again.");
      } else if (error.code === 'auth/code-expired') {
        toast.error("OTP has expired. Please request a new one.");
        setShowOtp(false);
      } else {
        toast.error("Invalid OTP or session expired. Please try again.");
        setShowOtp(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginForm}>
      {!showOtp ? (
        <form onSubmit={handleSendOtp}>
          <div className={styles.phoneLogin}>
            <label className={styles.phoneNoText}>Phone Number</label>
            <PhoneInput
              international
              defaultCountry="IN"
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || "")}
              className={styles.phoneNoInput}
              disabled={loading}
            />
            <div id="user-recaptcha-container" className={`${styles.mt3} ${styles.mb3}`}></div>
            
            {initializingRecaptcha && (
              <div className={styles.initializingMessage}>
                <p>Initializing verification...</p>
              </div>
            )}
            
            <button 
              type="submit" 
              className={styles.sendOtpButton}
              disabled={loading || timeLeft > 0 || initializingRecaptcha}
            >
              {loading ? "Sending..." : 
               initializingRecaptcha ? "Initializing..." :
               timeLeft > 0 ? `Wait ${timeLeft}s` : "Send OTP"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyOtp}>
          <div className={styles.otpSection}>
            <label className={styles.otpLabel}>Enter OTP</label>
            <input
              type="text"
              className={styles.otpInput} 
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              disabled={loading}
            />
            <button 
              type="submit" 
              className={styles.verifyOtpButton}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button 
              type="button" 
              className={styles.backButton}
              onClick={() => setShowOtp(false)}
              disabled={loading}
            >
              Back to Phone Number
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UserPhoneLogin; 