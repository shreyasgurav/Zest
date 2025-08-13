'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { checkPageOwnership } from '@/domains/authentication/services/auth.service';
import { EventContentCollaborationService } from '@/domains/events/services/content-collaboration.service';
import { EventCleanupService } from '@/domains/events/services/event-cleanup.service';
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
        const db = getFirestore();
        
        // First, find the artist by username
        const artistsQuery = query(
          collection(db, "Artists"),
          where("username", "==", username.toLowerCase())
        );
        const artistSnapshot = await getDocs(artistsQuery);
        
        if (artistSnapshot.empty) {
          setError("Artist not found");
          setLoading(false);
          return;
        }

        const artistDoc = artistSnapshot.docs[0];
        const artistData = artistDoc.data() as ArtistData;
        artistData.uid = artistDoc.id;
        setArtistDetails(artistData);

        // Fetch event IDs created by this artist page
        // Try both new creator.pageId and legacy organizationId for backward compatibility
        const [newEventsSnapshot, legacyEventsSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, "events"),
            where("creator.pageId", "==", artistDoc.id)
          )),
          getDocs(query(
            collection(db, "events"),
            where("organizationId", "==", artistData.ownerId || "")
          ))
        ]);
        
        // Combine and deduplicate events
        const allEventDocs = [...newEventsSnapshot.docs, ...legacyEventsSnapshot.docs];
        const uniqueEventDocs = allEventDocs.filter((doc, index, self) => 
          index === self.findIndex(d => d.id === doc.id)
        );
        
        // Filter legacy events to only include those that might belong to this artist
        const filteredEventDocs = uniqueEventDocs.filter(doc => {
          const data = doc.data();
          // If it has creator info, check if it's this artist page
          if (data.creator) {
            return data.creator.pageId === artistDoc.id;
          }
          // For legacy events, only include if they were created by the same user who owns this artist page
          return data.organizationId === artistData.ownerId;
        });
        
        // Get owned event IDs
        const ownedIds = filteredEventDocs.map(doc => doc.id);
        
        // Get collaborated event IDs
        const collaboratedIds = await EventContentCollaborationService.getCollaboratedEvents(
          artistDoc.id, 
          'artist'
        );
        
        // Combine owned and collaborated events (remove duplicates)
        const allEventIds = Array.from(new Set([...ownedIds, ...collaboratedIds]));
        setOwnedEventIds(allEventIds);
        setCollaboratedEventIds(collaboratedIds); // Keep collaborated IDs separate for COLLAB badge

        // 🧹 Background cleanup: Remove any orphaned collaborations
        try {
          await EventCleanupService.cleanupOrphanedData();
        } catch (cleanupError) {
          console.log('Background cleanup completed with some warnings:', cleanupError);
        }

        // Check if current user can manage this page
        if (currentUser && artistData.uid) {
          const canEdit = await checkPageOwnership(currentUser.uid, 'artist', artistData.uid);
          setCanManage(canEdit);
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [username, currentUser]);

  useEffect(() => {
    const fetchEvents = async () => {
      // Combine all event IDs first
      const allEventIds = Array.from(new Set([...ownedEventIds, ...collaboratedEventIds]));
      
      if (!allEventIds.length) return;

      try {
        const db = getFirestore();
        const eventDocs = await Promise.all(
          allEventIds.map(id => getDoc(doc(db, 'events', id)))
        );

        const eventsData = eventDocs
          .filter(doc => doc.exists())
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as EventData[];

        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [ownedEventIds, collaboratedEventIds]);

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