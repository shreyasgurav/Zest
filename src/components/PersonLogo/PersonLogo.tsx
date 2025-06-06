"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { initializeFirebase } from "@/lib/initFirebase";
import styles from "./PersonLogo.module.css";

export default function PersonLogo() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [auth, isClient]);

  const handleClick = () => {
    if (user) {
      router.push("/postlogin");
    } else {
      router.push("/");
    }
  };

  if (!isClient) {
    return null; // Return null during server-side rendering
  }

  return (
    <div className={styles["person-logo"]} onClick={handleClick}>
      {user ? (
        <img
          src={user.photoURL || "/default-avatar.png"}
          alt="User Profile"
          className={styles["profile-image"]}
        />
      ) : (
        <div className={styles["default-avatar"]}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
    </div>
  );
} 