'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { checkPageOwnership } from '@/domains/authentication/services/auth.service';
import { EventProfileCard } from '@/components/ui/EventCard';
import styles from './PublicArtistProfile.module.css';

interface ArtistData {
  uid?: string;
  name?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  genre?: string;
  location?: string;
  ownerId?: string;
}

interface EventData {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  // ... add other event fields as needed
}

const PublicArtistProfile = () => {
  const params = useParams();
  const username = params?.username as string | undefined;
  const [artistDetails, setArtistDetails] = useState<ArtistData | null>(null);
  const [ownedEventIds, setOwnedEventIds] = useState<string[]>([]);
  const [collaboratedEventIds, setCollaboratedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    // Check if current user can manage this page
    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!username) {
        setError("Username is required");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/pages/${username}`);
        if (!response.ok) {
          throw new Error('Artist not found');
        }

        const data = await response.json();
        
        if (data.page && data.page.type === 'artist') {
          setArtistDetails(data.page as ArtistData);
          setEvents(data.events || []);
          
          if (currentUser && data.page.ownerId === currentUser.uid) {
            setCanManage(true);
          } else {
            setCanManage(false);
          }
        } else {
           setError("Artist not found");
        }
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [username, currentUser]);

  const handleManage = () => {
    // Redirect to management interface
    window.location.href = `/artist?page=${artistDetails?.uid}`;
  };

  const renderContent = () => {
    if (!artistDetails) return null;

    switch (activeTab) {
      case 'upcoming':
        return ownedEventIds.length > 0 ? (
          <div className={styles.eventsGrid}>
            {ownedEventIds.map((eventId) => (
              <EventProfileCard 
                key={eventId} 
                eventId={eventId}
                tags={collaboratedEventIds.includes(eventId) ? [{ 
                  type: 'collaboration', 
                  label: 'COLLAB',
                  metadata: { collaboratorName: artistDetails.name }
                }] : []}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            No upcoming events at the moment.
          </div>
        );

      case 'past':
        return ownedEventIds.length > 0 ? (
          <div className={styles.eventsGrid}>
            {ownedEventIds.map((eventId) => (
              <EventProfileCard 
                key={eventId} 
                eventId={eventId}
                tags={collaboratedEventIds.includes(eventId) ? [{ 
                  type: 'collaboration', 
                  label: 'COLLAB',
                  metadata: { collaboratorName: artistDetails.name }
                }] : []}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            No past events to show.
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={styles.artistProfileContainer}>
        {/* Spotify-Style Banner Skeleton */}
        <div className={styles.artistBannerSection}>
          <div className={styles.artistBanner}>
            <div className={`${styles.skeletonBannerImage} ${styles.animatePulse}`} />
            <div className={styles.bannerOverlay} />
          </div>

          {/* Artist Info Skeleton */}
          <div className={styles.artistDetailsSection}>
            <div className={styles.artistHeader}>
              {/* Profile Image Skeleton */}
              <div className={`${styles.artistProfileImageContainer} ${styles.skeletonProfileImageContainer}`}>
                <div className={`${styles.skeletonProfileImage} ${styles.animatePulse}`} />
              </div>
              
              <div className={styles.artistInfo}>
                <div className={styles.artistName}>
                  <div className={`${styles.skeletonArtistName} ${styles.animatePulse}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section Skeleton */}
        <div className={styles.contentSection}>
          {/* Artist Meta Skeleton */}
          <div className={styles.artistMetaSection}>
            <div className={`${styles.skeletonUsername} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonGenre} ${styles.animatePulse}`} />
          </div>
          
          <div className={styles.bioSection}>
            <div className={`${styles.skeletonBioLine} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonBioLine} ${styles.w75} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonBioLine} ${styles.w50} ${styles.animatePulse}`} />
          </div>
        </div>

        {/* Events Section Skeleton */}
        <div className={styles.eventsSection}>
          <div className={`${styles.skeletonEventsHeading} ${styles.animatePulse}`} />
          <div className={styles.eventsGrid}>
            <div className={`${styles.skeletonEventCard} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonEventCard} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonEventCard} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonEventCard} ${styles.animatePulse}`} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!artistDetails) {
    return (
      <div className={styles.errorContainer}>
        <h2>Artist Not Found</h2>
        <p>The artist you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className={styles.artistProfileContainer}>
      {/* Spotify-Style Banner Section */}
      <div className={styles.artistBannerSection}>
        <div className={styles.artistBanner}>
          {artistDetails.bannerImage ? (
            <img
              src={artistDetails.bannerImage}
              alt="Artist Banner"
              className={styles.bannerImage}
            />
          ) : (
            <div className={styles.defaultBanner} />
          )}
          <div className={styles.bannerOverlay} />
        </div>

        {/* Artist Info Overlay */}
        <div className={styles.artistDetailsSection}>
          <div className={styles.artistHeader}>
            {/* Artist Profile Image */}
            <div className={styles.artistProfileImageContainer}>
              {artistDetails.photoURL ? (
                <img 
                  src={artistDetails.photoURL} 
                  alt="Profile"
                  className={styles.artistProfileImage}
                />
              ) : (
                <div className={styles.noPhoto}>
                  {artistDetails.name ? artistDetails.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
            </div>
            
            <div className={styles.artistInfo}>
              <div className={styles.artistName}>
                <h1>{artistDetails.name || "Artist Name"}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.contentSection}>
        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'past' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
        </div>

        {/* Events Grid */}
        {renderContent()}
      </div>
    </div>
  );
};

export default PublicArtistProfile; 