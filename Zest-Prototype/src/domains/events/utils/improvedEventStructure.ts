// ✅ IMPROVED EVENT STRUCTURE - Scalable & Normalized
// Based on feedback for better data integrity and performance

// 📋 Core Interfaces
export interface Event {
  id: string;
  title: string;
  about_event: string;
  event_venue: string;
  event_image?: string;
  event_categories: string[];
  event_guides: Record<string, string>;
  
  // Creator information
  creator: {
    type: 'artist' | 'organisation' | 'venue';
    pageId: string;
    name: string;
    username: string;
    userId: string;
  };
  
  // Architecture type
  architecture: 'session-centric' | 'legacy';
  
  // Global ticket types (if most sessions follow same pricing)
  globalTicketTypes?: TicketType[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft' | 'cancelled';
}

export interface Session {
  id: string;
  eventId: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  venue?: string; // Override global venue if needed
  description?: string;
  capacity: number;
  
  // Use global ticket types or session-specific
  useGlobalTicketTypes: boolean;
  sessionTicketTypes?: TicketType[]; // Only if not using global
  
  // Status
  status: 'active' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  description?: string;
  restrictions?: string[];
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  
  // Event and session references (NO FULL OBJECTS!)
  eventId: string;
  sessionId: string;      // ✅ ONLY SESSION ID
  ticketId: string;       // ✅ REFERENCE TO TICKET DOCUMENT
  
  // Check-in status
  checkedIn: boolean;
  checkInTime?: string;
  checkInMethod?: 'qr' | 'manual';
  checkedInBy?: string;
  
  // Payment tracking
  paymentStatus: 'confirmed' | 'pending' | 'failed' | 'refunded';
  bookingId: string;
  
  // Metadata
  createdAt: string;
  userId?: string; // If user has account
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  qrCode: string;
  
  // References (NO FULL OBJECTS!)
  eventId: string;
  sessionId: string;
  attendeeId: string;
  ticketTypeId: string;
  
  // Ticket info
  price: number;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  usedAt?: string;
  
  // User info
  userId?: string;
  userName: string;
  userEmail: string;
  
  // Metadata
  createdAt: string;
  isValid: boolean;
  validationHistory: ValidationEvent[];
}

export interface Payment {
  id: string;
  paymentId: string;
  orderId: string;
  
  // References
  eventId: string;
  sessionId?: string;
  userId: string;
  
  // Payment details
  amount: number;
  currency: 'INR';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: 'razorpay' | 'manual' | 'free';
  
  // Associated tickets
  ticketIds: string[];
  attendeeIds: string[];
  
  // Metadata
  createdAt: string;
  completedAt?: string;
  refundedAt?: string;
}

interface ValidationEvent {
  timestamp: string;
  action: 'created' | 'used' | 'cancelled' | 'expired';
  location?: string;
  checkedInBy?: string;
}

// 🔧 UTILITY FUNCTIONS FOR NEW STRUCTURE

export class ImprovedEventManager {
  
  /**
   * Create event with proper structure
   */
  static async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const event: Event = {
      ...eventData,
      id: eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Store in events collection
    return event;
  }
  
