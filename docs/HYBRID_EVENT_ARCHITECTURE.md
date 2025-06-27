# Production-Level Hybrid Event Architecture

## 🎯 **Executive Summary**

This document outlines a unified, production-ready Firestore architecture that efficiently handles both **Simple Mode** (legacy) and **Session-Centric Mode** events while optimizing for booking flows and dynamic dashboard performance.

## 📊 **Current Architecture Analysis**

### **Simple Mode (Legacy)**
- **Structure**: One set of tickets applies to ALL time slots
- **Use Case**: Basic events, single pricing structure
- **Example**: Concert with multiple shows, same ticket types/prices

### **Session-Centric Mode** 
- **Structure**: Each session has unique tickets, pricing, capacity
- **Use Case**: Complex events, workshops, multi-day conferences
- **Example**: Workshop Day 1 (3 ticket types), Day 2 (2 ticket types)

### **Current Problems**
1. **Data Duplication**: Storing both `sessions` and `time_slots`
2. **Complex Filtering**: Multiple fallback methods for attendee matching
3. **Inconsistent Linking**: Mixed sessionId vs time/date matching
4. **No Hierarchical IDs**: Tickets within sessions not uniquely identifiable
5. **Performance Issues**: Complex queries for dashboard operations

---

## 🏗️ **Optimal Firestore Architecture**

### **1. Event Document Structure**

```typescript
// Collection: "events"
interface Event {
  // === CORE METADATA ===
  id: string;                    // Auto-generated document ID
  title: string;                 // "Tech Conference 2024"
  event_type: "event";           // Always "event"
  architecture: "unified";       // New unified architecture
  mode: "simple" | "session-centric"; // Original creation mode
  
  // === EVENT DETAILS ===
  about_event: string;
  event_image?: string;
  event_categories: string[];
  event_languages?: string;
  event_guides: Record<string, string>;
  
  // === VENUE INFORMATION ===
  venue_type: "global" | "per_session";
  global_venue?: string;         // For simple mode
  
  // === SESSION-FIRST STRUCTURE (Primary) ===
  sessions: EventSession[];      // Always present, even for simple mode
  
  // === EVENT-LEVEL AGGREGATES (For Performance) ===
  total_sessions: number;
  total_capacity: number;
  earliest_date: string;         // "2024-01-15" - for sorting
  latest_date: string;           // "2024-01-17" - for filtering
  price_range: {
    min: number;                 // Lowest ticket price across all sessions
    max: number;                 // Highest ticket price across all sessions
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
  time_slots?: TimeSlot[];       // Generated from sessions for backward compatibility
  tickets?: Ticket[];            // First session's tickets for legacy booking
  
  // === METADATA ===
  organizationId: string;
  hosting_club: string;
  organization_username: string;
  status: "active" | "cancelled" | "completed" | "draft";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

interface EventSession {
  // === SESSION IDENTITY ===
  id: string;                    // "sess_001", "sess_002" - Unique within event
  name: string;                  // "Session 1", "Opening Ceremony", etc.
  description?: string;
  
  // === TIMING ===
  date: string;                  // "2024-01-15" (ISO date)
  start_time: string;            // "10:00" (24-hour format)
  end_time: string;              // "12:00" (24-hour format)
  start_datetime: FirestoreTimestamp; // Computed for sorting/filtering
  end_datetime: FirestoreTimestamp;
  
  // === VENUE (Per-Session Override) ===
  venue?: string;                // If different from global venue
  
  // === TICKETS WITH HIERARCHICAL IDS ===
  tickets: SessionTicket[];
  
  // === SESSION AGGREGATES ===
  max_capacity: number;          // Sum of all ticket capacities
  available_capacity: number;    // Real-time available tickets
  sold_count: number;            // Number of tickets sold
  revenue: number;               // Total revenue for this session
  
  // === SESSION STATUS ===
  status: "active" | "cancelled" | "completed" | "sold_out";
  available: boolean;            // Can users book this session?
}

interface SessionTicket {
  // === TICKET IDENTITY ===
  id: string;                    // "tick_001", "tick_002" - Unique within session
  name: string;                  // "General", "VIP", "Student"
  description?: string;
  
  // === PRICING & CAPACITY ===
  price: number;                 // 500.00
  capacity: number;              // 100
  available_capacity: number;    // 75 (real-time)
  sold_count: number;            // 25
  
  // === TICKET METADATA ===
  sort_order: number;            // For display ordering
  ticket_type: "paid" | "free" | "donation";
  status: "active" | "disabled" | "sold_out";
}
```

