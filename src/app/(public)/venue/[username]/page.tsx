'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { checkPageOwnership } from '@/domains/authentication/services/auth.service';
import { EventProfileCard } from '@/components/ui/EventCard';
import PublicVenueProfileSkeleton from './PublicVenueProfileSkeleton';
import styles from './PublicVenueProfile.module.css';

interface VenueData {
  uid?: string;
  name?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  venueType?: string;
  address?: string;
  city?: string;
  capacity?: number;
  ownerId?: string;
  gallery?: string[];
}

const PublicVenueProfile = () => {
  const params = useParams();
  const username = params?.username as string | undefined;
  const [venueDetails, setVenueDetails] = useState<VenueData | null>(null);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [collaboratedEventIds, setCollaboratedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'gallery' | 'past'>('upcoming');

  useEffect(() => {
    // Check if current user can manage this page
    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchVenueData = async () => {
      if (!username) {
        setError("Username is required");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/pages/${username}`);
        if (!response.ok) {
          throw new Error('Venue not found');
        }

        const data = await response.json();
        
        if (data.page && data.page.type === 'venue') {
          setVenueDetails(data.page as VenueData);
          setEventIds(data.events.map((e: any) => e.id));
          setCollaboratedEventIds(data.collaboratedEvents || []);
          
          if (currentUser && data.page.ownerId === currentUser.uid) {
            setCanManage(true);
          } else {
            setCanManage(false);
          }
        } else {
           setError("Venue not found");
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching venue data:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();
  }, [username, currentUser]);

  const handleManage = () => {
    // Redirect to management interface
    window.location.href = `/venue?page=${venueDetails?.uid}`;
  };

  const renderContent = () => {
    if (!venueDetails) return null;

    switch (activeTab) {
      case 'upcoming':
        return eventIds.length > 0 ? (
          <div className={styles.eventsGrid}>
            {eventIds.map((eventId) => (
              <EventProfileCard 
                key={eventId} 
                eventId={eventId}
                tags={collaboratedEventIds.includes(eventId) ? [{ 
                  type: 'collaboration', 
                  label: 'COLLAB',
                  metadata: { collaboratorName: venueDetails.name }
                }] : []}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            No upcoming events at the moment.
          </div>
        );

      case 'gallery':
        return venueDetails.gallery && venueDetails.gallery.length > 0 ? (
          <div className={styles.galleryGrid}>
            {venueDetails.gallery.map((imageUrl, index) => (
              <div key={index} className={styles.galleryItem}>
                <img 
                  src={imageUrl} 
                  alt={`${venueDetails.name} - Gallery Image ${index + 1}`}
                  className={styles.galleryImage}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            No gallery images available.
          </div>
        );

      case 'past':
        return eventIds.length > 0 ? (
          <div className={styles.eventsGrid}>
            {eventIds.map((eventId) => (
              <EventProfileCard 
                key={eventId} 
                eventId={eventId}
                tags={collaboratedEventIds.includes(eventId) ? [{ 
                  type: 'collaboration', 
                  label: 'COLLAB',
                  metadata: { collaboratorName: venueDetails.name }
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
    return <PublicVenueProfileSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!venueDetails) {
    return (
      <div className={styles.errorContainer}>
        <h2>Venue Not Found</h2>
        <p>The venue you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className={styles.venueProfileContainer}>
      {/* Banner Section */}
      <div className={styles.venueBannerSection}>
        <div className={styles.venueBanner}>
          {venueDetails.bannerImage ? (
            <img
              src={venueDetails.bannerImage}
              alt="Venue Banner"
              className={styles.bannerImage}
            />
          ) : (
            <div className={styles.defaultBanner} />
          )}
          <div className={styles.bannerOverlay} />
        </div>
        <div className={styles.venueProfileImageContainer}>
          {venueDetails.photoURL ? (
            <img 
              src={venueDetails.photoURL} 
              alt="Profile"
              className={styles.venueProfileImage}
            />
          ) : (
            <div className={styles.noPhoto}>
              {venueDetails.name ? venueDetails.name.charAt(0).toUpperCase() : 'V'}
            </div>
          )}
        </div>
      </div>

      {/* Venue Details Section */}
      <div className={styles.venueDetailsSection}>
        <div className={styles.venueHeader}>
          <div className={styles.venueName}>
            <h1>{venueDetails.name || "Venue Name"}</h1>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.venueUsername}>
              @{venueDetails.username || "username"}
            </div>
            {venueDetails.venueType && (
              <div className={styles.venueType}>
                {venueDetails.venueType}
              </div>
            )}
          </div>
          
          {venueDetails.bio && (
            <div className={styles.venueBio}>
              <p>{venueDetails.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <div className={styles.contentContainer}>
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'gallery' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            Gallery
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'past' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
        </div>

        <div className={styles.contentSection}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PublicVenueProfile; 