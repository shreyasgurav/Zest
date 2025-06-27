import { Timestamp as FirestoreTimestamp } from 'firebase/firestore';

// ===== UNIFIED EVENT ARCHITECTURE =====

export interface UnifiedEvent {
  // === CORE METADATA ===
  id: string;
  title: string;
  event_type: "event";
  architecture: "unified";
  mode: "simple" | "session-centric";
  
  // === EVENT DETAILS ===
  about_event: string;
  event_image?: string;
  event_categories: string[];
  event_languages?: string;
  event_guides: Record<string, string>;
  
  // === VENUE CONFIGURATION ===
  venue_type: "global" | "per_session";
  global_venue?: string;
  
  // === SESSION-FIRST STRUCTURE (Primary) ===
  sessions: EventSession[];
  
  // === EVENT-LEVEL AGGREGATES (For Performance) ===
  total_sessions: number;
  total_capacity: number;
  earliest_date: string;
  latest_date: string;
  price_range: {
    min: number;
    max: number;
  };
  
  // === CREATOR INFO ===
  creator: {
    type: "artist" | "organisation" | "venue";
    pageId: string;
    name: string;
    username: string;
    userId: string;
  };
  
  // === LEGACY COMPATIBILITY (Deprecated) ===
  time_slots?: LegacyTimeSlot[];
  tickets?: LegacyTicket[];
  
  // === METADATA ===
  organizationId: string;
  hosting_club: string;
  organization_username: string;
  status: "active" | "cancelled" | "completed" | "draft";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface EventSession {
  // === SESSION IDENTITY ===
  id: string;                    // "sess_001", "sess_002"
  name: string;                  // "Session 1", "Opening Ceremony"
  description?: string;
  
  // === TIMING ===
  date: string;                  // "2024-01-15"
  start_time: string;            // "10:00"
  end_time: string;              // "12:00"
  start_datetime: FirestoreTimestamp;
  end_datetime: FirestoreTimestamp;
  
  // === VENUE (Per-Session Override) ===
  venue?: string;
  
  // === TICKETS WITH HIERARCHICAL IDS ===
  tickets: SessionTicket[];
  
  // === SESSION AGGREGATES ===
  max_capacity: number;
  available_capacity: number;
  sold_count: number;
  revenue: number;
  
  // === SESSION STATUS ===
  status: "active" | "cancelled" | "completed" | "sold_out";
  available: boolean;
}

export interface SessionTicket {
  // === TICKET IDENTITY ===
  id: string;                    // "tick_001", "tick_002"
  name: string;                  // "General", "VIP", "Student"
  description?: string;
  
  // === PRICING & CAPACITY ===
  price: number;
  capacity: number;
  available_capacity: number;
  sold_count: number;
  
  // === TICKET METADATA ===
  sort_order: number;
  ticket_type: "paid" | "free" | "donation";
  status: "active" | "disabled" | "sold_out";
}

export interface UnifiedAttendee {
  // === CORE IDENTITY ===
  id: string;
  
  // === EVENT LINKING (Primary Keys) ===
  eventId: string;
  sessionId: string;             // ALWAYS set, even for simple mode
  ticketId: string;              // References session.tickets[].id
  
  // === USER INFORMATION ===
  name: string;
  email: string;
  phone: string;
  userId?: string;
  
  // === DISPLAY DATA (Denormalized for Performance) ===
  eventTitle: string;
  sessionName: string;
  ticketType: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  venue: string;
  
  // === BOOKING INFORMATION ===
  bookingId: string;
  ticketIndex: number;
  totalTicketsInBooking: number;
  
  // === PAYMENT DATA ===
  individualAmount: number;
  originalBookingAmount: number;
  paymentId: string;
  paymentStatus: "completed" | "pending" | "failed" | "refunded";
  
  // === CHECK-IN SYSTEM ===
  checkedIn: boolean;
  checkInTime?: FirestoreTimestamp;
  checkInMethod?: "qr" | "manual" | "bulk";
  checkedInBy?: string;
  
