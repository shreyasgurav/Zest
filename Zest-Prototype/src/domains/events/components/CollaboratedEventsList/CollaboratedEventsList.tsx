'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EventContentCollaborationService } from '@/domains/events/services/content-collaboration.service';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import styles from './CollaboratedEventsList.module.css';

interface CollaboratedEventsListProps {
  pageId: string;
  pageType: 'artist' | 'organization' | 'venue';
}

interface CollaboratedEvent {
  id: string;
  title: string;
  eventImage?: string;
  date?: string;
  venue?: string;
  creator?: {
    pageType: string;
    pageName: string;
    pageUsername: string;
  };
}

const CollaboratedEventsList: React.FC<CollaboratedEventsListProps> = ({ pageId, pageType }) => {
  const router = useRouter();
  const [collaboratedEvents, setCollaboratedEvents] = useState<CollaboratedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pageId) {
      fetchCollaboratedEvents();
    }
  }, [pageId, pageType]);

  const fetchCollaboratedEvents = async () => {
    try {
      setLoading(true);
      
      // Get collaborated event IDs
      const eventIds = await EventContentCollaborationService.getCollaboratedEvents(pageId, pageType);
      
      // Fetch event details for each ID
      const db = getFirestore();
      const eventDetails = await Promise.all(
        eventIds.map(async (eventId) => {
          try {
            const eventDoc = await getDoc(doc(db, 'events', eventId));
            if (eventDoc.exists()) {
              const data = eventDoc.data();
              return {
                id: eventId,
                title: data.title || 'Untitled Event',
                eventImage: data.event_image,
                date: data.time_slots?.[0]?.date || data.date,
                venue: data.event_venue || data.venue,
                creator: data.creator
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching event ${eventId}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null entries and set state
      const validEvents = eventDetails.filter(event => event !== null) as CollaboratedEvent[];
      setCollaboratedEvents(validEvents);
    } catch (error) {
      console.error('Error fetching collaborated events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/event-profile/${eventId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading collaborated events...</p>
      </div>
    );
  }

  if (collaboratedEvents.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🤝</div>
        <h4>No Collaborated Events</h4>
        <p>You haven't collaborated on any events yet. Accept collaboration invites to see them here!</p>
      </div>
    );
  }

  return (
    <div className={styles.collaboratedEventsContainer}>
      <div className={styles.eventsGrid}>
        {collaboratedEvents.map((event) => (
          <div
            key={event.id}
                            className={styles.collaborationEventCard}
            onClick={() => handleEventClick(event.id)}
          >
            <div className={styles.eventImage}>
              {event.eventImage ? (
                <img src={event.eventImage} alt={event.title} />
              ) : (
                <div className={styles.placeholderImage}>
                  <span>🎵</span>
                </div>
              )}
            </div>
            
            <div className={styles.eventDetails}>
              <h4 className={styles.eventTitle}>{event.title}</h4>
              
              {event.date && (
                <p className={styles.eventDate}>
                  📅 {formatDate(event.date)}
                </p>
              )}
              
              {event.venue && (
                <p className={styles.eventVenue}>
                  📍 {event.venue}
                </p>
              )}
              
              {event.creator && (
                <p className={styles.eventCreator}>
                  By @{event.creator.pageUsername}
                </p>
              )}
            </div>
            
            <div className={styles.collabBadge}>COLLAB</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollaboratedEventsList; 