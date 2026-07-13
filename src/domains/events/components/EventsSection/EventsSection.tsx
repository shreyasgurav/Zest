"use client";

import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { EventCarouselCard } from "@/components/ui/EventCard";
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from "./EventsSection.module.css";
import Link from 'next/link';
import EventsSectionSkeleton from './EventsSectionSkeleton';
import { matchVenueToCity } from '@/lib/utils/cityBoundaries';

interface EventFilterData {
  id: string;
  event_categories?: string[];
  eventCategories?: string[];
  event_venue?: string;
  eventVenue?: string;
  venue_coordinates?: {
    lat: number;
    lng: number;
    formatted_address: string;
    place_id?: string;
    city?: string;
    country?: string;
  };
}

const EventsSection = () => {
  const [allEvents, setAllEvents] = useState<EventFilterData[]>([]);
  const [filteredEventIds, setFilteredEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState('All Cities');

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
    // Get initial city from localStorage, but only set it if it's not "All Cities"
    const storedCity = localStorage.getItem('selectedCity');
    if (storedCity && storedCity !== 'All Cities') {
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
  useEffect(() => {
    // Don't filter until we have events data
    if (allEvents.length === 0) {
      setFilteredEventIds([]);
      return;
    }

    let filtered = [...allEvents];

    // Filter by city - only apply filter if a specific city is selected
    if (selectedCity && selectedCity !== 'All Cities' && selectedCity.trim() !== '') {
      filtered = filtered.filter(event => {
        const venue = event.event_venue || event.eventVenue || '';
        const venueCoords = event.venue_coordinates ? {
          lat: event.venue_coordinates.lat,
          lng: event.venue_coordinates.lng
        } : null;
        return matchVenueToCity(venueCoords, venue, selectedCity);
      });
    }

    // Limit to first 10 for carousel
    const limitedFiltered = filtered.slice(0, 10);
    setFilteredEventIds(limitedFiltered.map(event => event.id));
  }, [allEvents, selectedCity]);

  useEffect(() => {
    const fetchEventsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/events?limit=20');
        if (!response.ok) throw new Error("Failed to fetch events");
        
        const data = await response.json();
        
        const eventsData = (data.events || []).map((event: any) => ({
          id: event.id,
          event_categories: event.event_categories || event.eventCategories || [],
          eventCategories: event.event_categories || event.eventCategories || [],
          event_venue: event.event_venue || event.eventVenue || '',
          eventVenue: event.event_venue || event.eventVenue || '',
          venue_coordinates: event.venue_coordinates || null
        })) as EventFilterData[];
        
        setAllEvents(eventsData);
        setError(null);
        
        console.log(`Fetched ${eventsData.length} events for filtering`);
        
      } catch (error) {
        console.error('Error fetching events data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEventsData();
  }, []);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return <EventsSectionSkeleton />;
  }

  if (!filteredEventIds.length) {
    return (
      <div className={styles.eventsSection}>
        <div className={styles.eventsSectionHeading}>
          <h1 className={styles.upcomingEventsHeading}>
            {selectedCity !== 'All Cities' 
              ? `Upcoming Events in ${selectedCity}`
              : "Upcoming Events"
            }
          </h1>
          <Link href="/events" className={styles.seeAllLink}>See All</Link>
        </div>
        <div className={styles.noEventsMessage}>
          {selectedCity !== 'All Cities' 
            ? `No events found in ${selectedCity}. Try selecting all cities or check back later.`
            : "No events available."
          }
        </div>
      </div>
    );
  }

  return (
    <div className={styles.eventsSection}>
      <div className={styles.eventsSectionHeading}>
        <h1 className={styles.upcomingEventsHeading}>
          {selectedCity !== 'All Cities' 
            ? `Upcoming Events in ${selectedCity}`
            : "Upcoming Events"
          }
        </h1>
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
              {filteredEventIds.map((eventId: string) => (
                <div className={styles.embla__slide} key={eventId}>
                  <EventCarouselCard 
                    eventId={eventId} 
                  />
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