  // === INDIVIDUAL ATTENDEE FLAGS ===
  canCheckInIndependently: boolean;
  canTransferTicket: boolean;
  canRefundTicket: boolean;
  
  // === METADATA ===
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  status: "confirmed" | "pending" | "cancelled" | "refunded";
}

export interface UnifiedTicket {
  // === CORE IDENTITY ===
  id: string;
  ticketNumber: string;          // "TKT-ABC123"
  
  // === HIERARCHICAL LINKING ===
  eventId: string;
  sessionId: string;
  ticketId: string;              // References session.tickets[].id
  attendeeId: string;
  
  // === USER DATA ===
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  
  // === BOOKING REFERENCE ===
  bookingId: string;
  
  // === VERIFICATION DATA ===
  qrCode: string;
  qrData: {
    eventId: string;
    sessionId: string;
    ticketId: string;
    attendeeId: string;
    securityHash: string;
  };
  
  // === TICKET STATUS ===
  status: "active" | "used" | "cancelled" | "expired" | "transferred";
  usedAt?: FirestoreTimestamp;
  transferredTo?: string;
  
  // === METADATA ===
  createdAt: FirestoreTimestamp;
  type: "event";
}

export interface UnifiedBooking {
  // === BOOKING IDENTITY ===
  id: string;
  bookingReference: string;      // "BOOK-XYZ789"
  
  // === EVENT INFORMATION ===
  eventId: string;
  sessionId: string;
  
  // === USER INFORMATION ===
  userId?: string;
  primaryAttendee: {
    name: string;
    email: string;
    phone: string;
  };
  
  // === TICKET BREAKDOWN ===
  ticketBreakdown: Array<{
    ticketId: string;
    ticketType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  
  // === PAYMENT INFORMATION ===
  totalAmount: number;
  paymentId: string;
  paymentMethod: "razorpay" | "stripe" | "cash";
  paymentStatus: "completed" | "pending" | "failed" | "refunded";
  
  // === GENERATED RESOURCES ===
  attendeeIds: string[];
  ticketIds: string[];
  
  // === METADATA ===
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  status: "confirmed" | "pending" | "cancelled" | "partially_refunded" | "fully_refunded";
}

// ===== LEGACY COMPATIBILITY TYPES =====

export interface LegacyTimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  session_id?: string;
}

export interface LegacyTicket {
  name: string;
  capacity: number;
  price: number;
  available_capacity: number;
}

// ===== CONVERSION HELPERS =====

export interface CreateEventParams {
  isLegacyMode: boolean;
  eventTitle: string;
  eventVenue: string;
  aboutEvent: string;
  selectedCategories: string[];
  eventLanguages: string;
  guides: Record<string, string>;
  eventImage?: string;
  
  // Legacy mode data
  eventSlots?: Array<{date: string; startTime: string; endTime: string}>;
  tickets?: Array<{name: string; capacity: string; price: string}>;
  
  // Session-centric mode data
  eventSessions?: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    tickets: Array<{name: string; capacity: string; price: string}>;
  }>;
  
  // Creator info
  creatorInfo: {
    type: string;
    pageId: string;
    name: string;
    username: string;
  };
  currentUserId: string;
}

// ===== TYPE GUARDS =====

export function isUnifiedEvent(event: any): event is UnifiedEvent {
  return event && event.architecture === "unified" && Array.isArray(event.sessions);
}

export function isLegacyEvent(event: any): boolean {
  return event && (event.architecture === "legacy" || (event.time_slots && !event.sessions));
}

export function isSessionCentricEvent(event: any): boolean {
  return event && event.architecture === "session-centric" && Array.isArray(event.sessions);
}

// ===== UTILITY TYPES =====

export type EventMode = "simple" | "session-centric";
export type VenueType = "global" | "per_session";
export type AttendeeStatus = "confirmed" | "pending" | "cancelled" | "refunded";
export type PaymentStatus = "completed" | "pending" | "failed" | "refunded";
export type TicketStatus = "active" | "disabled" | "sold_out";
export type SessionStatus = "active" | "cancelled" | "completed" | "sold_out"; 