"use client"

import React, { useState, useEffect } from "react"
import { collection, query, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/infrastructure/firebase"
import { Music, Smile, Palette, PartyPopper, Mountain, Trophy, Calendar, MapPin, Users, Mic } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import styles from "./events.module.css"
import { EventProfileCard } from "@/components/ui/EventCard"
import { matchVenueToCity } from '@/lib/utils/cityBoundaries'

const EVENT_TYPES = [
  { id: "music", label: "Music", icon: Music, color: "from-purple-500 to-pink-500" },
  { id: "comedy", label: "Comedy", icon: Smile, color: "from-yellow-500 to-orange-500" },
  { id: "art", label: "Art", icon: Palette, color: "from-blue-500 to-cyan-500" },
  { id: "clubbing", label: "Clubbing", icon: PartyPopper, color: "from-pink-500 to-red-500" },
  { id: "adventure", label: "Adventure", icon: Mountain, color: "from-green-500 to-emerald-500" },
  { id: "sports", label: "Sports", icon: Trophy, color: "from-amber-500 to-yellow-500" },
]

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

export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<EventFilterData[]>([])
  const [filteredEventIds, setFilteredEventIds] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedCity, setSelectedCity] = useState<string>("All Cities")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen for location changes from header
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

  // Filter events based on selected city and type
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

    // Filter by category - only apply filter if a specific category is selected
    if (selectedType && selectedType !== 'all' && selectedType.trim() !== '') {
      filtered = filtered.filter(event => {
        const categories = event.event_categories || event.eventCategories || [];
        return categories.some(category => 
          category.toLowerCase() === selectedType.toLowerCase()
        );
      });
    }

    setFilteredEventIds(filtered.map(event => event.id));
  }, [allEvents, selectedCity, selectedType]);

  useEffect(() => {
    const fetchEventsData = async () => {
      try {
        if (!db) throw new Error("Firebase is not initialized")

        const eventsCollectionRef = collection(db(), "events")
        const q = query(eventsCollectionRef, orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)
        
        // Fetch minimal data needed for filtering
        const eventsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            event_categories: data.event_categories || [],
            eventCategories: data.eventCategories || [],
            event_venue: data.event_venue || '',
            eventVenue: data.eventVenue || '',
            venue_coordinates: data.venue_coordinates
          } as EventFilterData;
        });
        
        setAllEvents(eventsData)
        setError(null)
      } catch (error) {
        console.error("Error fetching events data:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch events")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEventsData()
  }, [])

  const getEventTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "music":
        return <Music className={styles.filterIcon} />
      case "comedy":
        return <Mic className={styles.filterIcon} />
      case "party":
      case "clubbing":
        return <PartyPopper className={styles.filterIcon} />
      case "art":
        return <Palette className={styles.filterIcon} />
      case "adventure":
        return <Mountain className={styles.filterIcon} />
      case "sports":
        return <Trophy className={styles.filterIcon} />
      default:
        return <PartyPopper className={styles.filterIcon} />
    }
  }

  const eventTypes = [
    { id: "all", label: "All Events" },
    { id: "music", label: "Music" },
    { id: "comedy", label: "Comedy" },
    { id: "clubbing", label: "Clubbing" },
    { id: "party", label: "Party" },
    { id: "art", label: "Art" },
    { id: "adventure", label: "Adventure" },
    { id: "sports", label: "Sports" }
  ]

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          {/* Filters Section - Skeleton */}
          <div className={styles.filters}>
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className={styles.filterSkeleton}></div>
            ))}
          </div>

          {/* Events Grid - Skeleton */}
          <div className={styles.eventsGrid}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={styles.eventCardSkeleton}>
                <div className={styles.skeletonImageSection}></div>
                <div className={styles.skeletonContentSection}>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonMeta}></div>
                  <div className={styles.skeletonMeta}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Filters Section - Always visible */}
        <div className={styles.filters}>
          {eventTypes.map((type) => (
            <button
              key={type.id}
              className={`${styles.filterButton} ${selectedType === type.id ? styles[`${type.id}Active`] : ""}`}
              onClick={() => setSelectedType(type.id)}
            >
              {getEventTypeIcon(type.id)}
              <span>{type.label}</span>
            </button>
          ))}
          
          {/* Show clear filters button when filters are active */}
          {(selectedType !== 'all' || (selectedCity && selectedCity !== 'All Cities')) && (
            <button
              onClick={() => {
                setSelectedCity('All Cities');
                setSelectedType('all');
                localStorage.removeItem('selectedCity');
              }}
              className={styles.clearFiltersButton}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Content Section */}
        {error ? (
          <div className={styles.noEvents}>
            <div className={styles.noEventsIcon}>
              <MapPin className={styles.noEventsIconSvg} />
            </div>
            <h2 className={styles.noEventsTitle}>Error Loading Events</h2>
            <p className={styles.noEventsText}>{error}</p>
          </div>
        ) : filteredEventIds.length > 0 ? (
          <>
            <div className={styles.eventsCount}>
              Showing {filteredEventIds.length} {filteredEventIds.length === 1 ? 'event' : 'events'}
              {selectedCity !== 'All Cities' && ` in ${selectedCity}`}
              {selectedType !== 'all' && ` in ${selectedType}`}
            </div>
            <div className={styles.eventsGrid}>
              {filteredEventIds.map((eventId) => (
                <EventProfileCard 
                  key={eventId} 
                  eventId={eventId}
                />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.noEvents}>
            <div className={styles.noEventsIcon}>
              <PartyPopper className={styles.noEventsIconSvg} />
            </div>
            <h2 className={styles.noEventsTitle}>No Events Found</h2>
            <p className={styles.noEventsText}>
              {selectedCity !== 'All Cities' 
                ? `No ${selectedType === 'all' ? '' : selectedType + ' '}events found in ${selectedCity}. Try selecting a different city or category.`
                : selectedType === 'all' 
                  ? "There are no events available at the moment. Check back later!"
                  : `No ${selectedType} events found. Try a different category or check back later.`}
            </p>
            <button 
              onClick={() => {
                setSelectedCity('All Cities');
                setSelectedType('all');
                // Clear localStorage to prevent auto-filtering on refresh
                localStorage.removeItem('selectedCity');
              }}
              className={styles.resetFiltersButton}
            >
              Show All Events
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
