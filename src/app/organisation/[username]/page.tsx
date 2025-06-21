'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import styles from './PublicOrganisationProfile.module.css';
import EventBox from '@/components/EventsSection/EventBox/EventBox';

interface OrganisationData {
  uid?: string;
  name?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
}

interface Event {
  id: string;
  eventTitle: string;
  eventType: string;
  hostingClub: string;
  eventDateTime?: any;
  eventVenue: string;
  eventRegistrationLink?: string;
  aboutEvent: string;
  event_image: string;
  organizationId: string;
  title?: string;
  hosting_club?: string;
  event_venue?: string;
  about_event?: string;
  time_slots?: Array<{
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
  }>;
  tickets?: Array<{
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
  createdAt: any;
}

const PublicOrganisationProfile = () => {
  const params = useParams();
  const username = params?.username as string | undefined;
  const [orgDetails, setOrgDetails] = useState<OrganisationData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgData = async () => {
      if (!username) {
        setError("Username is required");
        setLoading(false);
        return;
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

        // Then fetch their events
        const eventsQuery = query(
          collection(db, "events"),
          where("organizationId", "==", orgDoc.id)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];

        setEvents(eventsData);
        setError(null);
      } catch (err) {
        console.error("Error fetching organization data:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [username]);

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
        <div className={styles.orgBio}>
          <p>{orgDetails.bio || "No bio available"}</p>
        </div>
      </div>

      {/* Events Section */}
      <div className={styles.eventsSection}>
        <h2 className={styles.eventsHeading}>Upcoming Events</h2>
        {events.length === 0 ? (
          <div className={styles.noEventsMessage}>
            No upcoming events at the moment.
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            {events.map((event) => (
              <EventBox key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicOrganisationProfile; 