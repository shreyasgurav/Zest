'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import styles from './EventProfile.module.css';
import { FaBookmark, FaCalendarAlt, FaMapMarkerAlt, FaLanguage, FaClock, FaUsers, FaInfo } from 'react-icons/fa';
import EventProfileSkeleton from './EventProfileSkeleton';

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface GuideOption {
  id: string;
  label: string;
  placeholder: string;
}

const GUIDE_OPTIONS: GuideOption[] = [
  { id: 'duration', label: 'Duration', placeholder: 'e.g., 2 hours' },
  { id: 'age_requirement', label: 'Age Requirement', placeholder: 'e.g., 16+ years' },
  { id: 'language', label: 'Language', placeholder: 'e.g., Hindi, English' },
  { id: 'seating', label: 'Seating Arrangement', placeholder: 'e.g., Theater, Round Table' },
  { id: 'kid_friendly', label: 'Kid Friendly', placeholder: 'e.g., Yes/No or details' },
  { id: 'pet_friendly', label: 'Pet Friendly', placeholder: 'e.g., Yes/No or details' },
  { id: 'wheelchair', label: 'Wheelchair Accessible', placeholder: 'e.g., Yes/No or details' },
  { id: 'parking', label: 'Parking Available', placeholder: 'e.g., Yes/No or details' },
  { id: 'food', label: 'Food & Beverages', placeholder: 'e.g., Snacks, Dinner, Drinks' },
  { id: 'outdoor', label: 'Outdoor Event', placeholder: 'e.g., Yes/No or details' },
  { id: 'indoor', label: 'Indoor Event', placeholder: 'e.g., Yes/No or details' },
  { id: 'dress_code', label: 'Dress Code', placeholder: 'e.g., Formal, Casual' },
  { id: 'photography', label: 'Photography Allowed?', placeholder: 'e.g., Yes/No or details' },
  { id: 'alcohol', label: 'Alcohol allowed?', placeholder: 'e.g., Yes/No or details' },
];

interface EventData {
  id: string;
  eventTitle: string;
  type: string;
  eventDateTime?: any;
  eventVenue: string;
  eventRegistrationLink?: string;
  hostingClub: string;
  organization_username?: string;
  aboutEvent: string;
  eventImage: string;
  event_category?: string;
  event_languages?: string;
  event_duration?: string;
  event_age_limit?: string;
  time_slots?: TimeSlot[];
  event_guides?: { [key: string]: string };
}

