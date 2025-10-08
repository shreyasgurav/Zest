// 🚀 PRACTICAL IMPLEMENTATION OF IMPROVED EVENT STRUCTURE
// This shows how to implement the better structure in your existing system

import { db } from '@/infrastructure/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query, 
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  addDoc,
  serverTimestamp,
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { Event, Session, Attendee, Ticket } from '../utils/improvedEventStructure';

// ✅ STEP 1: EVENT CREATION WITH NEW STRUCTURE
export class NewEventManager {
  
  /**
   * Create event with subcollection structure
   */
  static async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) {
    const batch = writeBatch(db());
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // 1. Create main event document
    const eventRef = doc(db(), 'events', eventId);
    const event: Event = {
      ...eventData,
      id: eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    batch.set(eventRef, event);
    
    await batch.commit();
    return eventId;
  }
  
  /**
   * Add session to event (subcollection)
   */
  static async addSessionToEvent(eventId: string, sessionData: Omit<Session, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store in events/{eventId}/sessions/{sessionId}
    const sessionRef = doc(db(), 'events', eventId, 'sessions', sessionId);
    const session: Session = {
      ...sessionData,
      id: sessionId,
      eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await setDoc(sessionRef, session);
    return sessionId;
  }
  
  /**
   * Create attendee with proper references (NO FULL OBJECTS!)
   */
  static async createAttendee(attendeeData: {
    name: string;
    email: string;
    phone: string;
    eventId: string;
    sessionId: string;
    ticketTypeId: string;
    userId?: string;
  }) {
    const batch = writeBatch(db());
    
    // 1. Create ticket first
    const ticketId = await this.createTicket({
      eventId: attendeeData.eventId,
      sessionId: attendeeData.sessionId,
      ticketTypeId: attendeeData.ticketTypeId,
      userName: attendeeData.name,
      userEmail: attendeeData.email,
      userId: attendeeData.userId
    });
    
    // 2. Create attendee with ticket reference
    const attendeeId = `attendee_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const attendeeRef = doc(db(), 'attendees', attendeeId);
    
    const attendee: Attendee = {
      id: attendeeId,
      name: attendeeData.name,
      email: attendeeData.email,
      phone: attendeeData.phone,
      eventId: attendeeData.eventId,
      sessionId: attendeeData.sessionId,      // ✅ ONLY SESSION ID
      ticketId: ticketId,                     // ✅ ONLY TICKET ID
      checkedIn: false,
      paymentStatus: 'confirmed',
      bookingId: `booking_${attendeeId}`,
      createdAt: new Date().toISOString(),
      userId: attendeeData.userId
    };
    
    batch.set(attendeeRef, attendee);
    await batch.commit();
    
    return { attendeeId, ticketId };
  }
  
  /**
   * Create ticket with references only
   */
  static async createTicket(ticketData: {
    eventId: string;
    sessionId: string;
    ticketTypeId: string;
    userName: string;
    userEmail: string;
    userId?: string;
  }) {
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticketRef = doc(db(), 'tickets', ticketId);
    
    // Get price from ticket type (would fetch from session/event)
    const price = await this.getTicketTypePrice(ticketData.eventId, ticketData.sessionId, ticketData.ticketTypeId);
    
    const ticket: Ticket = {
      id: ticketId,
      ticketNumber: `TKT-${Date.now()}`,
      qrCode: `qr_${ticketId}`,
      eventId: ticketData.eventId,           // ✅ REFERENCE ONLY
      sessionId: ticketData.sessionId,       // ✅ REFERENCE ONLY
      attendeeId: '',                        // Will be set when attendee created
      ticketTypeId: ticketData.ticketTypeId, // ✅ REFERENCE ONLY
      price: price,
      status: 'active',
      userId: ticketData.userId,
      userName: ticketData.userName,
      userEmail: ticketData.userEmail,
      createdAt: new Date().toISOString(),
      isValid: true,
      validationHistory: [{
        timestamp: new Date().toISOString(),
        action: 'created'
      }]
    };
    
    await setDoc(ticketRef, ticket);
    return ticketId;
  }
  
  // Helper method
  private static async getTicketTypePrice(eventId: string, sessionId: string, ticketTypeId: string): Promise<number> {
    // Implementation would fetch from session or global ticket types
    return 100; // Placeholder
  }
}

// ✅ STEP 2: IMPROVED QUERIES (NO CLIENT-SIDE FILTERING!)
export class ImprovedQueries {
  
  /**
   * Get event sessions with real-time listener
   */
  static getEventSessions(eventId: string, callback: (sessions: Session[]) => void) {
    const sessionsRef = collection(db(), 'events', eventId, 'sessions');
    const sessionsQuery = query(sessionsRef, orderBy('date'), orderBy('start_time'));
    
    return onSnapshot(sessionsQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      
      callback(sessions);
    });
  }
  
  /**
   * Get session attendees (efficient query - no client-side filtering!)
   */
  static getSessionAttendees(sessionId: string, callback: (attendees: Attendee[]) => void) {
    const attendeesRef = collection(db(), 'attendees');
    const attendeesQuery = query(
      attendeesRef,
      where('sessionId', '==', sessionId),  // ✅ DIRECT QUERY
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(attendeesQuery, (snapshot) => {
      const attendees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendee[];
      
      callback(attendees);
    });
  }
  
  /**
   * Get session tickets (efficient query)
   */
  static getSessionTickets(sessionId: string, callback: (tickets: Ticket[]) => void) {
    const ticketsRef = collection(db(), 'tickets');
    const ticketsQuery = query(
      ticketsRef,
      where('sessionId', '==', sessionId),   // ✅ DIRECT QUERY
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(ticketsQuery, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      callback(tickets);
    });
  }
  
  /**
   * Get attendee with context (fetches related data dynamically)
   */
  static async getAttendeeWithContext(attendeeId: string) {
    const attendeeDoc = await getDoc(doc(db(), 'attendees', attendeeId));
    if (!attendeeDoc.exists()) throw new Error('Attendee not found');
    
    const attendee = { id: attendeeDoc.id, ...attendeeDoc.data() } as Attendee;
    
    // Fetch related data using references
    const [eventDoc, sessionDoc, ticketDoc] = await Promise.all([
      getDoc(doc(db(), 'events', attendee.eventId)),
      getDoc(doc(db(), 'events', attendee.eventId, 'sessions', attendee.sessionId)),
      getDoc(doc(db(), 'tickets', attendee.ticketId))
    ]);
    
    return {
      attendee,
      event: eventDoc.exists() ? { id: eventDoc.id, ...eventDoc.data() } : null,
      session: sessionDoc.exists() ? { id: sessionDoc.id, ...sessionDoc.data() } : null,
      ticket: ticketDoc.exists() ? { id: ticketDoc.id, ...ticketDoc.data() } : null
    };
  }
  
  /**
   * Get session capacity and availability
   */
  static async getSessionAvailability(eventId: string, sessionId: string) {
    // Get session info
    const sessionDoc = await getDoc(doc(db(), 'events', eventId, 'sessions', sessionId));
    if (!sessionDoc.exists()) throw new Error('Session not found');
    
    const session = { id: sessionDoc.id, ...sessionDoc.data() } as Session;
    
    // Count attendees for this session
    const attendeesRef = collection(db(), 'attendees');
    const attendeesQuery = query(attendeesRef, where('sessionId', '==', sessionId));
    const attendeesSnapshot = await getDocs(attendeesQuery);
    
    const soldTickets = attendeesSnapshot.size;
    const availableTickets = session.capacity - soldTickets;
    
    return {
      session,
      soldTickets,
      availableTickets,
      capacity: session.capacity,
      percentageSold: (soldTickets / session.capacity) * 100
    };
  }
}

// ✅ STEP 3: MIGRATION FROM OLD TO NEW STRUCTURE
export class StructureMigration {
  
  /**
   * Migrate existing event to new structure
   */
  static async migrateExistingEvent(eventId: string) {
    console.log(`🔄 Starting migration for event ${eventId}`);
    
    // 1. Get old event data
    const oldEventDoc = await getDoc(doc(db(), 'events', eventId));
    if (!oldEventDoc.exists()) throw new Error('Event not found');
    
    const oldEventData = oldEventDoc.data();
    const batch = writeBatch(db());
    
    // 2. Create new event structure (remove sessions array)
    const newEventData = {
      ...oldEventData,
      // Remove the sessions array - they'll be in subcollection
      sessions: undefined,
      time_slots: undefined, // Move to session level
      architecture: 'session-centric',
      updatedAt: serverTimestamp()
    };
    
    batch.update(doc(db(), 'events', eventId), newEventData);
    
    // 3. Migrate sessions to subcollection
    if (oldEventData.sessions && Array.isArray(oldEventData.sessions)) {
      for (const oldSession of oldEventData.sessions) {
        const sessionRef = doc(db(), 'events', eventId, 'sessions', oldSession.id);
        const newSession: Session = {
          id: oldSession.id,
          eventId: eventId,
          name: oldSession.name,
          date: oldSession.date,
          start_time: oldSession.start_time,
          end_time: oldSession.end_time,
          venue: oldSession.venue,
          description: oldSession.description,
          capacity: oldSession.maxCapacity || oldSession.tickets.reduce((sum: number, t: any) => sum + t.capacity, 0),
          useGlobalTicketTypes: false,
          sessionTicketTypes: oldSession.tickets,
          status: 'active',
          createdAt: oldSession.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        batch.set(sessionRef, newSession);
      }
    }
    
    await batch.commit();
    console.log(`✅ Migration completed for event ${eventId}`);
  }
  
  /**
   * Clean up attendees - remove full selectedSession objects
   */
  static async cleanupAttendees(eventId: string) {
    console.log(`🧹 Cleaning up attendees for event ${eventId}`);
    
    const attendeesRef = collection(db(), 'eventAttendees');
    const attendeesQuery = query(attendeesRef, where('eventId', '==', eventId));
    const attendeesSnapshot = await getDocs(attendeesQuery);
    
    const batch = writeBatch(db());
    
    attendeesSnapshot.docs.forEach((attendeeDoc) => {
      const attendeeData = attendeeDoc.data();
      
      // Remove full selectedSession object, keep only sessionId
      const cleanedData = {
        ...attendeeData,
        selectedSession: undefined, // ❌ Remove full object
        selectedTimeSlot: undefined, // ❌ Remove redundant data
        // Keep only the reference
        sessionId: attendeeData.sessionId || attendeeData.selectedSession?.id
      };
      
      batch.update(attendeeDoc.ref, cleanedData);
    });
    
    await batch.commit();
    console.log(`✅ Attendees cleanup completed for event ${eventId}`);
  }
}

// ✅ STEP 4: USAGE EXAMPLES

// Example: Create new event with improved structure
export const createImprovedEvent = async () => {
  // 1. Create event
  const eventId = await NewEventManager.createEvent({
    title: "Modern Concert",
    about_event: "Amazing concert with new structure",
    event_venue: "New Venue",
    event_categories: ["music"],
    event_guides: {},
    creator: {
      type: 'organisation',
      pageId: 'org123',
      name: 'Event Org',
      username: 'eventorg',
      userId: 'user123'
    },
    architecture: 'session-centric',
    status: 'active'
  });
  
  // 2. Add sessions (subcollection)
  const sessionId = await NewEventManager.addSessionToEvent(eventId, {
    name: "Evening Session",
    date: "2024-12-25",
    start_time: "19:00",
    end_time: "22:00",
    capacity: 100,
    useGlobalTicketTypes: false,
    sessionTicketTypes: [
      { id: 'general', name: 'General', price: 500, capacity: 80 },
      { id: 'vip', name: 'VIP', price: 1000, capacity: 20 }
    ],
    status: 'active'
  });
  
  // 3. Add attendees (with references only)
  await NewEventManager.createAttendee({
    name: "John Doe",
    email: "john@example.com",
    phone: "+91234567890",
    eventId: eventId,
    sessionId: sessionId,
    ticketTypeId: 'general'
  });
  
  return { eventId, sessionId };
};

// Example: Set up real-time listeners with new structure
export const setupImprovedDashboard = (eventId: string) => {
  // Listen to sessions
  const unsubscribeSessions = ImprovedQueries.getEventSessions(eventId, (sessions) => {
    console.log('📊 Sessions updated:', sessions.length);
    
    // For each session, set up attendee listeners
    sessions.forEach(session => {
      ImprovedQueries.getSessionAttendees(session.id, (attendees) => {
        console.log(`👥 Session ${session.name}: ${attendees.length} attendees`);
      });
    });
  });
  
  return () => {
    unsubscribeSessions();
  };
};

export default {
  NewEventManager,
  ImprovedQueries,
  StructureMigration,
  createImprovedEvent,
  setupImprovedDashboard
}; 