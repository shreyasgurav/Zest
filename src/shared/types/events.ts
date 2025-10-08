import { BaseEntity, OwnedEntity, Location, MediaAsset } from './common';

// Event architecture types
export type EventArchitecture = 'legacy' | 'session-centric';
export type VenueType = 'global' | 'per_session';
export type EventStatus = 'draft' | 'active' | 'cancelled' | 'completed' | 'expired';

// Event categories
export type EventCategory = 'music' | 'comedy' | 'clubbing' | 'party' | 'art' | 'adventure' | 'sports';

// Creator information
export interface EventCreator {
  type: 'artist' | 'organisation' | 'venue';
  pageId: string;
  name: string;
  username: string;
  userId: string;
}

// Ticket types
export interface TicketType {
  name: string;
  price: number;
  capacity: number;
  available_capacity: number;
  description?: string;
  perks?: string[];
  transferable?: boolean;
  refundable?: boolean;
}

// Time slot (legacy)
export interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  session_id?: string;
}

// Event session (session-centric)
export interface EventSession extends BaseEntity {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date?: string; // For multi-day sessions
  venue?: string;
  description?: string;
  tickets: TicketType[];
  available: boolean;
  maxCapacity?: number;
  currentAttendees?: number;
  status?: 'active' | 'cancelled' | 'completed';
  metadata?: {
    requirements?: string[];
    included?: string[];
    excluded?: string[];
  };
}

// Event guides/information
export interface EventGuides {
  duration?: string;
  age_requirement?: string;
  language?: string;
  seating?: string;
  kid_friendly?: string;
  pet_friendly?: string;
  wheelchair?: string;
  parking?: string;
  food?: string;
  outdoor?: string;
  indoor?: string;
  dress_code?: string;
  photography?: string;
  alcohol?: string;
  [key: string]: string | undefined;
}

// Main event interface
export interface Event extends BaseEntity {
  title: string;
  event_type?: string;
  type?: string;
  architecture: EventArchitecture;
  
  // Basic information
  about_event: string;
  event_image?: string;
  event_categories: EventCategory[];
  event_languages?: string;
  
  // Location
  event_venue: string;
  venue_type: VenueType;
  location?: Location;
  
  // Enhanced location with coordinates (new)
  venue_coordinates?: {
    lat: number;
    lng: number;
    formatted_address: string;
    place_id?: string;
    city?: string;
    country?: string;
  };
  
  // Creator information
  hosting_club?: string; // Legacy field
  organization_username?: string; // Legacy field
  organizationId?: string; // Legacy field
  creator: EventCreator;
  
  // Event structure
  sessions: EventSession[];
  time_slots?: TimeSlot[]; // Legacy compatibility
  tickets?: TicketType[]; // Legacy compatibility
  
  // Statistics
  total_sessions: number;
  total_capacity: number;
  current_attendees?: number;
  
  // Metadata
  event_guides?: EventGuides;
  status: EventStatus;
  image_upload_status?: 'none' | 'success' | 'failed';
  
  // Analytics
  views?: number;
  bookings?: number;
  revenue?: number;
}

// Event creation/update data
export interface CreateEventData {
  title: string;
  about_event: string;
  event_venue: string;
  event_categories: EventCategory[];
  event_languages?: string;
  event_image?: string;
  sessions: Omit<EventSession, 'id' | 'createdAt' | 'updatedAt'>[];
  event_guides?: EventGuides;
  creator: EventCreator;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
  updatedAt: string;
}

// Event filters and search
export interface EventFilters {
  categories?: EventCategory[];
  location?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  capacity?: {
    min: number;
    max: number;
  };
  creator?: {
    type: 'artist' | 'organisation' | 'venue';
    id: string;
  };
  status?: EventStatus[];
  searchQuery?: string;
}

export interface EventSearchResult {
  events: Event[];
  total: number;
  facets?: {
    categories: { [key in EventCategory]: number };
    locations: { [location: string]: number };
    creators: { [creatorId: string]: number };
  };
}

// Event statistics
export interface EventStats {
  totalEvents: number;
  activeEvents: number;
  totalAttendees: number;
  totalRevenue: number;
  averageRating?: number;
  popularCategories: { category: EventCategory; count: number }[];
  recentBookings: number;
}

// Event analytics
export interface EventAnalytics {
  eventId: string;
  views: {
    total: number;
    unique: number;
    byDate: { date: string; count: number }[];
  };
  bookings: {
    total: number;
    successful: number;
    cancelled: number;
    byDate: { date: string; count: number }[];
  };
  revenue: {
    total: number;
    byTicketType: { ticketType: string; amount: number }[];
    byDate: { date: string; amount: number }[];
  };
  demographics?: {
    ageGroups: { range: string; count: number }[];
    locations: { city: string; count: number }[];
  };
}

// Event attendee
export interface EventAttendee extends BaseEntity {
  eventId: string;
  sessionId?: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  ticketType?: string;
  tickets?: Record<string, number>;
  selectedDate: string;
  selectedTimeSlot?: TimeSlot;
  selectedSession?: EventSession;
  totalAmount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  status: 'confirmed' | 'cancelled' | 'checked-in' | 'no-show';
  checkedInAt?: string;
  checkedInBy?: string;
  canCheckInIndependently?: boolean;
  phoneForFutureLink?: string;
  linkedToAccount?: boolean;
  linkedAt?: string;
}

// Event booking
export interface EventBooking {
  eventId: string;
  sessionId?: string;
  attendee: Omit<EventAttendee, 'id' | 'createdAt' | 'updatedAt'>;
  tickets: { [ticketType: string]: number };
  totalAmount: number;
  paymentMethod: 'razorpay' | 'stripe' | 'cash';
}

// Event capacity
export interface EventCapacity {
  total: number;
  available: number;
  booked: number;
  checkedIn?: number;
  byTicketType: {
    [ticketType: string]: {
      total: number;
      available: number;
      booked: number;
    };
  };
  bySession?: {
    [sessionId: string]: {
      total: number;
      available: number;
      booked: number;
    };
  };
} 