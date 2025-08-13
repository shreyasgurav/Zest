"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Mail, Phone, Copy, Check, MapPin, Clock, Send, ArrowRight } from "lucide-react"
import styles from './Contact.module.css'

export default function Contact() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [emailCopied, setEmailCopied] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleCopy = async (text: string, type: "email" | "phone") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "email") {
        setEmailCopied(true)
        setTimeout(() => setEmailCopied(false), 2000)
      } else {
        setPhoneCopied(true)
        setTimeout(() => setPhoneCopied(false), 2000)
      }
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      value: "contact@zestlive.in",
      description: "- Drop us a line anytime",
      color: "from-blue-500 to-cyan-500",
      copied: emailCopied,
      onCopy: () => handleCopy("contact@zestlive.in", "email"),
    },
    {
      icon: Phone,
      title: "Phone",
      value: "+91 70586 44548",
      description: "- Shreyas Gurav",
      color: "from-green-500 to-emerald-500",
      copied: phoneCopied,
      onCopy: () => handleCopy("+91 70586 44548", "phone"),
    },
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
          <div className={styles.heroContent}>
            <div className={styles.heroAnimation}>
              {/* Main Heading */}
              <div className={styles.heroHeading}>
                <h1 className={styles.heroTitle}>
                  <span className={styles.titleGradient1}>Let's</span>
                  <span className={styles.titleGradient2}>Talk</span>
                </h1>
                <p className={styles.heroDescription}>
                  Got questions? Ideas? Just want to say hi?
                  <br />
                  <span className={styles.descriptionHighlight}>We're here for it.</span>
                </p>
              </div>

              {/* Contact Methods */}
              <div className={styles.contactGrid}>
                {contactMethods.map((method, index) => (
                  <Card
                    key={index}
                    className={styles.contactCard}
                    onClick={method.onCopy}
                  >
                    <CardContent className={styles.cardContent}>
                      <div className={styles.cardHeader}>
                        <div className={`${styles.cardIcon} ${styles[method.color]}`}>
                          <method.icon className={styles.icon} />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={styles.copyButton}
                        >
                          {method.copied ? <Check className={styles.checkIcon} /> : <Copy className={styles.copyIcon} />}
                        </Button>
                      </div>
                      <div className={styles.cardInfo}>
                        <h3 className={styles.cardTitle}>{method.title}</h3>
                        <p className={styles.cardValue}>{method.value}</p>
                        <p className={styles.cardDescription}>{method.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