### **2. Attendee Document Structure**

```typescript
// Collection: "attendees" (not nested, for performance)
interface Attendee {
  // === CORE IDENTITY ===
  id: string;                    // Auto-generated
  
  // === EVENT LINKING (Primary Keys) ===
  eventId: string;               // Links to event document
  sessionId: string;             // Always set - even for simple mode events
  ticketId: string;              // Links to specific ticket within session
  
  // === USER INFORMATION ===
  name: string;
  email: string;
  phone: string;
  userId?: string;               // If registered user
  
  // === DISPLAY DATA (Denormalized for Performance) ===
  eventTitle: string;            // "Tech Conference 2024"
  sessionName: string;           // "Session 1"
  ticketType: string;            // "General"
  sessionDate: string;           // "2024-01-15"
  sessionStartTime: string;      // "10:00"
  sessionEndTime: string;        // "12:00"
  venue: string;                 // Resolved venue (global or session-specific)
  
  // === BOOKING INFORMATION ===
  bookingId: string;             // Groups multiple attendees from same booking
  ticketIndex: number;           // 1, 2, 3... for multi-ticket bookings
  totalTicketsInBooking: number; // How many tickets in the original booking
  
  // === PAYMENT DATA ===
  individualAmount: number;      // This attendee's portion (e.g., 500)
  originalBookingAmount: number; // Total amount of original booking
  paymentId: string;
  paymentStatus: "completed" | "pending" | "failed" | "refunded";
  
  // === CHECK-IN SYSTEM ===
  checkedIn: boolean;
  checkInTime?: FirestoreTimestamp;
  checkInMethod?: "qr" | "manual" | "bulk";
  checkedInBy?: string;          // Staff user ID
  
  // === INDIVIDUAL ATTENDEE FLAGS ===
  canCheckInIndependently: boolean;
  canTransferTicket: boolean;
  canRefundTicket: boolean;
  
  // === METADATA ===
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  status: "confirmed" | "pending" | "cancelled" | "refunded";
}
```

### **3. Ticket Document Structure** (QR Codes & Verification)

```typescript
// Collection: "tickets"
interface Ticket {
  // === CORE IDENTITY ===
  id: string;                    // Auto-generated
  ticketNumber: string;          // "TKT-ABC123" - Human readable
  
  // === HIERARCHICAL LINKING ===
  eventId: string;
  sessionId: string;
  ticketId: string;              // References session.tickets[].id
  attendeeId: string;            // Links to specific attendee
  
  // === USER DATA ===
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  
  // === BOOKING REFERENCE ===
  bookingId: string;
  
  // === VERIFICATION DATA ===
  qrCode: string;                // Encrypted QR data
  qrData: {
    eventId: string;
    sessionId: string;
    ticketId: string;
    attendeeId: string;
    securityHash: string;        // For verification
  };
  
  // === TICKET STATUS ===
  status: "active" | "used" | "cancelled" | "expired" | "transferred";
  usedAt?: FirestoreTimestamp;
  transferredTo?: string;        // New owner's user ID
  
  // === METADATA ===
  createdAt: FirestoreTimestamp;
  type: "event";
}
```

### **4. Booking Document Structure** (Transaction Records)

