"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/infrastructure/firebase";
import { isOrganizationSession, getUserOwnedPages } from "@/domains/authentication/services/auth.service";
import { ContentSharingSecurity } from "@/shared/utils/security/contentSharingSecurity";
import styles from "./create.module.css";

const CreateType = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [creatorInfo, setCreatorInfo] = useState<{
    type: string;
    pageId: string;
    name: string;
    username: string;
  } | null>(null);
  const auth = getAuth();

  useEffect(() => {
    const checkAuth = async (user: any) => {
      if (!user) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get URL parameters
        const from = searchParams?.get('from');
        const pageId = searchParams?.get('pageId');
        const name = searchParams?.get('name');
        const username = searchParams?.get('username');

        // Set creator info if available
        if (from && pageId && name && username) {
          setCreatorInfo({
            type: from,
            pageId: decodeURIComponent(pageId),
            name: decodeURIComponent(name),
            username: decodeURIComponent(username)
          });
        }

        // Check if user has any pages to create from (owned or shared)
        const ownedPages = await getUserOwnedPages(user.uid);
        const hasOwnedPages = ownedPages.artists.length > 0 || 
                             ownedPages.organizations.length > 0 || 
                             ownedPages.venues.length > 0;

        // Also check for shared pages with editor+ access
        const sharedPages = await ContentSharingSecurity.getUserSharedContent(user.uid);
        const hasSharedPages = sharedPages.artists.length > 0 || 
                              sharedPages.organizations.length > 0 || 
                              sharedPages.venues.length > 0;

        const hasAnyPages = hasOwnedPages || hasSharedPages;

        if (hasAnyPages) {
          console.log("✅ User has pages (owned or shared), allowing access to create page", {
            owned: hasOwnedPages,
            shared: hasSharedPages,
            ownedCount: ownedPages.artists.length + ownedPages.organizations.length + ownedPages.venues.length,
            sharedCount: sharedPages.artists.length + sharedPages.organizations.length + sharedPages.venues.length
          });
          setIsAuthorized(true);
        } else {
          console.log("❌ User has no pages (owned or shared), denying access to create page");
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error checking authorization:", error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Check current user first
    const currentUser = auth.currentUser;
    if (currentUser) {
      checkAuth(currentUser);
    } else {
      setIsLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, checkAuth);
    return () => unsubscribe();
  }, [auth, searchParams]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: 'white'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles["unauthorized-message-container"]}>
        <div className={styles["unauthorized-message"]}>
          <h1>No Pages Found</h1>
          <p>You need to create at least one page (Artist, Organization, or Venue) before you can create content.</p>
          <button 
            onClick={() => router.push("/business")}
            className={styles["back-button"]}
          >
            Create Your First Page
          </button>
        </div>
      </div>
    );
  }

  const handleTypeSelection = (type: string) => {
    // Build URL with creator context if available
    const buildUrl = (basePath: string) => {
      if (creatorInfo) {
        const params = new URLSearchParams({
          from: creatorInfo.type,
          pageId: creatorInfo.pageId,
          name: creatorInfo.name,
          username: creatorInfo.username
        });
        return `${basePath}?${params.toString()}`;
      }
      return basePath;
    };

    switch (type) {
      case "event":
        router.push(buildUrl("/create/event"));
        break;
      case "workshop":
        router.push(buildUrl("/create/guide"));
        break;
      case "experience":
        router.push(buildUrl("/create-experience"));
        break;
      case "service":
        router.push(buildUrl("/create/activity"));
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles["type-selection-page"]}>
      <div className={styles["type-selection-container"]}>
        <h1 className={styles["page-title"]}>
          What would you like to create?
          {creatorInfo && (
            <span className={styles["creator-context"]}>
              as {creatorInfo.name} ({creatorInfo.type})
            </span>
          )}
        </h1>
        <div className={styles["type-grid"]}>
          <div
            className={styles["type-card"]}
            onClick={() => handleTypeSelection("event")}
          >
            <div className={styles["type-icon"]}>🎉</div>
            <h2>Event</h2>
            <p>Create a one-time or recurring event</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateType; 