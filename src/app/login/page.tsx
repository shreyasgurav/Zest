"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, User, signOut } from "firebase/auth"
import { auth, db } from "../../lib/firebase"
import SignInwithGoogle from "../../components/GoogleSignin/SignInwithGoogle"
import { ArrowLeft, LogOut } from "lucide-react"
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { toast } from "react-toastify"
import styles from "./login.module.css"

interface FormData {
  name: string;
  username: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  username?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export default function LoginPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showPostLoginForm, setShowPostLoginForm] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    username: "",
    phone: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("✅ User already logged in, checking profile...")
        await checkUserProfileAndRedirect(user)
      }
    })
    return () => unsubscribe()
  }, [router])

  const checkUserProfileAndRedirect = async (user: User) => {
    try {
      const userRef = doc(db, "Users", user.uid)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists()) {
        const userData = userSnap.data()
        // If user has username and phone, redirect to profile
        if (userData.username && userData.phone && userData.name) {
          console.log("✅ User has complete profile, redirecting to profile...")
          router.push("/profile")
          return
        } else {
          // User exists but profile is incomplete
          console.log("📝 User exists but profile incomplete, showing form...")
          setCurrentUser(user)
          setFormData({
            name: userData.name || user.displayName || "",
            username: userData.username || "",
            phone: userData.phone || "",
          })
          setShowPostLoginForm(true)
          return
        }
      }
      
      // User document doesn't exist, show form
      console.log("📝 New user, needs to complete profile...")
      setCurrentUser(user)
      setFormData({
        name: user.displayName || "",
        username: "",
        phone: "",
      })
      setShowPostLoginForm(true)
    } catch (error) {
      console.error("Error checking user profile:", error)
      toast.error("Error checking user profile. Please try again.")
      await signOut(auth)
    }
  }

  const handleLoginSuccess = () => {
    // User authentication is handled by onAuthStateChanged effect
    console.log("Google sign-in successful, waiting for auth state change...")
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setShowPostLoginForm(false)
      setCurrentUser(null)
      setFormData({ name: "", username: "", phone: "" })
      setErrors({})
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Error signing out")
    }
  }

  // Prevent navigation during profile completion
  useEffect(() => {
    if (showPostLoginForm) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
      }

      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault()
        window.history.pushState(null, "", window.location.href)
      }

      window.addEventListener("beforeunload", handleBeforeUnload)
      window.addEventListener("popstate", handlePopState)
      
      // Push current state to prevent back navigation
      window.history.pushState(null, "", window.location.href)

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload)
        window.removeEventListener("popstate", handlePopState)
      }
    }
  }, [showPostLoginForm])

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (username.length < 3) return false
    
    const q = query(
      collection(db, "Users"),
      where("username", "==", username.toLowerCase())
    )
    
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data()
      if (querySnapshot.docs[0].id !== currentUser?.uid) {
        return false // Username is taken by someone else
      }
    }
    return true // Username is available or belongs to current user
  }

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value.toLowerCase().trim()
    setFormData(prev => ({ ...prev, username: newUsername }))
    setErrors(prev => ({ ...prev, username: '' }))
    
    if (newUsername.length >= 3) {
      setIsChecking(true)
      const isAvailable = await checkUsernameAvailability(newUsername)
      setIsChecking(false)
      
      if (!isAvailable) {
        setErrors(prev => ({ 
          ...prev, 
          username: 'Username is already taken' 
        }))
      }
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, phone: value }))
    setErrors(prev => ({ 
      ...prev, 
      phone: value.length === 10 ? '' : 'Phone number must be 10 digits' 
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentUser) return

    const newErrors: FormErrors = {}

    const trimmedName = formData.name.trim()
    const trimmedUsername = formData.username.trim()
    const phone = formData.phone

    if (!trimmedName) {
      newErrors.name = 'Name is required'
    }

    if (!trimmedUsername) {
      newErrors.username = 'Username is required'
    } else if (trimmedUsername.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!phone) {
      newErrors.phone = 'Phone number is required'
    } else if (phone.length !== 10) {
      newErrors.phone = 'Phone number must be 10 digits'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      // Check if phone is already linked to another account
      if (phone) {
        const phoneQuery = query(
          collection(db, "Users"),
          where("phone", "==", phone)
        )
        const phoneSnapshot = await getDocs(phoneQuery)
        
        if (!phoneSnapshot.empty && phoneSnapshot.docs[0].id !== currentUser.uid) {
          setErrors(prev => ({ 
            ...prev, 
            phone: 'This phone number is already linked to another account' 
          }))
          setIsSubmitting(false)
          return
        }
      }

      const isUsernameAvailable = await checkUsernameAvailability(trimmedUsername)
      if (!isUsernameAvailable) {
        setErrors(prev => ({ 
          ...prev, 
          username: 'Username is already taken' 
        }))
        setIsSubmitting(false)
        return
      }

      const userRef = doc(db, "Users", currentUser.uid)
      await setDoc(userRef, {
        name: trimmedName,
        username: trimmedUsername.toLowerCase(),
        phone: phone,
        updatedAt: new Date().toISOString(),
        uid: currentUser.uid,
        email: currentUser.email?.toLowerCase() || "",
        photo: currentUser.photoURL || "",
        bio: "",
        createdAt: new Date().toISOString(),
        providers: {
          google: true
        }
      }, { merge: true })

      toast.success("Profile setup completed!")
      router.push('/profile')

    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Error setting up profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showPostLoginForm) {
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
            {/* Logout Button */}
            <button onClick={handleLogout} className={styles.logoutButton}>
              <LogOut size={16} />
              Logout
            </button>

            <div className={styles.cardContent}>
              <div className={styles.header}>
                <h1 className={styles.title}>Complete Your Profile</h1>
                <p className={styles.subtitle}>Please complete your profile to continue using Zest</p>
                <div className={styles.profileInfo}>
                  <p className={styles.infoText}>
                    📝 This is a one-time setup. You can logout if you need to use a different account.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className={styles.profileForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Name:</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={styles.profileInput}
                    placeholder="Enter your name"
                  />
                  {errors.name && (
                    <span className={styles.error}>{errors.name}</span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Username:</label>
                  <div className={styles.usernameContainer}>
                    <span className={styles.usernamePrefix}>@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={handleUsernameChange}
                      className={styles.usernameInput}
                      placeholder="username"
                    />
                  </div>
                  {isChecking && (
                    <span className={styles.checking}>Checking availability...</span>
                  )}
                  {errors.username && (
                    <span className={styles.error}>{errors.username}</span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Phone:</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={styles.profileInput}
                    placeholder="Enter 10-digit phone number"
                    maxLength={10}
                  />
                  {errors.phone && (
                    <span className={styles.error}>{errors.phone}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isChecking || Object.keys(errors).some(key => errors[key])}
                  className={styles.completeButton}
                >
                  {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
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
              <p className={styles.subtitle}>Sign in to discover amazing events and activities</p>
            </div>

            {/* Google Sign-in Section */}
            <div className={styles.primaryInputSection}>
              <SignInwithGoogle onSuccess={handleLoginSuccess} />
            </div>

            {/* Organization Login Link */}
            <div className={styles.organizationLink}>
              <p className={styles.organizationText}>Are you an organizer?</p>
              <a href="/login/organisation" className={styles.organizationLinkBtn}>
                Organization Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 