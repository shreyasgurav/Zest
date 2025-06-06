"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { initializeFirebase } from "@/lib/initFirebase";
import PersonLogo from "../PersonLogo/PersonLogo";
import styles from "./header.module.css";

export default function Header() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [auth, setAuth] = useState<ReturnType<typeof getAuth> | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Initialize Firebase and auth only on the client side
    try {
      const app = initializeFirebase();
      setAuth(getAuth(app));
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
  }, []);

  useEffect(() => {
    if (!isClient || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user && user.providerData[0].providerId === 'google.com') {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }
    });

    return () => unsubscribe();
  }, [auth, isClient]);

  if (!isClient) {
    return null; // Return null during server-side rendering
  }

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">
          <span className={styles.logoText}>Zest</span>
        </Link>
      </div>

      <nav className={styles.nav}>
        <Link href="/guides" className={styles.navLink}>
          Guides
        </Link>
        {userEmail === "shrreyasgurav@gmail.com" && (
          <Link href="/create" className={styles.navLink}>
            Create
          </Link>
        )}
        <PersonLogo />
      </nav>
    </header>
  );
} 