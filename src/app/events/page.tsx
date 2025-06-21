"use client"

import React, { useState, useEffect } from "react"
import { collection, query, getDocs, orderBy, limit, where } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { Music, Smile, Palette, PartyPopper, Mountain, Trophy, Calendar, MapPin, Users, Mic } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import styles from "./events.module.css"
import EventBox from "@/components/EventsSection/EventBox/EventBox"

interface Event {
  id: string
  eventTitle: string
  aboutEvent: string
  event_image: string
  eventVenue: string
  eventDateTime: string
  eventType: string
  eventCategories: string[]
  hostingClub: string
  isEventBox: boolean
  eventRegistrationLink?: string
  organizationId: string
  title?: string
  hosting_club?: string
  event_venue?: string
  about_event?: string
  time_slots?: Array<{
    date: string
    start_time: string
    end_time: string
    available: boolean
  }>
  createdAt: any
}

const EVENT_TYPES = [
  { id: "music", label: "Music", icon: Music, color: "from-purple-500 to-pink-500" },
  { id: "comedy", label: "Comedy", icon: Smile, color: "from-yellow-500 to-orange-500" },
  { id: "art", label: "Art", icon: Palette, color: "from-blue-500 to-cyan-500" },
  { id: "clubbing", label: "Clubbing", icon: PartyPopper, color: "from-pink-500 to-red-500" },
  { id: "adventure", label: "Adventure", icon: Mountain, color: "from-green-500 to-emerald-500" },
  { id: "sports", label: "Sports", icon: Trophy, color: "from-amber-500 to-yellow-500" },
]

export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedCity, setSelectedCity] = useState<string>("Mumbai")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen for location changes from header
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
  const filterEventsByLocation = (events: Event[], city: string) => {
    if (!city || city === 'All Cities') return events;
    
    return events.filter(event => {
      const venue = event.event_venue || event.eventVenue || '';
      // Check if venue contains the city name (case insensitive)
      return venue.toLowerCase().includes(city.toLowerCase());
    });
  };

  // Apply both location and type filters
  useEffect(() => {
    let filtered = filterEventsByLocation(allEvents, selectedCity);
    
    if (selectedType !== "all") {
      filtered = filtered.filter((event) => 
        event.eventCategories && event.eventCategories.includes(selectedType)
      );
    }
    
    setEvents(filtered);
    console.log(`Filtered ${filtered.length} events for ${selectedCity} and type ${selectedType}`);
  }, [allEvents, selectedCity, selectedType]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        if (!db) throw new Error("Firebase is not initialized")

        const eventsCollectionRef = collection(db, "events")
        const q = query(eventsCollectionRef, orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)
        
        const eventsData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            eventTitle: data.title || data.eventTitle || "",
            eventType: data.event_type || data.eventType || "event",
            eventCategories: data.event_categories || [],
            hostingClub: data.hosting_club || data.hostingClub || "",
            eventDateTime: data.event_date_time || data.eventDateTime,
            eventVenue: data.event_venue || data.eventVenue || "",
            eventRegistrationLink: data.event_registration_link || data.eventRegistrationLink,
            aboutEvent: data.about_event || data.aboutEvent || "",
            event_image: data.event_image || "",
            organizationId: data.organizationId || "",
            time_slots: data.time_slots || [],
            isEventBox: true,
            createdAt: data.createdAt
          }
        }) as Event[]
        
        setAllEvents(eventsData)
        setError(null)
      } catch (error) {
        console.error("Error fetching events:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch events")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const filteredEvents = events

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getEventTypeInfo = (eventType: string) => {
    return (
      EVENT_TYPES.find((type) => type.id === eventType.toLowerCase()) || {
        id: eventType.toLowerCase(),
        label: eventType,
        icon: Calendar,
        color: "from-gray-500 to-gray-600",
      }
    )
  }

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
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <div className={styles.spinnerSecondary}></div>
        </div>
        <p className={styles.loadingText}>Loading events...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header Section - Always visible */}
        <header className={styles.header}>
          <h1 className={styles.title}>All Events</h1>
          <p className={styles.subtitle}>
            {selectedCity !== 'All Cities' 
              ? `Discover exciting events happening in ${selectedCity}`
              : "Discover and join exciting events happening around you"
            }
          </p>
        </header>

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
        ) : filteredEvents.length > 0 ? (
          <>
            <div className={styles.eventsCount}>
              Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
              {selectedCity !== 'All Cities' && ` in ${selectedCity}`}
            </div>
            <div className={styles.eventsGrid}>
              {filteredEvents.map((event) => (
                <EventBox 
                  key={event.id} 
                  event={event}
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
          </div>
        )}
      </div>
    </div>
  )
}
