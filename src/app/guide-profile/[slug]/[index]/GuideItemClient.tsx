"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { initializeFirebase } from "@/lib/initFirebase";
import styles from "./GuideProfile.module.css";

interface GuideItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  location: string;
  price: string;
}

interface Guide {
  id: string;
  name: string;
  slug: string;
  items: GuideItem[];
}

export default function GuideItemClient({ params }: { params: { slug: string; index: string } }) {
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Initialize Firebase on the client side
    try {
      initializeFirebase();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setError("Failed to initialize Firebase");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchGuide = async () => {
      try {
        const db = getFirebaseDb();
        const guidesSnapshot = await getDocs(collection(db, "guides"));
        let foundGuide: Guide | null = null;

        guidesSnapshot.forEach((doc) => {
          const guideData = doc.data() as Guide;
          if (guideData.slug === params.slug) {
            foundGuide = {
              ...guideData,
              id: doc.id,
            };
          }
        });

        if (!foundGuide) {
          setError("Guide not found");
          return;
        }

        setGuide(foundGuide);
      } catch (error) {
        console.error("Error fetching guide:", error);
        setError("Failed to fetch guide");
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [params.slug, isClient]);

  if (!isClient) {
    return null; // Return null during server-side rendering
  }

  if (loading) {
    return (
      <div className={styles["loading-container"]}>
        <div className={styles["loading-spinner"]}></div>
        <p>Loading guide item...</p>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className={styles["error-container"]}>
        <h1>Error</h1>
        <p>{error || "Guide not found"}</p>
        <button onClick={() => router.push("/guides")} className={styles["back-button"]}>
          Back to Guides
        </button>
      </div>
    );
  }

  const itemIndex = parseInt(params.index);
  const item = guide.items[itemIndex];

  if (!item) {
    return (
      <div className={styles["error-container"]}>
        <h1>Error</h1>
        <p>Item not found</p>
        <button onClick={() => router.push(`/guides/${guide.slug}`)} className={styles["back-button"]}>
          Back to Guide
        </button>
      </div>
    );
  }

  return (
    <div className={styles["guide-item-page"]}>
      <div className={styles["guide-item-container"]}>
        <div className={styles["guide-item-header"]}>
          <h1>{item.name}</h1>
          <button onClick={() => router.push(`/guides/${guide.slug}`)} className={styles["back-button"]}>
            Back to Guide
          </button>
        </div>

        <div className={styles["guide-item-content"]}>
          <div className={styles["guide-item-image"]}>
            <img src={item.image_url} alt={item.name} />
          </div>

          <div className={styles["guide-item-details"]}>
            <div className={styles["detail-group"]}>
              <h2>Description</h2>
              <p>{item.description}</p>
            </div>

            <div className={styles["detail-group"]}>
              <h2>Location</h2>
              <p>{item.location}</p>
            </div>

            {item.price && (
              <div className={styles["detail-group"]}>
                <h2>Price</h2>
                <p>{item.price}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 