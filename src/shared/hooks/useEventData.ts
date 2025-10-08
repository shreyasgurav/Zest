import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';

// Custom Event interface to avoid conflict with DOM Event
interface EventData {
  id: string;
  title?: string;
  description?: string;
  event_image?: string;
  // Add other event properties as needed
  [key: string]: any;
}

interface UseEventDataOptions {
  initialData?: any;
  enabled?: boolean;
  refetchOnMount?: boolean;
}

interface UseEventDataReturn {
  event: any | null;
  isLoading: boolean;
  error: Error | null;
  isDeleted: boolean;
  retry: () => void;
  refetch: () => Promise<void>;
}

interface EventDataCache {
  [eventId: string]: {
    data: EventData | null;
    timestamp: number;
    status: 'loading' | 'success' | 'error' | 'deleted';
    retryCount: number;
  };
}

let eventCache: EventDataCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// 🧹 CLEANUP INTEGRATION: Real-time cache invalidation
export const invalidateEventCache = (eventId: string): void => {
  if (eventCache[eventId]) {
    eventCache[eventId].status = 'deleted';
    eventCache[eventId].data = null;
    console.log(`🗑️ Cache invalidated for deleted event: ${eventId}`);
    
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.includes(eventId));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
};

// 🧹 CLEANUP INTEGRATION: Detect if event was deleted
export const isEventDeleted = (eventId: string): boolean => {
  return eventCache[eventId]?.status === 'deleted';
};

// 🧹 CLEANUP INTEGRATION: Clear all cache
export const clearAllEventCache = (): void => {
  eventCache = {};
  if (typeof window !== 'undefined') {
    Object.keys(localStorage)
      .filter(key => key.includes('event_'))
      .forEach(key => localStorage.removeItem(key));
  }
  console.log('🗑️ All event cache cleared');
};

export const useEventData = (
  eventId: string,
  options: UseEventDataOptions = {}
): UseEventDataReturn => {
  const {
    initialData,
    enabled = true,
    refetchOnMount = false
  } = options;

  const [event, setEvent] = useState<any | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);

  const fetchEvent = useCallback(async (retryAttempt: number = 0) => {
    if (!eventId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // 🧹 Check if event is marked as deleted
      if (isEventDeleted(eventId)) {
        console.log(`🗑️ Event ${eventId} is marked as deleted, skipping fetch`);
        setIsDeleted(true);
        setEvent(null);
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cached = eventCache[eventId];
      const now = Date.now();
      
      if (cached && 
          cached.status === 'success' && 
          cached.data && 
          (now - cached.timestamp) < CACHE_DURATION) {
        setEvent(cached.data);
        setIsLoading(false);
        return;
      }

      // Update cache status
      eventCache[eventId] = { 
        ...eventCache[eventId], 
        status: 'loading', 
        timestamp: now,
        retryCount: retryAttempt 
      };

      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      
      if (!eventDoc.exists()) {
        // 🧹 Event not found - mark as deleted and invalidate cache
        console.log(`🗑️ Event not found: ${eventId} - marking as deleted`);
        invalidateEventCache(eventId);
        setIsDeleted(true);
        setEvent(null);
        setError(new Error('Event not found - it may have been deleted'));
        setIsLoading(false);
        return;
      }

      const data = { id: eventDoc.id, ...eventDoc.data() } as EventData;
      
      // Update cache
      eventCache[eventId] = {
        data,
        timestamp: now,
        status: 'success',
        retryCount: 0
      };
      
      setEvent(data);
      setIsDeleted(false);
      setError(null);

    } catch (error) {
      console.error(`❌ Error fetching event ${eventId}:`, error);
      
      // Update cache with error
      eventCache[eventId] = {
        ...eventCache[eventId],
        status: 'error',
        retryCount: retryAttempt + 1
      };
      
      setError(error instanceof Error ? error : new Error('Failed to fetch event data'));
      setEvent(null);
      
    } finally {
      setIsLoading(false);
    }
  }, [eventId, enabled]);

  // Retry function for error states
  const retry = useCallback(() => {
    if (eventId && !isDeleted) {
      const retryCount = eventCache[eventId]?.retryCount || 0;
      fetchEvent(retryCount);
    }
  }, [eventId, fetchEvent, isDeleted]);

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    if (eventId) {
      eventCache[eventId].status = 'loading';
      await fetchEvent();
    }
  }, [eventId, fetchEvent]);

  // Initial fetch
  useEffect(() => {
    if (!initialData || refetchOnMount) {
      fetchEvent();
    }
  }, [fetchEvent, initialData, refetchOnMount]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Optionally clean up old cache entries
      const now = Date.now();
      Array.from(Object.entries(eventCache)).forEach(([key, entry]) => {
        if (now - entry.timestamp > CACHE_DURATION * 2 && entry.status === 'deleted') {
          invalidateEventCache(key);
        }
      });
    };
  }, []);

  return {
    event,
    isLoading,
    error,
    isDeleted,
    retry,
    refetch
  };
};

// Utility function to prefetch events (for performance optimization)
export const prefetchEvent = async (eventId: string): Promise<any> => {
  try {
    const cachedEntry = eventCache[eventId];
    const now = Date.now();
    
    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
      return cachedEntry.data;
    }

    const eventDoc = await getDoc(doc(db(), 'events', eventId));
    
    if (eventDoc.exists()) {
      const eventData = {
        id: eventDoc.id,
        ...eventDoc.data()
      };

      eventCache[eventId] = {
        data: eventData,
        timestamp: now,
        status: 'success',
        retryCount: 0
      };

      return eventData;
    }
    
    return null;
  } catch (error) {
    console.error('Error prefetching event:', error);
    return null;
  }
};

// Utility function to invalidate cache (unified interface)
export const invalidateCache = (eventId?: string) => {
  if (eventId) {
    invalidateEventCache(eventId);
  } else {
    clearAllEventCache();
  }
}; 