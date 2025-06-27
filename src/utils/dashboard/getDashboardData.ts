import { query, collection, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ===== FAST DASHBOARD QUERIES =====
// These replace the complex filtering logic with simple, direct queries

export interface DashboardAttendee {
  id: string;
  eventId: string;
  sessionId: string;
  ticketId: string;
  name: string;
  email: string;
  phone: string;
  userId?: string;
  eventTitle: string;
  sessionName: string;
  ticketType: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  venue: string;
  bookingId: string;
  ticketIndex: number;
  totalTicketsInBooking: number;
  individualAmount: number;
  originalBookingAmount: number;
  paymentId: string;
  paymentStatus: "completed" | "pending" | "failed" | "refunded";
  checkedIn: boolean;
  checkInTime?: any;
  checkInMethod?: "qr" | "manual" | "bulk";
  checkedInBy?: string;
  canCheckInIndependently: boolean;
  canTransferTicket: boolean;
  canRefundTicket: boolean;
  createdAt: any;
  updatedAt: any;
  status: "confirmed" | "pending" | "cancelled" | "refunded";
}

export interface DashboardStats {
  totalAttendees: number;
  checkedInCount: number;
  checkedInPercentage: number;
  totalRevenue: number;
  recentCheckIns: DashboardAttendee[];
  attendees: DashboardAttendee[];
}

// ✅ SIMPLE: Get all attendees for an event
export const getEventAttendees = async (eventId: string): Promise<DashboardAttendee[]> => {
  console.log('🔍 Fetching all attendees for event:', eventId);
  
  try {
    const q = query(
      collection(db, "attendees"),
      where("eventId", "==", eventId),
      where("status", "==", "confirmed"),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    const attendees = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as DashboardAttendee));

    console.log(`✅ Found ${attendees.length} attendees for event`);
    return attendees;
  } catch (error) {
    console.error('❌ Error fetching event attendees:', error);
    return [];
  }
};

// ✅ SIMPLE: Get attendees for specific session (FAST!)
export const getSessionAttendees = async (eventId: string, sessionId: string): Promise<DashboardAttendee[]> => {
  console.log('🎯 Fetching attendees for session:', { eventId, sessionId });
  
  try {
    const q = query(
      collection(db, "attendees"),
      where("eventId", "==", eventId),
      where("sessionId", "==", sessionId), // 🚀 Direct sessionId filtering!
      where("status", "==", "confirmed"),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    const attendees = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as DashboardAttendee));

    console.log(`✅ Found ${attendees.length} attendees for session ${sessionId}`);
    return attendees;
  } catch (error) {
    console.error('❌ Error fetching session attendees:', error);
    
    // Fallback: Get all event attendees and filter (for legacy data)
    console.log('⚠️ Falling back to client-side filtering...');
    const allAttendees = await getEventAttendees(eventId);
    const filteredAttendees = allAttendees.filter(a => a.sessionId === sessionId);
    console.log(`📊 Fallback filtering found ${filteredAttendees.length} attendees`);
    return filteredAttendees;
  }
};

// ✅ SIMPLE: Get dashboard statistics
export const getDashboardStats = async (eventId: string, sessionId?: string): Promise<DashboardStats> => {
  console.log('📊 Calculating dashboard stats...', { eventId, sessionId });
  
  try {
    // Get attendees based on filter
    const attendees = sessionId 
      ? await getSessionAttendees(eventId, sessionId)
      : await getEventAttendees(eventId);

    // Calculate stats
    const checkedInCount = attendees.filter(a => a.checkedIn).length;
    const totalRevenue = attendees.reduce((sum, a) => sum + (a.individualAmount || 0), 0);
    
    // Get recent check-ins (last 10)
    const recentCheckIns = attendees
      .filter(a => a.checkedIn && a.checkInTime)
      .sort((a, b) => {
        const aTime = a.checkInTime?.toMillis ? a.checkInTime.toMillis() : 0;
        const bTime = b.checkInTime?.toMillis ? b.checkInTime.toMillis() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    const stats = {
      totalAttendees: attendees.length,
      checkedInCount,
      checkedInPercentage: attendees.length > 0 ? (checkedInCount / attendees.length) * 100 : 0,
      totalRevenue,
      recentCheckIns,
      attendees
    };

    console.log('✅ Dashboard stats calculated:', {
      totalAttendees: stats.totalAttendees,
      checkedInCount: stats.checkedInCount,
      totalRevenue: stats.totalRevenue,
      sessionFiltered: !!sessionId
    });

    return stats;
  } catch (error) {
    console.error('❌ Error calculating dashboard stats:', error);
    return {
      totalAttendees: 0,
      checkedInCount: 0,
      checkedInPercentage: 0,
      totalRevenue: 0,
      recentCheckIns: [],
      attendees: []
    };
  }
};

// ✅ SIMPLE: Get recent check-ins for dashboard
export const getRecentCheckIns = async (eventId: string, sessionId?: string, limitCount = 10): Promise<DashboardAttendee[]> => {
  console.log('🕒 Fetching recent check-ins...', { eventId, sessionId, limitCount });
  
  try {
    let q = query(
      collection(db, "attendees"),
      where("eventId", "==", eventId),
      where("checkedIn", "==", true),
      orderBy("checkInTime", "desc"),
      limit(limitCount)
    );

    // Add session filter if provided
    if (sessionId) {
      q = query(
        collection(db, "attendees"),
        where("eventId", "==", eventId),
        where("sessionId", "==", sessionId),
        where("checkedIn", "==", true),
        orderBy("checkInTime", "desc"),
        limit(limitCount)
      );
    }
    
    const snapshot = await getDocs(q);
    const checkIns = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as DashboardAttendee));

    console.log(`✅ Found ${checkIns.length} recent check-ins`);
    return checkIns;
  } catch (error) {
    console.error('❌ Error fetching recent check-ins:', error);
    return [];
  }
};

