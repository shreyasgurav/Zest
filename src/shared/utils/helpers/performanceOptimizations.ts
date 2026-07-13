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
}

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

export interface PerformanceMetrics {
  queryTime: number;
  renderTime: number;
  memoryUsage: number;
  attendeeCount: number;
  lastUpdate: Date;
}

export class LargeEventOptimizer {
  // Stubbed for API usage
  async loadAttendeesPaginated(eventId: string, options: any) {
    return {
      attendees: [],
      pagination: {
        currentPage: 1,
        pageSize: 50,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        loading: false
      },
      metrics: {
        queryTime: 0,
        renderTime: 0,
        memoryUsage: 0,
        attendeeCount: 0,
        lastUpdate: new Date()
      }
    };
  }

  subscribeToAttendeeUpdates(eventId: string, callback: any) {
    return () => {};
  }
}