```typescript
// Collection: "bookings"
interface Booking {
  // === BOOKING IDENTITY ===
  id: string;                    // Auto-generated
  bookingReference: string;      // "BOOK-XYZ789" - Human readable
  
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
    ticketId: string;            // Session ticket ID
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
  attendeeIds: string[];         // List of generated attendee document IDs
  ticketIds: string[];           // List of generated ticket document IDs
  
  // === METADATA ===
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  status: "confirmed" | "pending" | "cancelled" | "partially_refunded" | "fully_refunded";
}
```

---

## ⚡ **Performance Optimizations**

### **1. Firestore Indexes**

```typescript
// firestore.indexes.json
{
  "indexes": [
    // === EVENT QUERIES ===
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "earliest_date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // === ATTENDEE QUERIES (Critical for Dashboard) ===
    {
      "collectionGroup": "attendees",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "attendees", 
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "attendees",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "checkedIn", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    
    // === TICKET VERIFICATION ===
    {
      "collectionGroup": "tickets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### **2. Denormalization Strategy**

**Why Denormalize:**
- **Dashboard Performance**: No joins needed for session/ticket names
- **Real-time Updates**: Direct queries without traversing relationships
- **Offline Support**: Complete data in each document

**What to Denormalize:**
- Event title in attendee records
- Session names and timing in attendee records  
- Ticket type names in attendee records
- Venue information in attendee records

### **3. Aggregation Strategy**

**Real-time Counters:**
- `sessions[].sold_count` - Updated on booking/cancellation
- `sessions[].available_capacity` - Computed field
- `sessions[].revenue` - Updated on payment completion

**Event-level Aggregates:**
- `total_capacity` - Sum of all session capacities
- `price_range` - Min/max across all sessions
- `earliest_date`/`latest_date` - For filtering

---

## 🔄 **Migration Strategy**

### **Phase 1: Update Event Creation (Immediate)**
```typescript
// New event creation always uses unified structure
const createUnifiedEvent = (isLegacyMode: boolean) => {
  if (isLegacyMode) {
    // Convert simple mode to single session internally
    const session: EventSession = {
      id: "sess_001",
      name: "Main Event",
      date: eventSlots[0].date,
      start_time: eventSlots[0].startTime,
      end_time: eventSlots[0].endTime,
      tickets: tickets.map((ticket, index) => ({
        id: `tick_${String(index + 1).padStart(3, '0')}`,
        name: ticket.name,
        price: parseFloat(ticket.price),
        capacity: parseInt(ticket.capacity),
        available_capacity: parseInt(ticket.capacity),
        sold_count: 0,
        sort_order: index,
        ticket_type: ticket.price === "0" ? "free" : "paid",
        status: "active"
      })),
      max_capacity: tickets.reduce((sum, t) => sum + parseInt(t.capacity), 0),
      available_capacity: tickets.reduce((sum, t) => sum + parseInt(t.capacity), 0),
      sold_count: 0,
      revenue: 0,
      status: "active",
      available: true
    };
    
    return {
      mode: "simple",
      sessions: [session],
      venue_type: "global",
      global_venue: eventVenue
    };
  } else {
    // Session-centric mode
    return {
      mode: "session-centric", 
      sessions: eventSessions.map((session, index) => ({
        id: session.id,
        name: session.name || `Session ${index + 1}`,
        date: session.date,
        start_time: session.startTime,
        end_time: session.endTime,
        venue: session.venue || eventVenue,
        tickets: session.tickets.map((ticket, ticketIndex) => ({
          id: `tick_${String(ticketIndex + 1).padStart(3, '0')}`,
          name: ticket.name,
          price: parseFloat(ticket.price),
          capacity: parseInt(ticket.capacity),
          available_capacity: parseInt(ticket.capacity),
          sold_count: 0,
          sort_order: ticketIndex,
          ticket_type: ticket.price === "0" ? "free" : "paid",
          status: "active"
        })),
        // ... other computed fields
      })),
      venue_type: "per_session"
    };
  }
};
```

### **Phase 2: Update Booking Flow (Week 2)**
```typescript
// Always use sessionId for new bookings
const createBooking = async (eventId: string, sessionId: string, ticketSelections: Array<{ticketId: string, quantity: number}>) => {
  // 1. Create booking document
  const booking = await addDoc(collection(db, "bookings"), {
    eventId,
    sessionId,
    ticketBreakdown: ticketSelections,
    // ... other booking data
  });
  
  // 2. Create individual attendee documents
  const attendeeIds = [];
  for (const selection of ticketSelections) {
    for (let i = 0; i < selection.quantity; i++) {
      const attendee = await addDoc(collection(db, "attendees"), {
        eventId,
        sessionId,
        ticketId: selection.ticketId,
        bookingId: booking.id,
        // ... denormalized data for performance
      });
      attendeeIds.push(attendee.id);
    }
  }
  
  // 3. Create ticket documents for QR codes
  const ticketIds = [];
  for (const attendeeId of attendeeIds) {
    const ticket = await addDoc(collection(db, "tickets"), {
      eventId,
      sessionId,
      attendeeId,
      qrCode: generateQRCode({eventId, sessionId, attendeeId}),
      // ... other ticket data
    });
    ticketIds.push(ticket.id);
  }
  
  // 4. Update booking with generated IDs
  await updateDoc(booking, {
    attendeeIds,
    ticketIds
  });
};
```

### **Phase 3: Update Dashboard Queries (Week 3)**
```typescript
// Simple, fast queries using sessionId
const getDashboardData = async (eventId: string, sessionId?: string) => {
  let attendeesQuery = query(
    collection(db, "attendees"),
    where("eventId", "==", eventId),
    where("status", "==", "confirmed")
  );
  
  // Session filtering is now simple and fast
  if (sessionId) {
    attendeesQuery = query(attendeesQuery, where("sessionId", "==", sessionId));
  }
  
  const attendees = await getDocs(attendeesQuery);
  
  // No complex filtering needed - direct query results
  return {
    attendees: attendees.docs.map(doc => doc.data()),
    totalAttendees: attendees.size,
    checkedInCount: attendees.docs.filter(doc => doc.data().checkedIn).length
  };
};
```

---

## 🎯 **Key Benefits**

### **1. Unified Architecture**
- **Single Code Path**: Same logic handles both simple and session-centric events
- **Consistent Data Model**: All events use session structure internally
- **Easy Migrations**: Convert between modes without data loss

### **2. Performance Optimized**
- **Fast Dashboard Queries**: Direct sessionId filtering, no complex time/date matching
- **Denormalized Data**: Critical information available without joins
- **Proper Indexing**: Optimized for common query patterns

### **3. Scalable Design**
- **Hierarchical IDs**: Clear event → session → ticket → attendee relationships
- **Aggregated Data**: Real-time counters for capacity, revenue, attendance
- **Flexible Venue System**: Global or per-session venues

### **4. Developer Experience**
- **Type Safety**: Complete TypeScript interfaces
- **Clear Relationships**: Obvious data flow and dependencies
- **Consistent APIs**: Same functions work for both event modes

### **5. Future-Proof**
- **Easy Feature Addition**: Clear extension points for new functionality
- **Backward Compatible**: Existing events continue to work
- **Migration Friendly**: Gradual rollout possible

---

## 🛠️ **Implementation Priority**

1. **✅ Phase 1 (Week 1)**: Update event creation to use unified structure
2. **✅ Phase 2 (Week 2)**: Update booking flow to always set sessionId  
3. **✅ Phase 3 (Week 3)**: Simplify dashboard queries using sessionId
4. **📋 Phase 4 (Week 4)**: Add real-time aggregation functions
5. **📋 Phase 5 (Week 5)**: Implement migration script for existing events

This architecture will solve the current session filtering issues and provide a rock-solid foundation for scaling the platform. The unified approach eliminates complexity while maintaining full flexibility for both simple and complex events. 