function EventProfile() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllGuides, setShowAllGuides] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Date not set';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).replace(/(\d+)/, '$1th'); // Add ordinal suffix
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date format';
    }
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return 'Time not set';
    
    try {
      const [hours, minutes] = timeString.split(':');
      if (!hours || !minutes) return 'Invalid time format';
      
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time format';
    }
  };

  const handleLocationClick = () => {
    if (event?.eventVenue) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.eventVenue)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!params?.id) return;

      try {
        const eventDoc = doc(db, "events", params.id);
        const eventSnapshot = await getDoc(eventDoc);
        
        if (eventSnapshot.exists()) {
          const data = eventSnapshot.data();
          setEvent({
            id: eventSnapshot.id,
            eventTitle: data.title || data.eventTitle || '',
            type: data.event_type || data.type || 'event',
            eventDateTime: data.event_date_time || data.eventDateTime,
            eventVenue: data.event_venue || data.eventVenue || '',
            eventRegistrationLink: data.event_registration_link || data.eventRegistrationLink,
            hostingClub: data.hosting_club || data.hostingClub || '',
            organization_username: data.organization_username || '',
            aboutEvent: data.about_event || data.aboutEvent || '',
            eventImage: data.event_image || data.eventImage || '',
            event_category: data.event_category || '',
            event_languages: data.event_languages || '',
            event_duration: data.event_duration || '',
            event_age_limit: data.event_age_limit || '',
            time_slots: data.time_slots || [],
            event_guides: data.event_guides || {}
          });
        } else {
          setError("Event not found");
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Error loading event");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params?.id]);

  const handleBookNow = () => {
    console.log("Navigating to booking flow with ID:", params?.id);
    router.push(`/book-event/${params?.id}`);
  };

  const handleOrganizationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (event?.organization_username) {
      router.push(`/organisation/${event.organization_username}`);
    }
  };

  // Check if current user is an organization (uses phone auth)
  const isOrganization = user?.providerData[0]?.providerId === 'phone';

  if (loading) {
    return <EventProfileSkeleton />;
  }

  if (error || !event) {
    return <div className={styles.errorMessage}>{error || "Event not found"}</div>;
  }

  const { eventImage, eventTitle, eventVenue, hostingClub, aboutEvent, time_slots } = event;

  // Determine the date text for the profile
  const dateText = time_slots && time_slots.length > 0 
    ? time_slots.length > 1 
      ? `${formatDate(time_slots[0].date)} onwards` 
      : formatDate(time_slots[0].date)
    : 'Date to be announced';

  return (
    <div className={styles.eventProfileContainer}>
      <div className={styles.eventContent}>
        <div className={styles.eventProfileImage}>
          {eventImage ? (
            <img src={eventImage} alt={eventTitle} />
          ) : (
            <div className={styles.noImage}>No Image Available</div>
          )}
        </div>
        <div className={styles.eventInfoBox}>
          <div className={styles.eventInfo}>
            <h2>{eventTitle}</h2>
            <div 
              className={styles.hostingClub} 
              onClick={handleOrganizationClick}
              style={{ cursor: 'pointer' }}
            >
              By <span className={styles.organizationLink}>{hostingClub}</span>
            </div>
            {event.event_category && (
              <div className={styles.eventDetail}>
                <FaBookmark /> {event.event_category}
              </div>
            )}
            <div className={styles.eventDetail}>
              <FaCalendarAlt /> {dateText}
            </div>
            {time_slots && time_slots.map((slot, index) => (
              <div key={index} className={styles.eventDetail}>
                <FaClock /> {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </div>
            ))}
            <div 
              className={`${styles.eventDetail} ${styles.locationDetail}`}
              onClick={handleLocationClick}
              style={{ cursor: 'pointer' }}
            >
              <FaMapMarkerAlt /> {eventVenue}
            </div>
            
            {/* Only show Book Now button for regular users, not organizations */}
            {!isOrganization && user && (
              <div className={styles.eventPrice}>
                <button 
                  className={styles.bookNowButton} 
                  onClick={handleBookNow}
                >
                  Book Now
                </button>
              </div>
            )}

            {/* Show message for organizations */}
            {isOrganization && (
              <div className={styles.orgMessage}>
                <p>As an organization, you can explore events but cannot book them.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.aboutEvent}>
        <h3>About the Event</h3>
        <p>{aboutEvent || "Join us for an engaging event designed to enhance your skills and creativity. Don't miss out on this opportunity!"}</p>
      </div>
      
      <div className={styles.eventGuide}>
        <h3>Event Guide</h3>
        <div className={styles.guideDetails}>
          {event.event_guides && Object.entries(event.event_guides)
            .slice(0, showAllGuides ? undefined : 3)
            .map(([key, value]) => {
              const guideOption = GUIDE_OPTIONS.find(option => option.id === key);
              if (!guideOption) return null;
              
              return (
                <div key={key} className={styles.guideItem}>
                  <div className={styles.guideIcon}>
                    <FaInfo />
                  </div>
                  <div className={styles.guideInfo}>
                    <span className={styles.guideLabel}>{guideOption.label}</span>
                    <span className={styles.guideValue}>{value}</span>
                  </div>
                </div>
              );
            })}
        </div>
        {event.event_guides && Object.keys(event.event_guides).length > 3 && (
          <button 
            className={styles.moreGuidesButton}
            onClick={() => setShowAllGuides(!showAllGuides)}
          >
            {showAllGuides ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    </div>
  );
}

export default EventProfile; 