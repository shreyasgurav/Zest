'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/infrastructure/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { isOrganizationSession } from '@/domains/authentication/services/auth.service';
import { EventContentCollaborationService, EventContentCollaboration } from '@/domains/events/services/content-collaboration.service';
import styles from './EventProfile.module.css';
import { FaBookmark, FaCalendarAlt, FaMapMarkerAlt, FaLanguage, FaClock, FaUsers, FaInfo, FaTicketAlt, FaRupeeSign } from 'react-icons/fa';
import { MapPin } from 'lucide-react';
import EventProfileSkeleton from './EventProfileSkeleton';

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  session_id?: string;
}

interface TicketType {
  name: string;
  price: number;
  capacity: number;
  available_capacity: number;
}

// NEW: Session interface for session-centric events
interface EventSession {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date?: string; // Optional end date for multi-day sessions
  venue?: string;
  description?: string;
  tickets: Array<{
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
  available: boolean;
  maxCapacity?: number;
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

interface CreatorProfile {
  photoURL?: string;
  profileImage?: string;
  name: string;
  username: string;
  type: 'artist' | 'organisation' | 'venue';
  pageId: string;
}

interface Attendee {
  id: string;
  tickets?: Record<string, number>;
  eventId: string;
  sessionId?: string;
  ticketType?: string;
  canCheckInIndependently?: boolean;
}

interface EventData {
  id: string;
  title: string;
  eventTitle?: string;
  event_type?: string;
  type?: string;
  architecture?: 'legacy' | 'session-centric';
  eventDateTime?: any;
  event_venue: string;
  eventVenue?: string;
  eventRegistrationLink?: string;
  hosting_club: string;
  hostingClub?: string;
  organization_username?: string;
  about_event: string;
  aboutEvent?: string;
  event_image: string;
  eventImage?: string;
  event_categories?: string[];
  eventCategories?: string[];
  event_languages?: string;
  event_duration?: string;
  event_age_limit?: string;
  
  // Legacy fields
  time_slots?: TimeSlot[];
  tickets?: TicketType[];
  
  // NEW: Session-centric fields
  sessions?: EventSession[];
  venue_type?: 'global' | 'per_session';
  total_sessions?: number;
  total_capacity?: number;
  
  event_guides?: { [key: string]: string };
  creator?: {
    type: 'artist' | 'organisation' | 'venue';
    pageId: string;
    name: string;
    username: string;
    userId: string;
  };
  collaborations?: EventContentCollaboration[];
}

function EventProfile() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllGuides, setShowAllGuides] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isOrganization, setIsOrganization] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [collaborations, setCollaborations] = useState<EventContentCollaboration[]>([]);
  const [allCreatorProfiles, setAllCreatorProfiles] = useState<CreatorProfile[]>([]);
  const [showCollaboratorsPopup, setShowCollaboratorsPopup] = useState(false);
  const [ticketAvailability, setTicketAvailability] = useState<TicketType[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check if this is an organization session
        const orgSession = isOrganizationSession();
        
        if (orgSession) {
          // Check if organization profile exists
          try {
            const orgRef = doc(db(), "Organisations", currentUser.uid);
            const orgSnap = await getDoc(orgRef);
            setIsOrganization(orgSnap.exists());
          } catch (error) {
            console.error("Error checking organization profile:", error);
            setIsOrganization(false);
          }
        } else {
          // This is a user session
          setIsOrganization(false);
        }
      } else {
        setIsOrganization(false);
      }
      
      setProfileLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Calculate real-time ticket availability - UPDATED for session-centric
  const calculateTicketAvailability = async (eventData: EventData) => {
    try {
      // Fetch actual attendees to calculate real availability
      const attendeesRef = collection(db(), 'eventAttendees');
      const attendeesQuery = query(
        attendeesRef,
        where('eventId', '==', eventData.id)
      );

      const snapshot = await getDocs(attendeesQuery);
      const attendees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendee[];

      let allTickets: TicketType[] = [];

      // Handle session-centric events
      if (eventData.architecture === 'session-centric' && eventData.sessions) {
        // For session-centric events, aggregate tickets across all sessions
        const ticketMap = new Map<string, TicketType>();
        
        eventData.sessions.forEach(session => {
          session.tickets.forEach(ticket => {
            const key = ticket.name;
            if (ticketMap.has(key)) {
              const existing = ticketMap.get(key)!;
              existing.capacity += ticket.capacity;
              existing.available_capacity += ticket.available_capacity;
            } else {
              ticketMap.set(key, {
                name: ticket.name,
                price: ticket.price,
                capacity: ticket.capacity,
                available_capacity: ticket.available_capacity
              });
            }
          });
        });

        allTickets = Array.from(ticketMap.values());

        // Calculate real-time availability for session-centric
        const updatedTickets = allTickets.map(ticket => {
          const soldCount = attendees.reduce((count, attendee) => {
            // Handle individual attendee records (new format)
            if (attendee.canCheckInIndependently && attendee.ticketType === ticket.name) {
              return count + 1;
            }
            // Handle group booking records (old format)
            if (typeof attendee.tickets === 'object' && attendee.tickets) {
              return count + (attendee.tickets[ticket.name] || 0);
            }
            return count;
          }, 0);
          
          return {
            ...ticket,
            available_capacity: Math.max(0, ticket.capacity - soldCount)
          };
        });

        setTicketAvailability(updatedTickets);
        return updatedTickets;
      } 
      // Handle legacy events
      else if (eventData.tickets && eventData.tickets.length > 0) {
        const updatedTickets = eventData.tickets.map(ticket => {
          const soldCount = attendees.reduce((count, attendee) => {
            // Handle individual attendee records (new format)
            if (attendee.canCheckInIndependently && attendee.ticketType === ticket.name) {
              return count + 1;
            }
            // Handle group booking records (old format)
            if (typeof attendee.tickets === 'object' && attendee.tickets) {
              return count + (attendee.tickets[ticket.name] || 0);
            }
            return count;
          }, 0);
          
          return {
            ...ticket,
            available_capacity: Math.max(0, ticket.capacity - soldCount)
          };
        });

        setTicketAvailability(updatedTickets);
        return updatedTickets;
      }

      setTicketAvailability([]);
      return [];
    } catch (error) {
      console.error('Error calculating ticket availability:', error);
      // Fallback to original capacity if calculation fails
      const fallbackTickets = eventData.tickets || [];
      setTicketAvailability(fallbackTickets);
      return fallbackTickets;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Date not set';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
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

  // Helper function to extract date components for card display
  const getDateComponents = (dateString: string | undefined) => {
    if (!dateString) return { month: 'TBD', date: '??', day: 'To be announced', fullDate: 'Date to be announced' };
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { month: 'INV', date: '??', day: 'Invalid', fullDate: 'Invalid date' };
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        date: date.getDate().toString(),
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        fullDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      };
    } catch (error) {
      console.error('Error extracting date components:', error);
      return { month: 'ERR', date: '??', day: 'Error', fullDate: 'Error in date' };
    }
  };

  // Helper function to get time slot display
  const getTimeSlotDisplay = () => {
    if (!event) return 'Time TBD';
    
    if (event.architecture === 'session-centric' && event.sessions && event.sessions.length > 0) {
      const firstSession = event.sessions[0];
      if (firstSession.start_time && firstSession.end_time) {
        return `${formatTime(firstSession.start_time)} - ${formatTime(firstSession.end_time)}`;
      }
      return 'Time TBD';
    } else if (event.time_slots && event.time_slots.length > 0) {
      const firstSlot = event.time_slots[0];
      if (firstSlot.start_time && firstSlot.end_time) {
        return `${formatTime(firstSlot.start_time)} - ${formatTime(firstSlot.end_time)}`;
      }
      return 'Time TBD';
    }
    return 'Time TBD';
  };

  const handleLocationClick = () => {
    if (event?.event_venue) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.event_venue)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const getCreatorDisplayName = () => {
    if (allCreatorProfiles.length > 0) {
      if (allCreatorProfiles.length === 1) {
        return allCreatorProfiles[0].name;
      } else if (allCreatorProfiles.length === 2) {
        return `${allCreatorProfiles[0].name} and ${allCreatorProfiles[1].name}`;
      } else {
        return `${allCreatorProfiles[0].name}, ${allCreatorProfiles[1].name} and ${allCreatorProfiles.length - 2} other${allCreatorProfiles.length - 2 === 1 ? '' : 's'}`;
      }
    }
    
    // Fallback for legacy events
    if (event?.creator) {
      return event.creator.name;
    }
    return event?.hosting_club || event?.hostingClub || 'Unknown Creator';
  };

  const getCreatorType = () => {
    if (event?.creator) {
      return event.creator.type;
    }
    return 'organisation'; // Default for legacy events
  };

  const getAvailabilityStatus = (ticket: TicketType) => {
    const percentage = (ticket.available_capacity / ticket.capacity) * 100;
    if (ticket.available_capacity === 0) {
      return { status: 'sold-out', text: 'SOLD OUT', color: '#ef4444' };
    } else if (percentage <= 10) {
      return { status: 'critical', text: 'Almost Sold Out!', color: '#f59e0b' };
    } else if (percentage <= 25) {
      return { status: 'low', text: 'Limited Availability', color: '#f59e0b' };
    } else {
      return { status: 'high', text: 'Available', color: '#10b981' };
    }
  };

  // NEW: Get display data for both legacy and session-centric events
  const getEventDisplayData = () => {
    if (!event) return null;

    // Handle session-centric events
    if (event.architecture === 'session-centric' && event.sessions) {
      const firstSession = event.sessions[0];
      const allDates = event.sessions.map(s => s.date).sort();
      const uniqueDates = Array.from(new Set(allDates));
      
      // Check if any session is multi-day
      const hasMultiDaySessions = event.sessions.some(session => 
        session.end_date && session.end_date !== session.date
      );
      
      let dateText = '';
      if (uniqueDates.length > 1) {
        dateText = `${formatDate(uniqueDates[0])} onwards`;
      } else if (hasMultiDaySessions) {
        // Show date range for multi-day events
        const firstSessionWithEndDate = event.sessions.find(session => 
          session.end_date && session.end_date !== session.date
        );
        if (firstSessionWithEndDate) {
          const endDate = firstSessionWithEndDate.end_date;
          dateText = `${formatDate(uniqueDates[0])} - ${formatDate(endDate)}`;
        } else {
          dateText = formatDate(uniqueDates[0]);
        }
      } else {
        dateText = formatDate(uniqueDates[0]);
      }
      
      return {
        dateText,
        timeSlots: event.sessions.map(session => ({
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time,
          end_date: session.end_date,
          sessionName: session.name,
          venue: session.venue || event.event_venue
        })),
        venue: event.venue_type === 'per_session' ? 'Multiple Venues' : event.event_venue,
        isSessionCentric: true
      };
    }
    // Handle legacy events
    else {
      const timeSlots = event.time_slots || [];
      return {
        dateText: timeSlots.length > 0 
          ? timeSlots.length > 1 
            ? `${formatDate(timeSlots[0].date)} onwards` 
            : formatDate(timeSlots[0].date)
          : 'Date to be announced',
        timeSlots: timeSlots,
        venue: event.event_venue,
        isSessionCentric: false
      };
    }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!params?.id) return;

      try {
        const eventDoc = doc(db(), "events", params.id);
        const eventSnapshot = await getDoc(eventDoc);
        
        if (eventSnapshot.exists()) {
          const data = eventSnapshot.data();
          const eventData: EventData = {
            id: eventSnapshot.id,
            title: data.title || data.eventTitle || '',
            eventTitle: data.eventTitle,
            event_type: data.event_type,
            type: data.type,
            architecture: data.architecture || 'legacy',
            eventDateTime: data.event_date_time || data.eventDateTime,
            event_venue: data.event_venue || data.eventVenue || '',
            eventVenue: data.eventVenue,
            eventRegistrationLink: data.event_registration_link || data.eventRegistrationLink,
            hosting_club: data.hosting_club || data.hostingClub || '',
            hostingClub: data.hostingClub,
            organization_username: data.organization_username || '',
            about_event: data.about_event || data.aboutEvent || '',
            aboutEvent: data.aboutEvent,
            event_image: data.event_image || data.eventImage || '',
            eventImage: data.eventImage,
            event_categories: data.event_categories || [],
            eventCategories: data.eventCategories || [],
            event_languages: data.event_languages || '',
            event_duration: data.event_duration || '',
            event_age_limit: data.event_age_limit || '',
            
            // Legacy fields
            time_slots: data.time_slots || [],
            tickets: data.tickets || [],
            
            // Session-centric fields
            sessions: data.sessions || [],
            venue_type: data.venue_type || 'global',
            total_sessions: data.total_sessions || 0,
            total_capacity: data.total_capacity || 0,
            
            event_guides: data.event_guides || {},
            creator: data.creator || null,
            collaborations: data.collaborations || []
          };
          
          setEvent(eventData);
          
          // Calculate ticket availability
          await calculateTicketAvailability(eventData);
          
          // Fetch collaborations and all creator profiles
          const eventCollaborations = await fetchCollaborations(eventData.id);
          await fetchAllCreatorProfiles(eventData, eventCollaborations);
          
          // Fetch creator profile if creator exists (for backward compatibility)
          if (eventData.creator) {
            fetchCreatorProfile(eventData.creator);
          }
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

  const fetchCreatorProfile = async (creator: any) => {
    if (!creator) return;
    
    try {
      let collectionName = '';
      switch (creator.type) {
        case 'artist':
          collectionName = 'Artists';
          break;
        case 'organisation':
          collectionName = 'Organisations';
          break;
        case 'venue':
          collectionName = 'Venues';
          break;
        default:
          return;
      }
      
      const creatorDoc = doc(db(), collectionName, creator.pageId);
      const creatorSnapshot = await getDoc(creatorDoc);
      
      if (creatorSnapshot.exists()) {
        const data = creatorSnapshot.data();
        setCreatorProfile({
          photoURL: data.photoURL || data.profileImage || '',
          profileImage: data.profileImage || data.photoURL || '',
          name: data.name || creator.name,
          username: data.username || creator.username,
          type: creator.type,
          pageId: creator.pageId
        });
      }
    } catch (error) {
      console.error('Error fetching creator profile:', error);
    }
  };

  const fetchCollaborations = async (eventId: string) => {
    try {
      const eventCollaborations = await EventContentCollaborationService.getEventCollaborations(eventId);
      setCollaborations(eventCollaborations);
      return eventCollaborations;
    } catch (error) {
      console.error('Error fetching collaborations:', error);
      return [];
    }
  };

  const fetchAllCreatorProfiles = async (event: EventData, collaborations: EventContentCollaboration[]) => {
    try {
      const profiles: CreatorProfile[] = [];
      
      // Add main creator if exists
      if (event.creator) {
        try {
          let collectionName = '';
          switch (event.creator.type) {
            case 'artist':
              collectionName = 'Artists';
              break;
            case 'organisation':
              collectionName = 'Organisations';
              break;
            case 'venue':
              collectionName = 'Venues';
              break;
            default:
              return;
          }
          
          const creatorDoc = doc(db(), collectionName, event.creator.pageId);
          const creatorSnapshot = await getDoc(creatorDoc);
          
          if (creatorSnapshot.exists()) {
            const data = creatorSnapshot.data();
            profiles.push({
              photoURL: data.photoURL || data.profileImage || '',
              profileImage: data.profileImage || data.photoURL || '',
              name: data.name || event.creator.name,
              username: data.username || event.creator.username,
              type: event.creator.type,
              pageId: event.creator.pageId
            });
          }
        } catch (error) {
          console.error('Error fetching main creator profile:', error);
        }
      }
      
      // Add collaborator profiles
      for (const collaboration of collaborations) {
        try {
          let collectionName = '';
          switch (collaboration.collaboratorPageType) {
            case 'artist':
              collectionName = 'Artists';
              break;
            case 'organization':
              collectionName = 'Organisations';
              break;
            case 'venue':
              collectionName = 'Venues';
              break;
            default:
              continue;
          }
          
          const collaboratorDoc = doc(db(), collectionName, collaboration.collaboratorPageId);
          const collaboratorSnapshot = await getDoc(collaboratorDoc);
          
          if (collaboratorSnapshot.exists()) {
            const data = collaboratorSnapshot.data();
            profiles.push({
              photoURL: data.photoURL || data.profileImage || '',
              profileImage: data.profileImage || data.photoURL || '',
              name: data.name || collaboration.collaboratorPageName,
              username: data.username || collaboration.collaboratorPageUsername,
              type: collaboration.collaboratorPageType === 'organization' ? 'organisation' : collaboration.collaboratorPageType,
              pageId: collaboration.collaboratorPageId
            });
          }
        } catch (error) {
          console.error('Error fetching collaborator profile:', error);
        }
      }
      
      setAllCreatorProfiles(profiles);
    } catch (error) {
      console.error('Error fetching all creator profiles:', error);
    }
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If we have multiple creators, show the popup
    if (allCreatorProfiles.length > 1) {
      setShowCollaboratorsPopup(true);
      return;
    }
    
    // Single creator navigation
    if (allCreatorProfiles.length === 1) {
      const creator = allCreatorProfiles[0];
      switch (creator.type) {
        case 'artist':
          router.push(`/artist/${creator.username}`);
          break;
        case 'organisation':
          router.push(`/organisation/${creator.username}`);
          break;
        case 'venue':
          router.push(`/venue/${creator.username}`);
          break;
        default:
          console.warn('Unknown creator type:', creator.type);
      }
    } else if (event?.creator) {
      // Fallback to legacy navigation
      const { type, username } = event.creator;
      switch (type) {
        case 'artist':
          router.push(`/artist/${username}`);
          break;
        case 'organisation':
          router.push(`/organisation/${username}`);
          break;
        case 'venue':
          router.push(`/venue/${username}`);
          break;
        default:
          console.warn('Unknown creator type:', type);
      }
    } else if (event?.organization_username) {
      // Fallback to legacy organization link for old events
      router.push(`/organisation/${event.organization_username}`);
    }
  };

  const handleCollaboratorClick = (creator: CreatorProfile) => {
    setShowCollaboratorsPopup(false);
    switch (creator.type) {
      case 'artist':
        router.push(`/artist/${creator.username}`);
        break;
      case 'organisation':
        router.push(`/organisation/${creator.username}`);
        break;
      case 'venue':
        router.push(`/venue/${creator.username}`);
        break;
      default:
        console.warn('Unknown creator type:', creator.type);
    }
  };

  if (loading || profileLoading) {
    return <EventProfileSkeleton />;
  }

  if (error || !event) {
    return <div className={styles.errorMessage}>{error || "Event not found"}</div>;
  }

  const { event_image, title, hosting_club, about_event } = event;
  const displayData = getEventDisplayData();

  // Calculate total starting price
  const startingPrice = ticketAvailability.length > 0 
    ? Math.min(...ticketAvailability.map(t => t.price))
    : 0;

  return (
    <div className={styles.eventProfileContainer}>
      <div className={styles.eventContent}>
        <div className={styles.eventProfileImage}>
          {event_image ? (
            <img src={event_image} alt={title} />
          ) : (
            <div className={styles.noImage}>No Image Available</div>
          )}
        </div>
        <div className={styles.eventInfoBox}>
          <div className={styles.eventInfo}>
            <h2>{title}</h2>
            <div 
              className={styles.hostingClub} 
              onClick={handleCreatorClick}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.creatorInfo}>
                By 
                {allCreatorProfiles.length > 0 ? (
                  <div className={styles.creatorAvatars}>
                    {allCreatorProfiles.slice(0, 3).map((creator, index) => (
                      <div 
                        key={creator.pageId}
                        className={styles.creatorAvatar}
                        style={{ zIndex: allCreatorProfiles.length - index }}
                      >
                        {(creator.photoURL || creator.profileImage) ? (
                          <img 
                            src={creator.photoURL || creator.profileImage} 
                            alt={creator.name}
                            className={styles.creatorProfileImage}
                          />
                        ) : (
                          <div className={styles.defaultAvatar}>
                            {creator.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {allCreatorProfiles.length > 3 && (
                      <div className={styles.creatorAvatar} style={{ zIndex: 0 }}>
                        <div className={styles.moreCount}>
                          +{allCreatorProfiles.length - 3}
                        </div>
                      </div>
                    )}
                  </div>
                ) : creatorProfile && (creatorProfile.photoURL || creatorProfile.profileImage) && (
                  <div className={styles.creatorAvatar}>
                    <img 
                      src={creatorProfile.photoURL || creatorProfile.profileImage} 
                      alt={getCreatorDisplayName()}
                      className={styles.creatorProfileImage}
                    />
                  </div>
                )}
                <span className={`${styles.organizationLink} ${allCreatorProfiles.length > 1 ? styles.clickableText : ''}`}>
                  {getCreatorDisplayName()}
                </span>
              </div>
            </div>
            
            {/* Date and Location Card */}
            <div className={styles.eventCard}>
              <div className={styles.topSection}>
                {/* Date Box */}
                <div className={styles.dateBox}>
                  <div className={styles.monthSection}>
                    <div className={styles.monthText}>
                      {event.architecture === 'session-centric' && event.sessions && event.sessions.length > 0
                        ? getDateComponents(event.sessions[0].date).month
                        : event.time_slots && event.time_slots.length > 0
                        ? getDateComponents(event.time_slots[0].date).month
                        : 'TBD'
                      }
                    </div>
                  </div>
                  <div className={styles.dateSection}>
                    <div className={styles.dateText}>
                      {event.architecture === 'session-centric' && event.sessions && event.sessions.length > 0
                        ? getDateComponents(event.sessions[0].date).date
                        : event.time_slots && event.time_slots.length > 0
                        ? getDateComponents(event.time_slots[0].date).date
                        : '??'
                      }
                    </div>
                  </div>
            </div>
            
                {/* Date and Time Info */}
                <div className={styles.dateTimeInfo}>
                  <div className={styles.dayText}>
                    {event.architecture === 'session-centric' && event.sessions && event.sessions.length > 0
                      ? `${getDateComponents(event.sessions[0].date).day}, ${getDateComponents(event.sessions[0].date).fullDate}`
                      : event.time_slots && event.time_slots.length > 0
                      ? `${getDateComponents(event.time_slots[0].date).day}, ${getDateComponents(event.time_slots[0].date).fullDate}`
                      : 'Date to be announced'
                    }
                  </div>
                  <div className={styles.timeText}>
                    {getTimeSlotDisplay()}
                  </div>
                </div>
              </div>

              {/* Location Info */}
              <div 
                className={styles.locationSection}
              onClick={handleLocationClick}
              style={{ cursor: 'pointer' }}
            >
                <div className={styles.locationIconBox}>
                  <MapPin className={styles.locationIcon} />
            </div>
                <div className={styles.locationInfo}>
                  <div className={styles.venueText}>
                    {displayData?.venue || 'Venue TBD'}
              </div>
                  <div className={styles.locationText}>
                    {event.architecture === 'session-centric' && event.venue_type === 'per_session' 
                      ? 'Multiple Venues' 
                      : 'View on Maps'
                    }
                  </div>
                </div>
              </div>
            </div>


            
            {/* Only show Book Now button for regular users, not organizations */}
            {!isOrganization && user && (
              <div className={styles.eventPrice}>
                <button 
                  className={styles.bookNowButton} 
                  onClick={handleBookNow}
                >
                  <FaTicketAlt />
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
        <p>{about_event || "Join us for an engaging event designed to enhance your skills and creativity. Don't miss out on this opportunity!"}</p>
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
      
      {/* Collaborators Popup */}
      {showCollaboratorsPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowCollaboratorsPopup(false)}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupHeader}>
              <h3>Event Creators & Collaborators</h3>
              <button 
                className={styles.popupCloseButton}
                onClick={() => setShowCollaboratorsPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.collaboratorsList}>
              {allCreatorProfiles.map((creator, index) => (
                <div 
                  key={creator.pageId}
                  className={styles.collaboratorItem}
                  onClick={() => handleCollaboratorClick(creator)}
                >
                  <div className={styles.collaboratorAvatar}>
                    {(creator.photoURL || creator.profileImage) ? (
                      <img 
                        src={creator.photoURL || creator.profileImage} 
                        alt={creator.name}
                        className={styles.collaboratorProfileImage}
                      />
                    ) : (
                      <div className={styles.collaboratorDefaultAvatar}>
                        {creator.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.collaboratorInfo}>
                    <span className={styles.collaboratorName}>{creator.name}</span>
                    <span className={styles.collaboratorType}>
                      {index === 0 ? 'Creator' : 'Collaborator'} • {creator.type.charAt(0).toUpperCase() + creator.type.slice(1)}
                    </span>
                  </div>
                  <div className={styles.collaboratorArrow}>→</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventProfile; 