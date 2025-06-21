"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  onAuthStateChanged, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult
} from "firebase/auth"
import { auth, db } from "../../lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import SignInwithGoogle from "../../components/GoogleSignin/SignInwithGoogle"
import { ArrowLeft } from "lucide-react"
import { toast } from "react-toastify"
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { handleAuthenticationFlow } from '../../utils/authHelpers'
import styles from "./login.module.css"

// Extend Window interface for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
    confirmationResult: ConfirmationResult | null;
  }
}

export default function LoginPage() {
  const [currentStep, setCurrentStep] = useState<'input' | 'verification'>('input')
  
  // Input values
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  
  // Phone verification states
  const [recaptchaReady, setRecaptchaReady] = useState(false)
  const [isInitializingRecaptcha, setIsInitializingRecaptcha] = useState(false)
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const router = useRouter()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/")
      }
    })
    return () => unsubscribe()
  }, [router])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timerId)
    }
  }, [timeLeft])

  // Initialize reCAPTCHA for phone verification when component mounts
  useEffect(() => {
    // Only initialize if not already initialized
    if (!window.recaptchaVerifier) {
      initializeRecaptcha()
    }
    return () => {
      // Clean up on unmount
      cleanupRecaptcha()
    }
  }, [])

  const cleanupRecaptcha = () => {
    setRecaptchaReady(false)
    setIsInitializingRecaptcha(false)
    
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear()
        console.log("reCAPTCHA cleaned up")
      } catch (e) {
        console.log("Error clearing reCAPTCHA:", e)
      }
      window.recaptchaVerifier = null
    }
    
    // Safely clear the container without affecting React's DOM management
    try {
      const container = document.getElementById('recaptcha-container')
      if (container) {
        // Only clear if it has children that are not React-managed
        while (container.firstChild) {
          container.removeChild(container.firstChild)
        }
      }
    } catch (e) {
      console.log("Error clearing reCAPTCHA container:", e)
    }
  }

  const initializeRecaptcha = async () => {
    // Prevent concurrent initializations
    if (isInitializingRecaptcha) {
      console.log("reCAPTCHA initialization already in progress")
      return
    }

    try {
      setIsInitializingRecaptcha(true)
      
      // Clean up any existing verifier first
      cleanupRecaptcha()

      // Check if container exists
      const container = document.getElementById('recaptcha-container')
      if (!container) {
        console.error("reCAPTCHA container not found")
        return
      }

      // Wait a bit before creating new verifier
      await new Promise(resolve => setTimeout(resolve, 200))

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log("reCAPTCHA solved:", response)
          setRecaptchaReady(true)
        },
        'expired-callback': () => {
          console.log("reCAPTCHA expired")
          setRecaptchaReady(false)
          toast.error("Verification expired. Please try again.")
        },
        'error-callback': (error: any) => {
          console.error("reCAPTCHA error:", error)
          setRecaptchaReady(false)
          toast.error("Verification failed. Please refresh and try again.")
        }
      })

      console.log("Rendering invisible reCAPTCHA...")
      await window.recaptchaVerifier.render()
      setRecaptchaReady(true)
      console.log("Invisible reCAPTCHA initialized successfully")
    } catch (error) {
      console.error("reCAPTCHA initialization error:", error)
      setRecaptchaReady(false)
      toast.error("Failed to initialize verification. Please refresh the page.")
    } finally {
      setIsInitializingRecaptcha(false)
    }
  }

  const handlePhoneContinue = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a phone number")
      return
    }

    if (timeLeft > 0) {
      toast.error(`Please wait ${timeLeft} seconds before trying again`)
      return
    }

    setLoading(true)

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`
      
      // Ensure reCAPTCHA is initialized
      if (!window.recaptchaVerifier) {
        console.log("Initializing invisible reCAPTCHA...")
        await initializeRecaptcha()
        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (!window.recaptchaVerifier) {
        throw new Error("reCAPTCHA initialization failed")
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.recaptchaVerifier
      )

      window.confirmationResult = confirmationResult
      setCurrentStep('verification')
      setTimeLeft(30)
      toast.success("OTP sent successfully!")
    } catch (error: any) {
      console.error("Error sending OTP:", error)
      
      if (error.code === 'auth/too-many-requests') {
        toast.error("Too many attempts. Please try again later.")
        setTimeLeft(60)
      } else if (error.code === 'auth/invalid-phone-number') {
        toast.error("Please enter a valid phone number.")
      } else if (error.code === 'auth/captcha-check-failed') {
        toast.error("Verification failed. Please refresh and try again.")
        // Reset reCAPTCHA
        cleanupRecaptcha()
        await initializeRecaptcha()
      } else if (error.message.includes('already been rendered')) {
        toast.error("Please refresh the page and try again.")
        cleanupRecaptcha()
      } else {
        toast.error("Error sending OTP. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerification = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP")
      return
    }

    if (!window.confirmationResult) {
      toast.error("Session expired. Please request a new OTP.")
      handleBackToInput()
      return
    }

    setLoading(true)
    try {
      const result = await window.confirmationResult.confirm(otp)
      
      if (result.user) {
        await handleSuccessfulAuth(result.user, 'phone')
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error)
      if (error.code === 'auth/invalid-verification-code') {
        toast.error("Invalid OTP. Please check and try again.")
      } else if (error.code === 'auth/code-expired') {
        toast.error("OTP has expired. Please request a new one.")
        handleBackToInput()
      } else {
        toast.error("Invalid OTP. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSuccessfulAuth = async (user: any, provider: 'phone') => {
    try {
      const additionalData = { phone: phoneNumber }
      
      const { userData, navigationPath } = await handleAuthenticationFlow(user, provider, additionalData)
      
      if (userData.username && userData.phone) {
        toast.success("Welcome back!")
      } else if (userData.providers && Object.keys(userData.providers).length > 1) {
        toast.success("Account linked successfully!")
      } else {
        toast.success("Account created successfully!")
      }
      
      router.push(navigationPath)
    } catch (error) {
      console.error("Error handling successful auth:", error)
      toast.error("Error completing login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (timeLeft > 0) {
      toast.error(`Please wait ${timeLeft} seconds before resending`)
      return
    }

    await handlePhoneContinue()
  }

  const handleLoginSuccess = () => {
    router.push("/")
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleBackToInput = () => {
    setCurrentStep('input')
    setOtp("")
    cleanupRecaptcha()
    // Re-initialize for next attempt
    setTimeout(() => {
      if (!window.recaptchaVerifier) {
        initializeRecaptcha()
      }
    }, 100)
  }

  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.backgroundAnimation}>
        <div
          className={styles.mouseFollower}
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
          }}
        />
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gradientOrb3} />
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          {/* Back to Home Button */}
          <button onClick={handleBackToHome} className={styles.backToHome}>
            <ArrowLeft size={16} />
            Back to Home
          </button>

          <div className={styles.cardContent}>
            <div className={styles.header}>
              <h1 className={styles.title}>Welcome to Zest</h1>
              <p className={styles.subtitle}>Please sign in or sign up with your phone number.</p>
            </div>

            {currentStep === 'input' ? (
              <>
                {/* Phone Input Section */}
                <div className={styles.primaryInputSection}>
                  <div className={styles.inputGroup}>
                    <div className={styles.inputHeader}>
                      <label className={styles.label}>Phone Number</label>
                    </div>
                    
                    <PhoneInput
                      international
                      defaultCountry="IN"
                      value={phoneNumber}
                      onChange={(value) => setPhoneNumber(value || "")}
                      className={styles.phoneNumberInput}
                      disabled={loading}
                    />
                  </div>

                  {/* Hidden reCAPTCHA Container - Invisible reCAPTCHA */}
                  <div id="recaptcha-container" style={{ display: 'none' }}></div>

                  <button 
                    className={styles.continueButton}
                    onClick={handlePhoneContinue}
                    disabled={loading || timeLeft > 0}
                  >
                    {loading ? "Sending..." : 
                     timeLeft > 0 ? `Wait ${timeLeft}s` : 
                     "Send OTP"}
                  </button>
                </div>

                {/* Google Sign-in */}
                <div className={styles.googleSection}>
                  <SignInwithGoogle onSuccess={handleLoginSuccess} />
                </div>

                {/* Organization Login Link */}
                <div className={styles.organizationLink}>
                  <p className={styles.organizationText}>Are you an organizer?</p>
                  <a href="/login/organisation" className={styles.organizationLinkBtn}>
                    Organization Login
                  </a>
                </div>
              </>
            ) : (
              /* OTP Verification Step */
              <div className={styles.verificationSection}>
                <div className={styles.verificationHeader}>
                  <button 
                    className={styles.backButton}
                    onClick={handleBackToInput}
                  >
                    ← Back
                  </button>
                  <h2 className={styles.verificationTitle}>Enter Verification Code</h2>
                </div>

                <div className={styles.otpVerificationContent}>
                  <p className={styles.verificationText}>
                    We've sent a 6-digit code to <strong>{phoneNumber}</strong>
                  </p>
                  <input
                    type="text"
                    className={styles.otpInput}
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={loading}
                  />
                  <button 
                    className={styles.verifyButton}
                    onClick={handleOtpVerification}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                </div>

                <button 
                  className={styles.resendButton}
                  onClick={handleResend}
                  disabled={timeLeft > 0}
                >
                  {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend OTP'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 