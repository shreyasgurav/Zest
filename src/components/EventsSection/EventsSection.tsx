"use client";

import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useEmblaCarousel from "embla-carousel-react";
import EventBox from "./EventBox/EventBox";
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from "./EventsSection.module.css";
import Link from 'next/link';
import EventsSectionSkeleton from './EventsSectionSkeleton';

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

const EventsSection = () => {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const [forceShow, setForceShow] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Listen for location changes
  useEffect(() => {
    // Get initial city from localStorage
    const storedCity = localStorage.getItem('selectedCity');
    if (storedCity) {
      setSelectedCity(storedCity);
    }

    // Listen for location changes from header
    const handleLocationChange = (event: CustomEvent) => {
      setSelectedCity(event.detail.city);
    };

    window.addEventListener('locationChanged', handleLocationChange as EventListener);
    
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange as EventListener);
    };
  }, []);

  // Filter events based on selected city
  const filterEventsByLocation = useCallback((events: Event[], city: string) => {
    if (!city || city === 'All Cities') return events;
    
    return events.filter(event => {
      const venue = event.event_venue || event.eventVenue || '';
      // Check if venue contains the city name (case insensitive)
      return venue.toLowerCase().includes(city.toLowerCase());
    });
  }, []);

  // Update filtered events when city or all events change
  useEffect(() => {
    const filtered = filterEventsByLocation(allEvents, selectedCity);
    setFilteredEvents(filtered);
    console.log(`Filtered ${filtered.length} events for ${selectedCity}`);
  }, [allEvents, selectedCity, filterEventsByLocation]);

  // Preload images with timeout and fallback
  const preloadImages = async (eventsData: Event[]) => {
    try {
      const imagePromises = eventsData
        .filter(event => event.event_image)
        .slice(0, 6) // Only preload first 6 images for performance
        .map(event => {
          return new Promise((resolve) => {
            const img = new window.Image();
            
            // Set a timeout for each image
            const timeout = setTimeout(() => {
              resolve('timeout');
            }, 3000); // 3 second timeout per image
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve('loaded');
            };
            img.onerror = () => {
              clearTimeout(timeout);
              resolve('error');
            };
            img.src = event.event_image;
          });
        });

      // If no images to preload, set as loaded immediately
      if (imagePromises.length === 0) {
        setImagesLoaded(true);
        return;
      }

      // Wait for images with a global timeout
      const globalTimeout = new Promise(resolve => 
        setTimeout(() => resolve('global_timeout'), 5000) // 5 second global timeout
      );
      
      await Promise.race([
        Promise.all(imagePromises),
        globalTimeout
      ]);
      
      setImagesLoaded(true);
    } catch (err) {
      console.error('Error preloading images:', err);
      setImagesLoaded(true); // Always continue even if preloading fails
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        if (!db) throw new Error('Firebase is not initialized');

        const eventsCollectionRef = collection(db, "events");
        const q = query(eventsCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const eventsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            eventTitle: data.title || data.eventTitle || '',
            eventType: data.event_type || data.eventType || 'event',
            hostingClub: data.hosting_club || data.hostingClub || '',
            eventDateTime: data.event_date_time || data.eventDateTime,
            eventVenue: data.event_venue || data.eventVenue || '',
            eventRegistrationLink: data.event_registration_link || data.eventRegistrationLink,
            aboutEvent: data.about_event || data.aboutEvent || '',
            event_image: data.event_image || '',
            organizationId: data.organizationId || '',
            time_slots: data.time_slots || [],
            tickets: data.tickets || [],
            createdAt: data.createdAt
          };
        }) as Event[];
        
        console.log("Fetched events with org IDs:", eventsData);
        setAllEvents(eventsData);
        preloadImages(eventsData);
        setError(null);
      } catch (error) {
        console.error('Error fetching events:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch events');
        setImagesLoaded(true); // Set images as loaded even on error
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Backup timer to force show content after 8 seconds
  useEffect(() => {
    const backupTimer = setTimeout(() => {
      if (!imagesLoaded) {
        console.log('Backup timer: Force showing content');
        setForceShow(true);
        setImagesLoaded(true);
      }
    }, 8000); // 8 second backup timer

    return () => clearTimeout(backupTimer);
  }, [imagesLoaded]);

  const handleEventDelete = (eventId: string) => {
    setAllEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  if (loading || (!imagesLoaded && !forceShow)) {
    return <EventsSectionSkeleton />;
  }

  if (!filteredEvents.length) {
    return (
      <div className={styles.eventsSection}>
        <div className={styles.eventsSectionHeading}>
          <h1 className={styles.upcomingEventsHeading}>Upcoming Events</h1>
          <Link href="/events" className={styles.seeAllLink}>See All</Link>
        </div>
        <div className={styles.noEventsMessage}>No events available.</div>
      </div>
    );
  }

  return (
    <div className={styles.eventsSection}>
      <div className={styles.eventsSectionHeading}>
        <h1 className={styles.upcomingEventsHeading}>Upcoming Events</h1>
        <Link href="/events" className={styles.seeAllLink}>See All</Link>
      </div>

      <div className={styles.emblaContainer}>
        <button 
          className={`${styles.emblaButton} ${styles.emblaButtonPrev} ${!prevBtnEnabled ? styles.emblaButtonDisabled : ''}`}
          onClick={scrollPrev}
          disabled={!prevBtnEnabled}
        >
          <FiChevronLeft />
        </button>

        <div className={styles.embla}>
          <div className={styles.embla__viewport} ref={emblaRef}>
            <div className={styles.embla__container}>
              {filteredEvents.map((event) => (
                <div className={styles.embla__slide} key={event.id}>
                  <EventBox event={event} onDelete={handleEventDelete} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          className={`${styles.emblaButton} ${styles.emblaButtonNext} ${!nextBtnEnabled ? styles.emblaButtonDisabled : ''}`}
          onClick={scrollNext}
          disabled={!nextBtnEnabled}
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

export default EventsSection; 