"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import styles from "./create.module.css";

const CreateType = () => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const checkAuth = () => {
      const user = auth.currentUser;
      setIsAuthorized(user?.email === "shrreyasgurav@gmail.com");
    };

    checkAuth();
    const unsubscribe = onAuthStateChanged(auth, checkAuth);
    return () => unsubscribe();
  }, [auth, isClient]);

  if (!isClient) {
    return null; // Return null during server-side rendering
  }

  if (!isAuthorized) {
    return (
      <div className={styles["unauthorized-message-container"]}>
        <div className={styles["unauthorized-message"]}>
          <h1>Unauthorized Access</h1>
          <p>You can't create anything because you are not Shreyas.</p>
          <button onClick={() => router.push("/")} className={styles["back-button"]}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleTypeSelection = (type: string) => {
    switch (type) {
      case "event":
        router.push("/create-event");
        break;
      case "workshop":
        router.push("/create/guide");
        break;
      case "experience":
        router.push("/create-experience");
        break;
      case "service":
        router.push("/create-service");
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles["type-selection-page"]}>
      <div className={styles["type-selection-container"]}>
        <h1 className={styles["page-title"]}>What would you like to create?</h1>
        <div className={styles["type-grid"]}>
          <div
            className={styles["type-card"]}
            onClick={() => handleTypeSelection("event")}
          >
            <div className={styles["type-icon"]}>🎉</div>
            <h2>Event</h2>
            <p>Create a one-time or recurring event</p>
          </div>

          <div
            className={styles["type-card"]}
            onClick={() => handleTypeSelection("workshop")}
          >
            <div className={styles["type-icon"]}>🌟</div>
            <h2>Guide</h2>
            <p>Create a Guide excluding bullshit.</p>
          </div>

          <div
            className={styles["type-card"]}
            onClick={() => handleTypeSelection("experience")}
          >
            <div className={styles["type-icon"]}>🌟</div>
            <h2>Experience</h2>
            <p>Create an immersive experience</p>
          </div>

          <div
            className={styles["type-card"]}
            onClick={() => handleTypeSelection("service")}
          >
            <div className={styles["type-icon"]}>🎮</div>
            <h2>Activities</h2>
            <p>Offer fun activities</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateType; 