// ✅ SIMPLE: No more complex filtering logic needed!
export const getFilteredDashboardData = (
  eventData: any, 
  selectedSessionId: string | null
) => {
  console.log('🔄 Filtering dashboard data...', { 
    eventTitle: eventData?.title, 
    selectedSessionId,
    hasSessions: !!eventData?.sessions 
  });

  if (!eventData) {
    return {
      sessions: [],
      totalCapacity: 0,
      totalSold: 0,
      totalRevenue: 0,
      availableCapacity: 0
    };
  }

  // Sessions are always available in unified format
  const sessions = eventData.sessions || [];
  
  // If specific session selected, filter to that session
  const activeSessions = selectedSessionId 
    ? sessions.filter((s: any) => s.id === selectedSessionId)
    : sessions;
  
  // Calculate aggregates
  const totalCapacity = activeSessions.reduce((sum: number, s: any) => sum + (s.max_capacity || 0), 0);
  const totalSold = activeSessions.reduce((sum: number, s: any) => sum + (s.sold_count || 0), 0);
  const totalRevenue = activeSessions.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
  
  const result = {
    sessions: activeSessions,
    totalCapacity,
    totalSold,
    totalRevenue,
    availableCapacity: totalCapacity - totalSold
  };

  console.log('✅ Dashboard data filtered:', {
    sessionsCount: result.sessions.length,
    totalCapacity: result.totalCapacity,
    totalSold: result.totalSold,
    isFiltered: !!selectedSessionId
  });

  return result;
};

// ✅ PERFORMANCE: Measure query performance
export const measureQueryTime = async <T>(
  queryPromise: Promise<T>, 
  queryName: string
): Promise<T> => {
  const start = performance.now();
  const result = await queryPromise;
  const duration = performance.now() - start;
  
  console.log(`⚡ ${queryName}: ${duration.toFixed(2)}ms`);
  
  // Send to analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'firestore_query', {
      event_category: 'performance',
      event_label: queryName,
      value: Math.round(duration)
    });
  }
  
  return result;
};

// ✅ LEGACY SUPPORT: Convert old event format to sessions (for backward compatibility)
export const getSessionsFromEvent = (eventData: any) => {
  console.log('🔄 Converting event to sessions format...', {
    architecture: eventData?.architecture,
    hasSessions: !!eventData?.sessions,
    hasTimeSlots: !!eventData?.time_slots
  });

  if (!eventData) return [];
  
  // New unified events already have sessions
  if (eventData.sessions && Array.isArray(eventData.sessions)) {
    console.log('✅ Using existing sessions array');
    return eventData.sessions;
  }
  
  // Legacy events: convert time_slots to sessions format
  if (eventData.time_slots && Array.isArray(eventData.time_slots)) {
    console.log('🔄 Converting legacy time_slots to sessions...');
    return eventData.time_slots.map((slot: any, index: number) => ({
      id: slot.session_id || `legacy-slot-${index}`,
      name: `Session ${index + 1}`,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      venue: eventData.event_venue || eventData.global_venue || '',
      tickets: eventData.tickets || [],
      max_capacity: eventData.tickets?.reduce((sum: number, t: any) => sum + (t.capacity || 0), 0) || 0,
      available_capacity: eventData.tickets?.reduce((sum: number, t: any) => sum + (t.available_capacity || 0), 0) || 0,
      sold_count: 0,
      revenue: 0,
      status: "active",
      available: slot.available !== false
    }));
  }
  
  console.log('⚠️ No sessions or time_slots found, returning empty array');
  return [];
}; 