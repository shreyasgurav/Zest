"use client"

import { useState, useEffect } from "react"
import { CreditCard, RefreshCw } from "lucide-react"
import styles from "./refund-policy.module.css"

export default function RefundPolicy() {
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
      title: "Cancellation Timeline",
      content: "Events can be cancelled up to 24 hours before the start time for a full refund. Cancellations within 24 hours are subject to organizer approval.",
    },
    {
      title: "Refund Processing",
      content: "Approved refunds are processed within 5-7 business days to the original payment method used during booking.",
    },
    {
      title: "Event Cancellation by Organizer",
      content: "If an event is cancelled by the organizer, all participants will receive a full refund automatically within 3-5 business days.",
    },
    {
      title: "Weather-Related Cancellations",
      content: "For outdoor events cancelled due to severe weather conditions, full refunds or rescheduling options will be provided.",
    },
    {
      title: "No-Show Policy",
      content: "Failure to attend a booked event without prior cancellation will result in forfeiture of the booking amount with no refund eligibility.",
    },
    {
      title: "Partial Refunds",
      content: "In exceptional circumstances, partial refunds may be considered on a case-by-case basis. Contact contact@zestlive.in for assistance.",
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
            <RefreshCw className={styles.badgeIcon} />
            <span className={styles.badgeText}>Refunds</span>
          </div>

          <h1 className={styles.title}>
            Refund<span className={styles.titleGradient}>Policy</span>
          </h1>

          <p className={styles.subtitle}>
            We understand that plans can change. Our refund policy is designed to be fair to both participants and event organizers while maintaining the quality of our platform:
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
            <CreditCard className={styles.footerIconSvg} />
          </div>
          <p className={styles.footerText}>
            This refund policy was last updated on January 2025. For refund requests or questions, please contact us at contact@zestlive.in
          </p>
        </div>
      </div>
    </div>
  )
} 