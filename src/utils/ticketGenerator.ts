import { adminDb } from '@/lib/firebase-admin';

export interface TicketData {
  id: string;
  ticketNumber: string;
  qrCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  
  // Event or Activity details
  type: 'event' | 'activity';
  eventId?: string;
  activityId?: string;
  title: string;
  venue: string;
  
  // Booking details
  bookingId: string;
  selectedDate: string;
  selectedTimeSlot: {
    start_time: string;
    end_time: string;
  };
  
  // For events - ticket type and quantity
  ticketType?: string;
  ticketQuantity?: number;
  
  // For activities - just quantity
  quantity?: number;
  
  // Payment info
  amount: number;
  paymentId: string;
  paymentStatus: string;
  
  // Status and timestamps
  status: 'active' | 'used' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  
  // Validation
  isValid: boolean;
  usedAt?: string;
  validationHistory?: Array<{
    timestamp: string;
    action: 'created' | 'validated' | 'cancelled';
    location?: string;
  }>;
}

/**
 * Generate a unique ticket number
 */
export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ZST-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate QR code data string for ticket
 */
export function generateQRCodeData(ticketId: string, ticketNumber: string): string {
  return JSON.stringify({
    ticketId,
    ticketNumber,
    platform: 'zest',
    timestamp: Date.now(),
    version: '1.0'
  });
}

/**
 * Create individual tickets based on booking data
 */
export async function createTicketsForBooking(
  bookingData: any, 
  bookingId: string, 
  bookingType: 'event' | 'activity'
): Promise<string[]> {
  try {
    console.log('Creating tickets for booking:', bookingId, 'Type:', bookingType);
    
    const tickets: TicketData[] = [];
    const ticketIds: string[] = [];
    
    // Get event/activity details
    let title = '';
    let venue = '';
    
    if (bookingType === 'event') {
      const eventDoc = await adminDb.collection('events').doc(bookingData.eventId).get();
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        title = eventData?.title || eventData?.eventTitle || 'Event';
        venue = eventData?.event_venue || eventData?.eventVenue || 'Venue TBD';
      }
      
      // For events, create tickets based on ticket types and quantities
      const ticketEntries = Object.entries(bookingData.tickets as Record<string, number>);
      
      for (const [ticketType, quantity] of ticketEntries) {
        for (let i = 0; i < quantity; i++) {
          const ticketNumber = generateTicketNumber();
          const ticketId = `ticket_${bookingId}_${ticketType}_${i + 1}`;
          const qrCode = generateQRCodeData(ticketId, ticketNumber);
          
          const ticket: TicketData = {
            id: ticketId,
            ticketNumber,
            qrCode,
            userId: bookingData.userId,
            userName: bookingData.name,
            userEmail: bookingData.email,
            userPhone: bookingData.phone,
            
            type: 'event',
            eventId: bookingData.eventId,
            title,
            venue,
            
            bookingId,
            selectedDate: bookingData.selectedDate,
            selectedTimeSlot: bookingData.selectedTimeSlot,
            
            ticketType,
            ticketQuantity: 1, // Each ticket represents 1 person
            
            amount: bookingData.totalAmount / ticketEntries.reduce((total, [, qty]) => total + qty, 0),
            paymentId: bookingData.paymentId,
            paymentStatus: bookingData.paymentStatus,
            
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            isValid: true,
            validationHistory: [{
              timestamp: new Date().toISOString(),
              action: 'created'
            }]
          };
          
          tickets.push(ticket);
        }
      }
    } else if (bookingType === 'activity') {
      const activityDoc = await adminDb.collection('activities').doc(bookingData.activityId).get();
      if (activityDoc.exists) {
        const activityData = activityDoc.data();
        title = activityData?.name || 'Activity';
        venue = activityData?.location || 'Location TBD';
      }
      
      // For activities, create tickets based on quantity
      const quantity = bookingData.tickets as number;
      
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = generateTicketNumber();
        const ticketId = `ticket_${bookingId}_${i + 1}`;
        const qrCode = generateQRCodeData(ticketId, ticketNumber);
        
        const ticket: TicketData = {
          id: ticketId,
          ticketNumber,
          qrCode,
          userId: bookingData.userId,
          userName: bookingData.name,
          userEmail: bookingData.email,
          userPhone: bookingData.phone,
          
          type: 'activity',
          activityId: bookingData.activityId,
          title,
          venue,
          
          bookingId,
          selectedDate: bookingData.selectedDate,
          selectedTimeSlot: bookingData.selectedTimeSlot,
          
          quantity: 1, // Each ticket represents 1 person
          
          amount: bookingData.totalAmount / quantity,
          paymentId: bookingData.paymentId,
          paymentStatus: bookingData.paymentStatus,
          
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          
          isValid: true,
          validationHistory: [{
            timestamp: new Date().toISOString(),
            action: 'created'
          }]
        };
        
        tickets.push(ticket);
      }
    }
    
    // Save all tickets to Firebase
    const batch = adminDb.batch();
    
    for (const ticket of tickets) {
      const ticketRef = adminDb.collection('tickets').doc(ticket.id);
      batch.set(ticketRef, ticket);
      ticketIds.push(ticket.id);
    }
    
    await batch.commit();
    console.log(`Successfully created ${tickets.length} tickets for booking ${bookingId}`);
    
    return ticketIds;
  } catch (error) {
    console.error('Error creating tickets:', error);
    throw new Error('Failed to create tickets');
  }
}

/**
 * Get user's tickets
 */
export async function getUserTickets(userId: string): Promise<TicketData[]> {
  try {
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return ticketsSnapshot.docs.map(doc => doc.data() as TicketData);
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    throw new Error('Failed to fetch tickets');
  }
}

/**
 * Validate a ticket
 */
export async function validateTicket(ticketId: string, location?: string): Promise<boolean> {
  try {
    const ticketRef = adminDb.collection('tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();
    
    if (!ticketDoc.exists) {
      return false;
    }
    
    const ticket = ticketDoc.data() as TicketData;
    
    if (ticket.status !== 'active' || !ticket.isValid) {
      return false;
    }
    
    // Update ticket as used
    const updateData = {
      status: 'used',
      usedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      validationHistory: [
        ...(ticket.validationHistory || []),
        {
          timestamp: new Date().toISOString(),
          action: 'validated' as const,
          location: location || 'Unknown'
        }
      ]
    };
    
    await ticketRef.update(updateData);
    return true;
  } catch (error) {
    console.error('Error validating ticket:', error);
    return false;
  }
} 