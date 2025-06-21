'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, Laugh, PartyPopper, Car, Mountain, Plane, Users, Sparkles, Heart, ArrowRight } from "lucide-react";
import styles from './About.module.css';

export default function About() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const eventTypes = [
    { icon: Laugh, title: "Comedy Shows", color: "from-yellow-500 to-orange-500" },
    { icon: PartyPopper, title: "Parties & Clubs", color: "from-pink-500 to-purple-500" },
    { icon: Car, title: "Activities", color: "from-blue-500 to-cyan-500" },
    { icon: Mountain, title: "Adventures", color: "from-green-500 to-emerald-500" },
    { icon: Plane, title: "Getaways", color: "from-indigo-500 to-purple-500" },
    { icon: Users, title: "Communities", color: "from-red-500 to-pink-500" },
    { icon: Music, title: "Music Shows", color: "from-violet-500 to-purple-500" },
    { icon: Sparkles, title: "More", color: "from-teal-500 to-cyan-500" },
  ];

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
      <section ref={heroRef} className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div
              className={`${styles.heroAnimation} ${
                isVisible ? styles.visible : styles.hidden
              }`}
            >

              <h1 className={styles.heroTitle}>
                <span className={styles.titleGradient1}>Find Your</span>
                <span className={styles.titleGradient2}>Zest</span>
              </h1>

              <p className={styles.heroDescription}>
                Connect with events, experiences, and communities in your city.
                <br />
                <span className={styles.descriptionHighlight}>One app. Everything happening.</span>
              </p>

              <div className={styles.heroButtons}>
                <Button
                  size="lg"
                  className={styles.primaryButton}
                  onClick={() => router.push('/')}
                >
                  Explore
                  <ArrowRight className={styles.buttonIcon} />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={styles.secondaryButton}
                  onClick={() => router.push('/listevents')}
                >
                  List Events
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className={styles.whatWeDoSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Everything
                <span className={styles.titleGradient}>Everywhere</span>
              </h2>
              <p className={styles.sectionDescription}>
                From underground comedy to weekend escapes. We connect you with what matters.
              </p>
            </div>

            <div className={styles.eventGrid}>
              {eventTypes.map((type, index) => (
                <Card
                  key={index}
                  className={styles.eventCard}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <CardContent className={styles.cardContent}>
                    <div className={styles.cardIconContainer}>
                      <div className={`${styles.cardIcon} ${styles[type.color]}`}>
                        <type.icon className={styles.icon} />
                      </div>
                      <div className={`${styles.cardIconGlow} ${styles[type.color]}`} />
                    </div>
                    <h3 className={styles.cardTitle}>{type.title}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className={styles.missionSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.missionContent}>
            <div className={styles.missionGroup}>
              <div className={styles.missionIconContainer}>
                <Heart className={styles.missionIcon} />
              </div>
              <h2 className={styles.missionTitle}>We believe cities are alive</h2>
              <p className={styles.missionDescription}>
                Every city has a pulse. We make it easier to feel it.
                <br />
                <span className={styles.missionHighlight}>Organizers create. People discover.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
} 