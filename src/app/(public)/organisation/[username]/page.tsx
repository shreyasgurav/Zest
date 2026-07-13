'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
      const response = await fetch(`/api/pages/${username}`);
      if (!response.ok) {
        throw new Error('Organization not found');
      }

      const data = await response.json();
      
      if (data.page && data.page.type === 'organisation') {
        setOrgDetails(data.page as OrganisationData);
        setEventIds(data.events.map((e: any) => e.id));
        setEvents(data.events || []);
        setCollaboratedEventIds(data.collaboratedEvents || []);
      } else {
        setError("Organization not found");
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