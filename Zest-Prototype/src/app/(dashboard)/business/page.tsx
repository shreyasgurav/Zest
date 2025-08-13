"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/infrastructure/firebase"
import { ArrowLeft, Music, Building2, MapPin } from "lucide-react"
import styles from "./business.module.css"

export default function BusinessProfileSelectionPage() {
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      if (user) {
        setIsAuthenticated(true)
      } else {
        // User not authenticated, redirect to login
        router.push('/login')
        return
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [isClient, router])

  const handleBackToHome = () => {
    router.push('/')
  }

  const handleProfileTypeSelection = (type: string) => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    switch (type) {
      case 'artist':
        router.push('/create/artist-page')
        break
      case 'organisation':
        router.push('/create/organisation-page')
        break
      case 'venue':
        router.push('/create/venue-page')
        break
      default:
        break
    }
  }

  if (!isClient || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={styles.businessSelectionContainer}>
      <div className={styles.businessSelectionCard}>
       

        <div className={styles.businessSelectionContent}>
          <div className={styles.header}>
            <h1 className={styles.title}>Create Your Business Profile on Zest</h1>
            <p className={styles.subtitle}>Choose the type of business profile you want to create</p>
          </div>

          <div className={styles.businessOptions}>
            {/* Artist Option */}
            <button 
              className={styles.businessOption}
              onClick={() => handleProfileTypeSelection('artist')}
            >
              <div className={styles.businessOptionIcon}>
                <Music size={32} />
              </div>
              <div className={styles.businessOptionContent}>
                <h3 className={styles.businessOptionTitle}>Artist</h3>
                <p className={styles.businessOptionDescription}>
                  Showcase your talent, connect with venues, and grow your fanbase
                </p>
              </div>
              <div className={styles.businessOptionArrow}>→</div>
            </button>

            {/* Organisation Option */}
            <button 
              className={styles.businessOption}
              onClick={() => handleProfileTypeSelection('organisation')}
            >
              <div className={styles.businessOptionIcon}>
                <Building2 size={32} />
              </div>
              <div className={styles.businessOptionContent}>
                <h3 className={styles.businessOptionTitle}>Organisation / Promoter</h3>
                <p className={styles.businessOptionDescription}>
                  Create and manage events, activities, and connect with your audience
                </p>
              </div>
              <div className={styles.businessOptionArrow}>→</div>
            </button>

            {/* Venue Option */}
            <button 
              className={styles.businessOption}
              onClick={() => handleProfileTypeSelection('venue')}
            >
              <div className={styles.businessOptionIcon}>
                <MapPin size={32} />
              </div>
              <div className={styles.businessOptionContent}>
                <h3 className={styles.businessOptionTitle}>Venue</h3>
                <p className={styles.businessOptionDescription}>
                  List your venue, manage bookings, and host amazing events
                </p>
              </div>
              <div className={styles.businessOptionArrow}>→</div>
            </button>
          </div>

          <div className={styles.helpText}>
            <p>Create Pages. List Events. Connect with your audience.</p>
          </div>


        </div>
      </div>
    </div>
  )
} 