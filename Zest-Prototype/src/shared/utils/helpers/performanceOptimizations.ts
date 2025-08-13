/**
 * 🚀 PERFORMANCE OPTIMIZATIONS FOR LARGE EVENTS
 * 
 * This file contains critical performance optimizations for handling
 * events with 1000+ attendees without crashes or slowdowns.
 * 
 * Features:
 * - Intelligent pagination with virtual scrolling
 * - Memory-efficient data loading
 * - Real-time updates with throttling
 * - Client-side caching with cleanup
 * - Performance monitoring and alerts
 */

import { collection, query, where, orderBy, limit, startAfter, getDocs, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';

// Performance configuration
export const PERFORMANCE_CONFIG = {
  // Pagination settings
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  LARGE_EVENT_THRESHOLD: 500, // Consider an event "large" if > 500 attendees
  
  // Virtual scrolling
  VIRTUAL_ITEM_HEIGHT: 80, // Height of each attendee row in pixels
  VIRTUAL_OVERSCAN: 10, // Number of items to render outside viewport
  
  // Real-time update throttling
  REALTIME_THROTTLE_MS: 1000, // Throttle real-time updates to 1 per second
  BATCH_UPDATE_SIZE: 20, // Process updates in batches
  
  // Memory management
  MAX_CACHE_SIZE: 1000, // Maximum attendees to keep in memory
  CACHE_CLEANUP_INTERVAL: 30000, // Clean up cache every 30 seconds
  
  // Performance monitoring
  SLOW_QUERY_THRESHOLD: 2000, // Alert if query takes > 2 seconds
  MEMORY_USAGE_THRESHOLD: 100 * 1024 * 1024, // Alert if > 100MB memory usage
};

// Attendee data structure optimized for performance
export interface OptimizedAttendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  checkedIn: boolean;
  checkInTime?: string;
  sessionId?: string;
  createdAt: string;
  // Only essential fields to reduce memory usage
}

// Pagination state management
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  lastDocSnapshot?: any;
  loading: boolean;
  error?: string;
}

// Performance metrics tracking
export interface PerformanceMetrics {
  queryTime: number;
  renderTime: number;
  memoryUsage: number;
  attendeeCount: number;
  lastUpdate: Date;
}

export class LargeEventOptimizer {
  private cache = new Map<string, OptimizedAttendee>();
  private throttledUpdates = new Map<string, NodeJS.Timeout>();
  private performanceMetrics: PerformanceMetrics = {
    queryTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    attendeeCount: 0,
    lastUpdate: new Date()
  };
  
