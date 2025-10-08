"use client"

import { useState, useEffect } from "react"
import { Shield, Eye } from "lucide-react"
import styles from "./privacy-policy.module.css"

export default function PrivacyPolicy() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const policies = [
    {
      title: "Information We Collect",
      content: "We collect personal information you provide such as name, email, phone number, and location when creating an account or booking events.",
    },
    {
      title: "How We Use Your Information",
      content: "Your information is used to process bookings, send confirmations, provide customer support, and improve our services.",
    },
    {
      title: "Data Security",
      content: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, or disclosure.",
    },
    {
      title: "Third-Party Services",
      content: "We may share information with trusted third-party service providers (like payment processors) who assist in operating our platform.",
    },
    {
      title: "Cookies and Tracking",
      content: "We use cookies to enhance your browsing experience and analyze website traffic. You can control cookie preferences through your browser settings.",
    },
    {
      title: "Your Rights",
      content: "You have the right to access, update, or delete your personal information. Contact us at contact@zestlive.in for data-related requests.",
    },
  ]

  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.backgroundContainer}>
        <div
          className={styles.mouseBlob}
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
        <div className={styles.staticBlob1} />
        <div className={styles.staticBlob2} />
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Eye className={styles.badgeIcon} />
            <span className={styles.badgeText}>Privacy</span>
          </div>

          <h1 className={styles.title}>
            Privacy<span className={styles.titleGradient}>Policy</span>
          </h1>

          <p className={styles.subtitle}>
            At Zest, we value your privacy and are committed to protecting your personal information. This policy outlines how we collect, use, and safeguard your data:
          </p>
        </div>

        <div className={styles.policiesContainer}>
          {policies.map((policy, index) => (
            <div key={index} className={styles.policyItem}>
              <div className={styles.policyNumber}>{index + 1}</div>
              <div className={styles.policyContent}>
                <h3 className={styles.policyTitle}>{policy.title}:</h3>
                <p className={styles.policyText}>{policy.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerIcon}>
            <Shield className={styles.footerIconSvg} />
          </div>
          <p className={styles.footerText}>
            This privacy policy was last updated on January 2025. For any privacy-related questions, please contact us at contact@zestlive.in
          </p>
        </div>
      </div>
    </div>
  )
} 