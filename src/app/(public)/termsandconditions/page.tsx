"use client"

import { useState, useEffect } from "react"
import { FileText, Shield } from "lucide-react"
import styles from "./terms-and-conditions.module.css"

export default function TermsAndConditions() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const terms = [
    {
      title: "Use of the Website",
      content: "Users must be 18 years of age or have legal guardian consent to use the services on this website.",
    },
    {
      title: "Services Offered",
      content:
        "Zest provides an online platform to explore, list, and book events and activities. We are not responsible for the conduct or quality of services provided by event organizers.",
    },
    {
      title: "User Obligations",
      content:
        "Users must provide accurate information and are responsible for maintaining the confidentiality of their account credentials.",
    },
    {
      title: "Payment Terms",
      content:
        "All payments made through Zest are processed securely via Razorpay. By making a booking, you agree to our refund and cancellation policy.",
    },
    {
      title: "Limitation of Liability",
      content:
        "Zest shall not be held liable for any direct, indirect, or incidental damages arising out of the use or inability to use our services.",
    },
    {
      title: "Governing Law",
      content:
        "These Terms & Conditions are governed by Indian law and any disputes shall be subject to the jurisdiction of courts.",
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
            <Shield className={styles.badgeIcon} />
            <span className={styles.badgeText}>Legal</span>
          </div>

          <h1 className={styles.title}>
            Terms &<span className={styles.titleGradient}>Conditions</span>
          </h1>

          <p className={styles.subtitle}>
            Welcome to Zest! By accessing or using our website (www.zestlive.in) and services, you agree to be bound by
            the following terms and conditions:
          </p>
        </div>

        <div className={styles.termsContainer}>
          {terms.map((term, index) => (
            <div key={index} className={styles.termItem}>
              <div className={styles.termNumber}>{index + 1}</div>
              <div className={styles.termContent}>
                <h3 className={styles.termTitle}>{term.title}:</h3>
                <p className={styles.termText}>{term.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerIcon}>
            <FileText className={styles.footerIconSvg} />
          </div>
          <p className={styles.footerText}>
            These terms are effective as of the date of your use of our services. For any questions, please contact us
            at contact@zestlive.in
          </p>
        </div>
      </div>
    </div>
  )
} 