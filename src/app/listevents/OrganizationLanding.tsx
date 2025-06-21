"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Users,
  Calendar,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  CreditCard,
  Shield,
  Smartphone,
  Sparkles,
  Megaphone,
  ArrowRight,
} from "lucide-react"
import styles from "./OrganizationLanding.module.css"

export default function OrganizationLanding() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const timelineRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (!timelineRef.current || !progressRef.current) return

      const timeline = timelineRef.current
      const progress = progressRef.current
      const steps = timeline.querySelectorAll('[data-step]')
      const windowHeight = window.innerHeight
      const centerY = windowHeight / 2

      let activeStep = 0
      let progressPercentage = 0

      // Check which step is closest to center of screen
      steps.forEach((step, index) => {
        const stepRect = (step as HTMLElement).getBoundingClientRect()
        const stepCenter = stepRect.top + stepRect.height / 2
        const distanceFromCenter = Math.abs(stepCenter - centerY)

        // Remove active class from all steps
        step.classList.remove('active')
        
        // If step is close to center (within 200px), make it active
        if (distanceFromCenter < 200 && stepCenter < centerY + 100) {
          activeStep = index + 1
          step.classList.add('active')
        }
      })

      // Calculate progress based on active step and scroll position
      if (activeStep > 0) {
        const baseProgress = ((activeStep - 1) / 3) * 100
        const stepProgress = (1 / 3) * 100
        
        // Fine-tune progress based on exact scroll position of active step
        const activeStepElement = steps[activeStep - 1] as HTMLElement
        const stepRect = activeStepElement.getBoundingClientRect()
        const stepProgress_fine = Math.max(0, Math.min(1, (centerY - stepRect.top) / stepRect.height))
        
        progressPercentage = Math.min(100, baseProgress + (stepProgress * stepProgress_fine))
      }

      // Smooth progress line animation
      progress.style.height = `${progressPercentage}%`
      
      // Add glow effect based on progress
      if (progressPercentage > 0) {
        progress.style.boxShadow = `
          0 0 20px rgba(192, 132, 252, ${0.5 + (progressPercentage / 200)}),
          0 0 40px rgba(244, 114, 182, ${0.3 + (progressPercentage / 300)}),
          0 0 60px rgba(96, 165, 250, ${0.2 + (progressPercentage / 400)})
        `
      }
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Call once to set initial state

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const features = [
    {
      icon: Calendar,
      title: "Easy Event Management",
      description: "Create, edit, and manage all your events from one simple dashboard.",
    },
    {
      icon: Users,
      title: "Reach More People",
      description: "Connect with thousands of active users looking for experiences in your city.",
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track bookings, engagement, and revenue with detailed insights.",
    },
    {
      icon: CreditCard,
      title: "Secure Payments",
      description: "Built-in payment processing with instant payouts to your account.",
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Your events look perfect on every device, reaching users everywhere.",
    },
    {
      icon: Shield,
      title: "Trust & Safety",
      description: "Verified profiles and secure transactions protect you and your attendees.",
    },
  ]

  const benefits = [
    {
      icon: TrendingUp,
      title: "Grow Your Audience",
      description: "Tap into our growing community of experience seekers and event enthusiasts.",
    },
    {
      icon: Target,
      title: "Better Targeting",
      description: "Reach the right people with smart recommendations and category-based discovery.",
    },
    {
      icon: Zap,
      title: "Instant Bookings",
      description: "Convert interest into attendance with seamless, one-click booking experience.",
    },
  ]

  const eventTypes = [
    "Comedy Shows",
    "Live Music",
    "Parties & Clubs",
    "Sports Activities",
    "Adventure Experiences",
    "Weekend Getaways",
    "Hobby Clubs",
    "Workshops",
  ]

  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.background}>
        <div
          className={styles.mouseFollow}
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
        <div className={styles.backgroundBlob1} />
        <div className={styles.backgroundBlob2} />
      </div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <h1 className={styles.heroTitle}>
            <span className={styles.titleGradient1}>List Your</span>
            <span className={styles.titleGradient2}>Events</span>
          </h1>

          <p className={styles.heroDescription}>
            Join hundreds of organizers who trust Zest to connect them with their perfect audience.
            <br />
            <span className={styles.descriptionHighlight}>From comedy nights to adventure trips, we help you fill every seat.</span>
          </p>

          <div className={styles.heroButtons}>
            <Link href="/login/organisation">
              <button className={styles.primaryButton}>
                Create Organisation Profile
                <ArrowRight className={styles.buttonIcon} />
              </button>
            </Link>
          </div>

          {/* Event Types */}
          <div className={styles.eventTypes}>
            {eventTypes.map((type, index) => (
              <div key={index} className={styles.eventTypeCard}>
                <span className={styles.eventTypeBadge}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Everything You Need to
              <span className={styles.sectionTitleGradient}>Succeed</span>
            </h2>
            <p className={styles.sectionDescription}>
              From event creation to payment processing, we've built the complete toolkit for modern event organizers.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIconContainer}>
                  <feature.icon className={styles.featureIcon} />
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={styles.benefitsSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.benefitsBadge}>Growth Focused</div>
            <h2 className={styles.sectionTitle}>
              How We Help You
              <span className={styles.benefitsTitleGradient}> Grow</span>
            </h2>
          </div>

          <div className={styles.benefitsGrid}>
            {benefits.map((benefit, index) => (
              <div key={index} className={styles.benefitItem}>
                <div className={styles.benefitIconContainer}>
                  <benefit.icon className={styles.benefitIcon} />
                  <div className={styles.benefitIconGlow} />
                </div>
                <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                <p className={styles.benefitDescription}>{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.stepsSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.stepsBadge}>Simple Process</div>
            <h2 className={styles.sectionTitle}>
              Get Started in
              <span className={styles.stepsTitleGradient}> 3 Steps</span>
            </h2>
          </div>

          <div className={styles.stepsTimeline} ref={timelineRef}>
            <div className={styles.timelineConnector}>
              <div className={styles.timelineLine}></div>
              <div className={styles.timelineProgress} ref={progressRef}></div>
            </div>
            
            {[
              {
                step: "01",
                title: "Create Profile",
                description: "Set up your organization profile with photos, description, and contact details.",
                icon: Users,
              },
              {
                step: "02",
                title: "List Events",
                description: "Add your events with all details, pricing, and availability.",
                icon: Calendar,
              },
              {
                step: "03",
                title: "Start Selling",
                description: "Watch bookings roll in and manage everything from your dashboard.",
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <div 
                key={index} 
                data-step={index + 1}
                className={`${styles.stepItem} ${styles[`stepItem${index + 1}`]}`}
              >
                <div className={styles.stepNumber}>{item.step}</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepIconContainer}>
                    <item.icon className={styles.stepIcon} />
                    <div className={styles.stepIconGlow} />
                  </div>
                  <h3 className={styles.stepTitle}>{item.title}</h3>
                  <p className={styles.stepDescription}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>
            Ready to Fill Every
            <span className={styles.ctaTitleGradient}>Seat?</span>
          </h2>
          <p className={styles.ctaDescription}>
            Join the platform that's helping organizers across the city connect with their perfect audience.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/login/organisation">
              <button className={styles.ctaPrimaryButton}>
                <Sparkles className={styles.buttonIcon} />
                Create Organisation Profile
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
} 