  /**
   * Create session under event
   */
  static async createSession(eventId: string, sessionData: Omit<Session, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const session: Session = {
      ...sessionData,
      id: sessionId,
      eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Store in events/{eventId}/sessions/{sessionId}
    return session;
  }
  
  /**
   * Create attendee with proper references
   */
  static async createAttendee(
    eventId: string, 
    sessionId: string, 
    ticketId: string,
    attendeeData: Omit<Attendee, 'id' | 'eventId' | 'sessionId' | 'ticketId' | 'createdAt'>
  ) {
    const attendeeId = `attendee_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const attendee: Attendee = {
      ...attendeeData,
      id: attendeeId,
      eventId,
      sessionId,
      ticketId,
      createdAt: new Date().toISOString(),
    };
    
    return attendee;
  }
  
  /**
   * Get complete event data (fetch from multiple collections)
   */
  static async getCompleteEventData(eventId: string) {
    // Fetch event, sessions, and aggregated stats
    // This replaces the monolithic event document
    
    const event = await this.getEvent(eventId);
    const sessions = await this.getEventSessions(eventId);
    const stats = await this.getEventStats(eventId);
    
    return {
      event,
      sessions,
      stats
    };
  }
  
  /**
   * Get session with real-time availability
   */
  static async getSessionWithAvailability(eventId: string, sessionId: string) {
    const session = await this.getSession(eventId, sessionId);
    const attendeeCount = await this.getSessionAttendeeCount(sessionId);
    const ticketsSold = await this.getSessionTicketsSold(sessionId);
    
    return {
      ...session,
      attendeeCount,
      ticketsSold,
      availableCapacity: session.capacity - attendeeCount
    };
  }
  
  /**
   * Get attendee with full context (without storing full objects)
   */
  static async getAttendeeWithContext(attendeeId: string) {
    const attendee = await this.getAttendee(attendeeId);
    const event = await this.getEvent(attendee.eventId);
    const session = await this.getSession(attendee.eventId, attendee.sessionId);
    const ticket = await this.getTicket(attendee.ticketId);
    
    return {
      attendee,
      event: { id: event.id, title: event.title }, // Only essential data
      session: { id: session.id, name: session.name, date: session.date },
      ticket: { id: ticket.id, status: ticket.status }
    };
  }
  
  // Private helper methods (would implement with actual DB calls)
  private static async getEvent(eventId: string): Promise<Event> {
    // Implementation: fetch from events collection
    throw new Error('Not implemented');
  }
  
  private static async getEventSessions(eventId: string): Promise<Session[]> {
    // Implementation: fetch from events/{eventId}/sessions subcollection
    throw new Error('Not implemented');
  }
  
  private static async getSession(eventId: string, sessionId: string): Promise<Session> {
    // Implementation: fetch from events/{eventId}/sessions/{sessionId}
    throw new Error('Not implemented');
  }
  
  private static async getAttendee(attendeeId: string): Promise<Attendee> {
    // Implementation: fetch from attendees collection
    throw new Error('Not implemented');
  }
  
  private static async getTicket(ticketId: string): Promise<Ticket> {
    // Implementation: fetch from tickets collection
    throw new Error('Not implemented');
  }
  
  private static async getEventStats(eventId: string) {
    // Implementation: aggregate stats from attendees/tickets
    throw new Error('Not implemented');
  }
  
  private static async getSessionAttendeeCount(sessionId: string): Promise<number> {
    // Implementation: count attendees for session
    throw new Error('Not implemented');
  }
  
  private static async getSessionTicketsSold(sessionId: string): Promise<number> {
    // Implementation: count sold tickets for session
    throw new Error('Not implemented');
  }
}

// 📊 FIRESTORE STRUCTURE
export const IMPROVED_FIRESTORE_STRUCTURE = `
// ✅ IMPROVED STRUCTURE

events/
  {eventId}/
    title, about_event, creator, globalTicketTypes, etc.
    
    sessions/          // SUBCOLLECTION 🎯
      {sessionId}/
        name, date, start_time, end_time, capacity, etc.
        
        timeSlots/     // SUBCOLLECTION under session
          {slotId}/
            start_time, end_time, available, etc.

attendees/            // TOP-LEVEL COLLECTION
  {attendeeId}/
    eventId            // REFERENCE ONLY ✅
    sessionId          // REFERENCE ONLY ✅  
    ticketId           // REFERENCE ONLY ✅
    name, email, phone, checkedIn, etc.

tickets/              // TOP-LEVEL COLLECTION
  {ticketId}/
    eventId            // REFERENCE ONLY ✅
    sessionId          // REFERENCE ONLY ✅
    attendeeId         // REFERENCE ONLY ✅
    ticketTypeId       // REFERENCE ONLY ✅
    status, price, qrCode, etc.

payments/             // TOP-LEVEL COLLECTION
  {paymentId}/
    eventId, sessionId, amount, status
    ticketIds[], attendeeIds[]

// Optional: For better performance
eventStats/           // COMPUTED/CACHED STATS
  {eventId}/
    totalAttendees, totalRevenue, sessionStats
`;

// 🚀 MIGRATION UTILITIES

interface MigrationRecord {
  type: 'event' | 'session' | 'attendee';
  data: Event | Session | Attendee;
  eventId?: string;
}

export class EventStructureMigration {
  
  /**
   * Migrate old event structure to new improved structure
   */
  static async migrateEvent(oldEventData: any): Promise<MigrationRecord[]> {
    const migrations: MigrationRecord[] = [];
    
    // 1. Extract event core data
    const event: Event = {
      id: oldEventData.id,
      title: oldEventData.title,
      about_event: oldEventData.about_event,
      event_venue: oldEventData.event_venue,
      event_image: oldEventData.event_image,
      event_categories: oldEventData.event_categories || [],
      event_guides: oldEventData.event_guides || {},
      creator: oldEventData.creator,
      architecture: 'session-centric',
      createdAt: oldEventData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    migrations.push({ type: 'event', data: event });
    
    // 2. Migrate sessions from array to subcollection
    if (oldEventData.sessions) {
      oldEventData.sessions.forEach((oldSession: any) => {
        const session: Session = {
          id: oldSession.id,
          eventId: oldEventData.id,
          name: oldSession.name,
          date: oldSession.date,
          start_time: oldSession.start_time,
          end_time: oldSession.end_time,
          venue: oldSession.venue,
          description: oldSession.description,
          capacity: oldSession.maxCapacity || oldSession.tickets.reduce((sum: number, t: any) => sum + t.capacity, 0),
          useGlobalTicketTypes: false,
          sessionTicketTypes: oldSession.tickets.map((t: any) => ({
            id: `${oldSession.id}_${t.name}`,
            name: t.name,
            price: t.price,
            capacity: t.capacity
          })),
          status: 'active',
          createdAt: oldSession.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        migrations.push({ type: 'session', data: session, eventId: oldEventData.id });
      });
    }
    
    return migrations;
  }
  
  /**
   * Migrate old attendee records
   */
  static async migrateAttendees(oldAttendees: any[]): Promise<MigrationRecord[]> {
    const migrations: MigrationRecord[] = [];
    
    oldAttendees.forEach((oldAttendee: any) => {
      // Extract only session ID (remove full selectedSession object)
      const sessionId = oldAttendee.sessionId || 
                       oldAttendee.selectedSession?.id || 
                       'legacy_session';
      
      const attendee: Attendee = {
        id: oldAttendee.id,
        name: oldAttendee.name,
        email: oldAttendee.email,
        phone: oldAttendee.phone,
        eventId: oldAttendee.eventId,
        sessionId: sessionId,
        ticketId: oldAttendee.ticketIds?.[0] || `ticket_${oldAttendee.id}`,
        checkedIn: oldAttendee.checkedIn || false,
        checkInTime: oldAttendee.checkInTime,
        checkInMethod: oldAttendee.checkInMethod,
        checkedInBy: oldAttendee.checkedInBy,
        paymentStatus: oldAttendee.paymentStatus || 'confirmed',
        bookingId: oldAttendee.bookingId || oldAttendee.id,
        createdAt: oldAttendee.createdAt,
        userId: oldAttendee.userId
      };
      
      migrations.push({ type: 'attendee', data: attendee });
    });
    
    return migrations;
  }
}

export default ImprovedEventManager; 