  /**
   * 🔥 CRITICAL: Paginated attendee loading for large events
   * This prevents crashes when loading 1000+ attendees
   */
  async loadAttendeesPaginated(
    eventId: string,
    options: {
      pageSize?: number;
      sessionId?: string;
      searchTerm?: string;
      filterStatus?: string;
      startAfterDoc?: any;
    } = {}
  ): Promise<{
    attendees: OptimizedAttendee[];
    pagination: PaginationState;
    performance: PerformanceMetrics;
  }> {
    const startTime = performance.now();
    
    try {
      const {
        pageSize = PERFORMANCE_CONFIG.DEFAULT_PAGE_SIZE,
        sessionId,
        searchTerm,
        filterStatus,
        startAfterDoc
      } = options;
      
      console.log(`🚀 Loading attendees (page size: ${pageSize}, session: ${sessionId})`);
      
      // Build optimized query
      const attendeesRef = collection(db(), 'eventAttendees');
      let baseConstraints = [
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1) // +1 to check if there's a next page
      ];
      
      // Add session filter if provided
      if (sessionId) {
        baseConstraints.splice(1, 0, where('sessionId', '==', sessionId));
      }
      
      // Build query with or without pagination cursor
      const attendeesQuery = startAfterDoc
        ? query(attendeesRef, ...baseConstraints, startAfter(startAfterDoc))
        : query(attendeesRef, ...baseConstraints);
      const snapshot = await getDocs(attendeesQuery);
      
      // Process results efficiently
      const docs = snapshot.docs;
      const hasNextPage = docs.length > pageSize;
      const attendeeDocs = hasNextPage ? docs.slice(0, pageSize) : docs;
      
      // Convert to optimized format (only essential fields)
      const attendees: OptimizedAttendee[] = attendeeDocs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.attendeeName || 'Unknown',
          email: data.email || data.attendeeEmail || '',
          phone: data.phone || data.attendeePhone || '',
          ticketType: data.ticketType || 'Standard',
          checkedIn: data.checkedIn || false,
          checkInTime: data.checkInTime,
          sessionId: data.sessionId,
          createdAt: data.createdAt || new Date().toISOString()
        };
      });
      
      // Apply client-side filters (only if needed for search/status)
      let filteredAttendees = attendees;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredAttendees = attendees.filter(a => 
          a.name.toLowerCase().includes(term) ||
          a.email.toLowerCase().includes(term) ||
          a.phone.includes(term)
        );
      }
      
      if (filterStatus && filterStatus !== 'all') {
        filteredAttendees = filteredAttendees.filter(a => {
          switch (filterStatus) {
            case 'checked-in': return a.checkedIn;
            case 'not-checked-in': return !a.checkedIn;
            default: return true;
          }
        });
      }
      
      // Update cache efficiently
      filteredAttendees.forEach(attendee => {
        this.cache.set(attendee.id, attendee);
      });
      
      // Cleanup cache if it gets too large
      if (this.cache.size > PERFORMANCE_CONFIG.MAX_CACHE_SIZE) {
        this.cleanupCache();
      }
      
      // Calculate performance metrics
      const queryTime = performance.now() - startTime;
      this.performanceMetrics = {
        queryTime,
        renderTime: 0, // Will be set by component
        memoryUsage: this.estimateMemoryUsage(),
        attendeeCount: filteredAttendees.length,
        lastUpdate: new Date()
      };
      
      // Alert if performance is degrading
      if (queryTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 Slow query detected: ${queryTime}ms (threshold: ${PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD}ms)`);
      }
      
      // Pagination state
      const pagination: PaginationState = {
        currentPage: 1, // Will be managed by component
        pageSize,
        totalCount: filteredAttendees.length, // Approximate
        totalPages: Math.ceil(filteredAttendees.length / pageSize),
        hasNextPage,
        hasPrevPage: false,
        lastDocSnapshot: hasNextPage ? attendeeDocs[attendeeDocs.length - 1] : undefined,
        loading: false
      };
      
      console.log(`✅ Loaded ${filteredAttendees.length} attendees in ${queryTime}ms`);
      
      return {
        attendees: filteredAttendees,
        pagination,
        performance: this.performanceMetrics
      };
      
    } catch (error) {
      console.error('❌ Error loading paginated attendees:', error);
      throw error;
    }
  }
  
  /**
   * 🔥 CRITICAL: Throttled real-time updates for large events
   * Prevents UI freezing from too many rapid updates
   */
  setupThrottledRealTimeUpdates(
    eventId: string,
    sessionId: string | undefined,
    onUpdate: (attendees: OptimizedAttendee[]) => void,
    onError: (error: string) => void
  ): () => void {
    const updateKey = `${eventId}-${sessionId || 'all'}`;
    
    // Clear existing throttled update
    if (this.throttledUpdates.has(updateKey)) {
      clearTimeout(this.throttledUpdates.get(updateKey)!);
    }
    
    let lastSnapshot: QuerySnapshot<DocumentData> | null = null;
    let pendingUpdates: OptimizedAttendee[] = [];
    
    // Build query for real-time updates
    const attendeesRef = collection(db(), 'eventAttendees');
    let constraints = [
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    ];
    
    if (sessionId) {
      constraints.splice(1, 0, where('sessionId', '==', sessionId));
    }
    
    const attendeesQuery = query(attendeesRef, ...constraints);
    
    // Throttled update function
    const processThrottledUpdate = () => {
      if (pendingUpdates.length > 0) {
        console.log(`📡 Processing ${pendingUpdates.length} throttled updates`);
        onUpdate([...pendingUpdates]);
        pendingUpdates = [];
      }
    };
    
    // Real-time listener with throttling
    const unsubscribe = onSnapshot(
      attendeesQuery,
      (snapshot) => {
        if (!lastSnapshot) {
          // Initial load - process immediately
          const attendees = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || data.attendeeName || 'Unknown',
              email: data.email || data.attendeeEmail || '',
              phone: data.phone || data.attendeePhone || '',
              ticketType: data.ticketType || 'Standard',
              checkedIn: data.checkedIn || false,
              checkInTime: data.checkInTime,
              sessionId: data.sessionId,
              createdAt: data.createdAt || new Date().toISOString()
            };
          });
          
          onUpdate(attendees);
          lastSnapshot = snapshot;
          return;
        }
        
        // Process changes efficiently
        const changes = snapshot.docChanges();
        const newUpdates: OptimizedAttendee[] = [];
        
        changes.forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data();
            const attendee: OptimizedAttendee = {
              id: change.doc.id,
              name: data.name || data.attendeeName || 'Unknown',
              email: data.email || data.attendeeEmail || '',
              phone: data.phone || data.attendeePhone || '',
              ticketType: data.ticketType || 'Standard',
              checkedIn: data.checkedIn || false,
              checkInTime: data.checkInTime,
              sessionId: data.sessionId,
              createdAt: data.createdAt || new Date().toISOString()
            };
            
            newUpdates.push(attendee);
            this.cache.set(attendee.id, attendee);
          }
        });
        
        // Add to pending updates
        pendingUpdates.push(...newUpdates);
        
        // Clear existing timeout and set new one
        if (this.throttledUpdates.has(updateKey)) {
          clearTimeout(this.throttledUpdates.get(updateKey)!);
        }
        
        const timeout = setTimeout(processThrottledUpdate, PERFORMANCE_CONFIG.REALTIME_THROTTLE_MS);
        this.throttledUpdates.set(updateKey, timeout);
        
        lastSnapshot = snapshot;
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        onError(error.message);
      }
    );
    
    // Return cleanup function
    return () => {
      unsubscribe();
      if (this.throttledUpdates.has(updateKey)) {
        clearTimeout(this.throttledUpdates.get(updateKey)!);
        this.throttledUpdates.delete(updateKey);
      }
    };
  }
  
  /**
   * Virtual scrolling configuration for large lists
   */
  getVirtualScrollConfig(totalItems: number, containerHeight: number) {
    const itemHeight = PERFORMANCE_CONFIG.VIRTUAL_ITEM_HEIGHT;
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const totalHeight = totalItems * itemHeight;
    
    return {
      itemHeight,
      visibleItems,
      totalHeight,
      overscan: PERFORMANCE_CONFIG.VIRTUAL_OVERSCAN,
      renderRange: (scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(
          startIndex + visibleItems + PERFORMANCE_CONFIG.VIRTUAL_OVERSCAN,
          totalItems
        );
        
        return {
          startIndex: Math.max(0, startIndex - PERFORMANCE_CONFIG.VIRTUAL_OVERSCAN),
          endIndex,
          visibleStartIndex: startIndex,
          visibleEndIndex: Math.min(startIndex + visibleItems, totalItems)
        };
      }
    };
  }
  
  /**
   * Memory cleanup for large events
   */
  private cleanupCache() {
    console.log('🧹 Cleaning up attendee cache...');
    
    // Keep only the most recent entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => new Date(b[1].createdAt).getTime() - new Date(a[1].createdAt).getTime());
    
    this.cache.clear();
    
    // Keep only the most recent CACHE_SIZE entries
    const keepEntries = entries.slice(0, PERFORMANCE_CONFIG.MAX_CACHE_SIZE);
    keepEntries.forEach(([id, attendee]) => {
      this.cache.set(id, attendee);
    });
    
    console.log(`🧹 Cache cleaned: kept ${keepEntries.length} entries, removed ${entries.length - keepEntries.length}`);
  }
  
  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: ~500 bytes per attendee object
    return this.cache.size * 500;
  }
  
  /**
   * Performance monitoring
   */
  getPerformanceReport(): PerformanceMetrics & {
    recommendations: string[];
    isPerformant: boolean;
  } {
    const recommendations: string[] = [];
    let isPerformant = true;
    
    if (this.performanceMetrics.queryTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
      recommendations.push('Consider implementing database indexes');
      recommendations.push('Reduce page size or add more specific filters');
      isPerformant = false;
    }
    
    if (this.performanceMetrics.memoryUsage > PERFORMANCE_CONFIG.MEMORY_USAGE_THRESHOLD) {
      recommendations.push('Enable virtual scrolling for large lists');
      recommendations.push('Implement aggressive cache cleanup');
      isPerformant = false;
    }
    
    if (this.cache.size > PERFORMANCE_CONFIG.MAX_CACHE_SIZE) {
      recommendations.push('Cache size is too large, consider pagination');
      isPerformant = false;
    }
    
    return {
      ...this.performanceMetrics,
      recommendations,
      isPerformant
    };
  }
} 