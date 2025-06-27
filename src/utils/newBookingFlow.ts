import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  serverTimestamp, 
  increment,
  query,
  where,
  getDocs 
} from 'firebase/firestore';

interface BookingData {
  eventId: string;
  sessionId: string;  // Using new sessionId format
  attendeeInfo: {
    name: string;
    email: string;
    phone: string;
  };
  ticketSelections: Array<{
    ticketName: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentData: {
    paymentId: string;
    totalAmount: number;
  };
  userId?: string;
}

// 🚀 NEW BOOKING FLOW: Works with sessionId and updates available_capacity
export const createBookingWithNewArchitecture = async (bookingData: BookingData) => {
  return await runTransaction(db, async (transaction) => {
    // 1. Get event data and verify session exists
    const eventRef = doc(db, "events", bookingData.eventId);
    const eventDoc = await transaction.get(eventRef);
    
    if (!eventDoc.exists()) {
      throw new Error("Event not found");
    }
    
    const eventData = eventDoc.data();
    const session = eventData.sessions?.find((s: any) => s.sessionId === bookingData.sessionId);
    
    if (!session) {
      throw new Error(`Session ${bookingData.sessionId} not found`);
    }

    // 2. Verify ticket availability
    for (const selection of bookingData.ticketSelections) {
      const ticket = session.tickets.find((t: any) => t.name === selection.ticketName);
      if (!ticket) {
        throw new Error(`Ticket type "${selection.ticketName}" not found in session`);
      }
      if (ticket.available_capacity < selection.quantity) {
        throw new Error(`Only ${ticket.available_capacity} tickets available for ${selection.ticketName}`);
      }
    }

    // 3. Create individual attendee records with NEW structure
    const attendeeIds: string[] = [];
    const totalTickets = bookingData.ticketSelections.reduce((sum, s) => sum + s.quantity, 0);

    for (const selection of bookingData.ticketSelections) {
      for (let i = 0; i < selection.quantity; i++) {
        const attendeeRef = doc(collection(db, "eventAttendees"));
        
        const attendeeData = {
          // 🎯 GUARANTEED FIELDS - Always present
          eventId: bookingData.eventId,
          sessionId: bookingData.sessionId,  // NEW: sessionId format
          
          // User info
          name: bookingData.attendeeInfo.name,
          email: bookingData.attendeeInfo.email,
          phone: bookingData.attendeeInfo.phone,
          userId: bookingData.userId,
          
          // 🎯 DENORMALIZED DATA - For fast dashboard queries
          eventTitle: eventData.title,
          sessionTitle: session.title,
          sessionStartTime: session.start_time,
          sessionEndTime: session.end_time,
          ticketType: selection.ticketName,
          venue: eventData.event_venue,
          
          // Payment info
          individualAmount: selection.unitPrice,
          paymentId: bookingData.paymentData.paymentId,
          paymentStatus: "completed",
          
          // Check-in defaults
          checkedIn: false,
          canCheckInIndependently: true,
          
          // Metadata
          status: "confirmed",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        transaction.set(attendeeRef, attendeeData);
        attendeeIds.push(attendeeRef.id);
      }
    }

    // 4. Update available_capacity in real-time for each ticket type
    const updatedSessions = eventData.sessions.map((s: any) => {
      if (s.sessionId === bookingData.sessionId) {
        const updatedTickets = s.tickets.map((ticket: any) => {
          const selection = bookingData.ticketSelections.find(sel => sel.ticketName === ticket.name);
          if (selection) {
            return {
              ...ticket,
              available_capacity: ticket.available_capacity - selection.quantity
            };
          }
          return ticket;
        });
        
        return {
          ...s,
          tickets: updatedTickets
        };
      }
      return s;
    });

    // 5. Update the event document with new capacities
    transaction.update(eventRef, {
      sessions: updatedSessions,
      updatedAt: serverTimestamp()
    });

    return { 
      attendeeIds, 
      totalTickets,
      sessionId: bookingData.sessionId 
    };
  });
};

// 🎯 NEW DASHBOARD QUERIES: Super fast with sessionId
export const getAttendeesForSession = async (eventId: string, sessionId: string) => {
  const attendeesQuery = query(
    collection(db, "eventAttendees"),
    where("eventId", "==", eventId),
    where("sessionId", "==", sessionId),  // Direct sessionId match!
    where("status", "==", "confirmed")
  );
  
  const snapshot = await getDocs(attendeesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getAllEventAttendees = async (eventId: string) => {
  const attendeesQuery = query(
    collection(db, "eventAttendees"),
    where("eventId", "==", eventId),
    where("status", "==", "confirmed")
  );
  
  const snapshot = await getDocs(attendeesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// 🎯 NEW SESSION STATS: Use real-time available_capacity
export const calculateSessionStats = (session: any, attendees: any[]) => {
  const totalCapacity = session.tickets.reduce((sum: number, t: any) => sum + t.capacity, 0);
  const totalSold = session.tickets.reduce((sum: number, t: any) => sum + (t.capacity - t.available_capacity), 0);
  const checkedInCount = attendees.filter(a => a.checkedIn).length;
  
  return {
    sessionId: session.sessionId,
    title: session.title,
    startTime: session.start_time,
    endTime: session.end_time,
    totalCapacity,
    totalSold,
    availableCapacity: session.tickets.reduce((sum: number, t: any) => sum + t.available_capacity, 0),
    checkedInCount,
    attendees: attendees.length,
    utilizationRate: totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0,
    checkInRate: attendees.length > 0 ? (checkedInCount / attendees.length) * 100 : 0
  };
}; 