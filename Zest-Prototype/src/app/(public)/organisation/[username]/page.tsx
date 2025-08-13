'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { EventContentCollaborationService } from '@/domains/events/services/content-collaboration.service';
import { EventCleanupService } from '@/domains/events/services/event-cleanup.service';
import styles from './PublicOrganisationProfile.module.css';
import { EventProfileCard } from '@/components/ui/EventCard';

interface OrganisationData {
  uid?: string;
  ownerId?: string;
  name?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
}

interface EventData {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  // ... add other event fields as needed
}

const PublicOrganisationProfile = () => {
  const params = useParams();
  const username = params?.username as string | undefined;
  const [orgDetails, setOrgDetails] = useState<OrganisationData | null>(null);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [collaboratedEventIds, setCollaboratedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [events, setEvents] = useState<EventData[]>([]);

  // Function to fetch organization data
  const fetchOrgData = async (isManualRefresh = false) => {
    if (!username) {
      setError("Username is required");
      setLoading(false);
      return;
    }

    if (isManualRefresh) {
      setRefreshing(true);
    }

    try {
      const db = getFirestore();
      
      // First, find the organization by username
      const orgsQuery = query(
        collection(db, "Organisations"),
        where("username", "==", username.toLowerCase())
      );
      const orgSnapshot = await getDocs(orgsQuery);
      
      if (orgSnapshot.empty) {
        setError("Organization not found");
        setLoading(false);
        return;
      }

      const orgDoc = orgSnapshot.docs[0];
      const orgData = orgDoc.data() as OrganisationData;
      orgData.uid = orgDoc.id;
      setOrgDetails(orgData);

      // Fetch event IDs created by this organization page
      // Try both new creator.pageId and legacy organizationId for backward compatibility
      const [newEventsSnapshot, legacyEventsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, "events"),
          where("creator.pageId", "==", orgDoc.id)
        )),
        getDocs(query(
          collection(db, "events"),
          where("organizationId", "==", orgDoc.id)
        ))
      ]);
      
      // Combine and deduplicate events
      const allEventDocs = [...newEventsSnapshot.docs, ...legacyEventsSnapshot.docs];
      const uniqueEventDocs = allEventDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      
      // Get owned event IDs
      const ownedIds = uniqueEventDocs.map(doc => doc.id);
      
      // Get collaborated event IDs
      const collaboratedIds = await EventContentCollaborationService.getCollaboratedEvents(
        orgDoc.id, 
        'organization'
      );
      
      // Combine owned and collaborated events (remove duplicates)
      const allEventIds = Array.from(new Set([...ownedIds, ...collaboratedIds]));
      setEventIds(allEventIds);
      setCollaboratedEventIds(collaboratedIds);

      // 🧹 Background cleanup: Remove any orphaned collaborations
      try {
        await EventCleanupService.cleanupOrphanedData();
      } catch (cleanupError) {
        console.log('Background cleanup completed with some warnings:', cleanupError);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching organization data:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchOrgData(true);
  };

  useEffect(() => {
    fetchOrgData();

    // Set up an interval to refresh data every 5 seconds (reduced from 10 for better responsiveness)
    const refreshInterval = setInterval(() => {
      console.log('🔄 Refreshing organization data...');
      fetchOrgData();
    }, 5000);

    // Also refresh when the page becomes visible again (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page became visible, refreshing data...');
        fetchOrgData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup interval and event listener on unmount
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [username]);

  useEffect(() => {
    const fetchEvents = async () => {
      // Combine all event IDs first
      const allEventIds = Array.from(new Set([...eventIds, ...collaboratedEventIds]));
      
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
  }, [eventIds, collaboratedEventIds]);

  const renderContent = () => {
    if (!orgDetails) return null;

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
                  metadata: { collaboratorName: orgDetails.name }
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
        return eventIds.length > 0 ? (
          <div className={styles.eventsGrid}>
            {eventIds.map((eventId) => (
              <EventProfileCard 
                key={eventId} 
                eventId={eventId}
                tags={collaboratedEventIds.includes(eventId) ? [{ 
                  type: 'collaboration', 
                  label: 'COLLAB',
                  metadata: { collaboratorName: orgDetails.name }
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
      <div className={styles.loadingContainer}>
        <div className={styles.skeletonBanner}></div>
        <div className={styles.skeletonProfileImage}></div>
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonName}></div>
          <div className={styles.skeletonUsername}></div>
          <div className={styles.skeletonBio}></div>
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

  if (!orgDetails) {
    return (
      <div className={styles.errorContainer}>
        <h2>Organization Not Found</h2>
        <p>The organization you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className={styles.orgProfileContainer}>
      {/* Banner and Profile Image Section */}
      <div className={styles.orgBannerSection}>
        <div className={styles.orgBanner}>
          {orgDetails.bannerImage ? (
            <img
              src={orgDetails.bannerImage}
              alt="Organization Banner"
              className={styles.bannerImage}
            />
          ) : (
            <div className={styles.defaultBanner} />
          )}
        </div>
        <div className={styles.orgProfileImageContainer}>
          {orgDetails.photoURL ? (
            <img 
              src={orgDetails.photoURL} 
              alt="Profile"
              className={styles.orgProfileImage}
            />
          ) : (
            <div className={styles.noPhoto}>No profile photo</div>
          )}
        </div>
      </div>

      {/* Organization Details Section */}
      <div className={styles.orgDetailsSection}>
        <div className={styles.orgName}>
          <h3>{orgDetails.name || "Organization Name"}</h3>
        </div>
        <div className={styles.orgUsername}>
          <span>@{orgDetails.username || "username"}</span>
        </div>
        {orgDetails.bio && orgDetails.bio.trim() && (
          <div className={styles.orgBio}>
            <p>{orgDetails.bio}</p>
          </div>
        )}
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

export default PublicOrganisationProfile; 