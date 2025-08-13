import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/infrastructure/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

export interface Event {
  id: string;
  title: string;
  eventTitle?: string;
  eventType: string;
  event_categories: string[];
  eventCategories?: string[];
  hosting_club: string;
  hostingClub?: string;
  eventDateTime?: any;
  event_venue: string;
  eventVenue?: string;
  eventRegistrationLink?: string;
  about_event: string;
  aboutEvent?: string;
  event_image: string;
  organizationId: string;
  time_slots: Array<{
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
  }>;
  tickets: Array<{
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
  createdAt: any;
  // Computed properties
  displayTitle: string;
  displayVenue: string;
  displayAbout: string;
  displayCategories: string[];
  displayHost: string;
  firstTimeSlot?: {
    date: string;
    start_time: string;
    end_time: string;
  };
  primaryCategory: string;
}

interface UseEventsOptions {
  city?: string;
  category?: string;
  limit?: number;
  organizationId?: string;
}

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getEventById: (id: string) => Event | null;
}

// Cache management
const CACHE_KEY = 'eventsCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  events: any[];
  timestamp: number;
}

function getFromCache(): Event[] | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: CacheData = JSON.parse(cached);
    const now = Date.now();
    
    if (now - cacheData.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return cacheData.events.map(normalizeEventData);
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

function saveToCache(events: any[]): void {
  try {
    const cacheData: CacheData = {
      events,
      timestamp: Date.now()
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

function normalizeEventData(data: any): Event {
  const timeSlots = Array.isArray(data.time_slots) ? data.time_slots : [];
  const categories = data.event_categories || data.eventCategories || [];
  
  return {
    id: data.id,
    title: data.title || data.eventTitle || '',
    eventTitle: data.eventTitle,
    eventType: data.event_type || data.eventType || 'event',
    event_categories: categories,
    eventCategories: categories,
    hosting_club: data.hosting_club || data.hostingClub || '',
    hostingClub: data.hostingClub,
    eventDateTime: data.event_date_time || data.eventDateTime,
    event_venue: data.event_venue || data.eventVenue || '',
    eventVenue: data.eventVenue,
    eventRegistrationLink: data.event_registration_link || data.eventRegistrationLink,
    about_event: data.about_event || data.aboutEvent || '',
    aboutEvent: data.aboutEvent,
    event_image: data.event_image || '',
    organizationId: data.organizationId || '',
    time_slots: timeSlots,
    tickets: data.tickets || [],
    createdAt: data.createdAt,
    
    // Computed properties
    displayTitle: data.title || data.eventTitle || 'Untitled Event',
    displayVenue: data.event_venue || data.eventVenue || 'Venue TBD',
    displayAbout: data.about_event || data.aboutEvent || '',
    displayCategories: categories,
    displayHost: data.hosting_club || data.hostingClub || 'Unknown Host',
    firstTimeSlot: timeSlots.length > 0 ? timeSlots[0] : undefined,
    primaryCategory: categories.length > 0 ? categories[0] : (data.event_type || data.eventType || 'event')
  };
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { city, category, limit, organizationId } = options;

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try cache first
      const cachedEvents = getFromCache();
      if (cachedEvents) {
        console.log('Using cached events data');
        setAllEvents(cachedEvents);
        setLoading(false);
        return;
      }

      if (!db) throw new Error('Firebase is not initialized');

      let eventsQuery = query(
        collection(db(), 'events'),
        orderBy('createdAt', 'desc')
      );

      // Add organization filter if specified
      if (organizationId) {
        eventsQuery = query(
          collection(db(), 'events'),
          where('organizationId', '==', organizationId),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(eventsQuery);
      const rawEvents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Normalize and process events
      const normalizedEvents = rawEvents.map(normalizeEventData);
      
      // Cache the raw events for future use
      saveToCache(rawEvents);
      
      setAllEvents(normalizedEvents);
      console.log(`Fetched ${normalizedEvents.length} events`);
      
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Filter events based on options
  const filteredEvents = React.useMemo(() => {
    let filtered = [...allEvents];

    // Filter by city
    if (city && city !== 'All Cities') {
      filtered = filtered.filter(event => 
        event.displayVenue.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Filter by category
    if (category && category !== 'all') {
      filtered = filtered.filter(event => 
        event.displayCategories.some(cat => 
          cat.toLowerCase() === category.toLowerCase()
        )
      );
    }

    // Apply limit
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [allEvents, city, category, limit]);

  const getEventById = useCallback((id: string): Event | null => {
    return allEvents.find(event => event.id === id) || null;
  }, [allEvents]);

  const refetch = useCallback(async () => {
    // Clear cache and refetch
    sessionStorage.removeItem(CACHE_KEY);
    await fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events: filteredEvents,
    loading,
    error,
    refetch,
    getEventById
  };
}

// Hook for single event
export function useEvent(eventId: string) {
  const { events, loading, error, getEventById } = useEvents();
  
  return {
    event: getEventById(eventId),
    loading,
    error
  };
}

// Hook for organization events
export function useOrganizationEvents(organizationId: string) {
  return useEvents({ organizationId });
} 