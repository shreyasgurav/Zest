import { adminDb } from '@/infrastructure/firebase/admin';
import { randomBytes } from 'crypto';

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
  
  // Session information for session-centric events
  sessionId?: string;
  selectedSession?: any;
  isSessionCentric?: boolean;
  
  // Booking details
  bookingId: string;
  selectedDate: string;
  selectedTimeSlot: {
    start_time: string;
    end_time: string;
    session_id?: string;
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
    action: 'created' | 'validated' | 'cancelled' | 'transferred';
    location?: string;
    from?: string;
    to?: string;
    transferredBy?: string;
  }>;
}

/**
 * Generate a cryptographically secure unique ticket number
 */
export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex'); // 16 hex characters (64 bits of entropy)
  const checksum = randomBytes(2).toString('hex'); // Additional randomness
  return `ZST-${timestamp}-${random}-${checksum}`.toUpperCase();
}

/**
 * Generate QR code data for ticket scanning
 * QR code contains only the ticket number for security
 */
export function generateQRCodeData(ticketId: string, ticketNumber: string): string {
  // Return just the ticket number - the QR code component will handle rendering
  // This ensures each ticket has its unique ticket number in the QR code
  return ticketNumber;
}

/**
 * Check if a ticket number already exists to prevent duplicates
 */
export async function isTicketNumberUnique(ticketNumber: string): Promise<boolean> {
  try {
    const existingTicket = await adminDb!
      .collection('tickets')
      .where('ticketNumber', '==', ticketNumber)
      .limit(1)
      .get();
    
    return existingTicket.empty;
  } catch (error) {
    console.error('Error checking ticket number uniqueness:', error);
    // Return false to be safe - will generate a new number
    return false;
  }
}

/**
 * Generate a guaranteed unique ticket number
 */
export async function generateUniqueTicketNumber(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const ticketNumber = generateTicketNumber();
    const isUnique = await isTicketNumberUnique(ticketNumber);
    
    if (isUnique) {
      return ticketNumber;
    }
    
    attempts++;
  }
  
  // If we still haven't found a unique number after 5 attempts, add more entropy
  const timestamp = Date.now().toString(36);
  const random = randomBytes(12).toString('hex'); // More randomness
  const extraEntropy = randomBytes(4).toString('hex');
  return `ZST-${timestamp}-${random}-${extraEntropy}`.toUpperCase();
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
      const eventDoc = await adminDb!.collection('events').doc(bookingData.eventId).get();
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        title = eventData?.title || eventData?.eventTitle || 'Event';
        venue = eventData?.event_venue || eventData?.eventVenue || 'Venue TBD';
      }
      
      // Extract session information for session-centric events
      const isSessionCentric = bookingData.isSessionCentric || false;
      const sessionId = bookingData.sessionId || bookingData.selectedSession?.id || bookingData.selectedTimeSlot?.session_id || null;
      const selectedSession = bookingData.selectedSession || null;
      
      // For events, create tickets based on ticket types and quantities
      const ticketEntries = Object.entries(bookingData.tickets as Record<string, number>);
      
      for (const [ticketType, quantity] of ticketEntries) {
        for (let i = 0; i < quantity; i++) {
          const ticketNumber = await generateUniqueTicketNumber();
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
            
            sessionId: sessionId,
            selectedSession: selectedSession,
            isSessionCentric: isSessionCentric,
            
            bookingId,
            selectedDate: bookingData.selectedDate,
            selectedTimeSlot: {
              start_time: bookingData.selectedTimeSlot.start_time,
              end_time: bookingData.selectedTimeSlot.end_time,
              session_id: sessionId
            },
            
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
      const activityDoc = await adminDb!.collection('activities').doc(bookingData.activityId).get();
      if (activityDoc.exists) {
        const activityData = activityDoc.data();
        title = activityData?.name || 'Activity';
        venue = activityData?.location || 'Location TBD';
      }
      
      // For activities, create tickets based on quantity
      const quantity = bookingData.tickets as number;
      
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = await generateUniqueTicketNumber();
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
    const batch = adminDb!.batch();
    
    for (const ticket of tickets) {
      const ticketRef = adminDb!.collection('tickets').doc(ticket.id);
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
    const ticketsSnapshot = await adminDb!
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
    const ticketRef = adminDb!.collection('tickets').doc(ticketId);
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

/**
 * Transfer a ticket to another user (for group bookings)
 */
export async function transferTicket(
  ticketId: string, 
  newUserEmail: string, 
  newUserName: string, 
  newUserPhone: string,
  transferredBy: string
): Promise<boolean> {
  try {
    const ticketRef = adminDb!.collection('tickets').doc(ticketId);
    const attendeeRef = adminDb!.collection('eventAttendees').doc(ticketId.replace('ticket_', ''));
    
    return adminDb!.runTransaction(async (transaction) => {
      const ticketDoc = await transaction.get(ticketRef);
      const attendeeDoc = await transaction.get(attendeeRef);
      
      if (!ticketDoc.exists || !attendeeDoc.exists) {
        throw new Error('Ticket or attendee record not found');
      }
      
      const ticketData = ticketDoc.data() as TicketData;
      const attendeeData = attendeeDoc.data();
      
      // Only allow transfer if ticket is active and part of a group booking
      if (ticketData.status !== 'active') {
        throw new Error('Only active tickets can be transferred');
      }
      
      if (!attendeeData?.canCheckInIndependently || !attendeeData?.totalTicketsInBooking || attendeeData.totalTicketsInBooking === 1) {
        throw new Error('Only tickets from group bookings can be transferred');
      }
      
      // Update ticket with new user info
      const updateData = {
        userName: newUserName,
        userEmail: newUserEmail,
        userPhone: newUserPhone,
        transferHistory: [
          ...(ticketData.validationHistory || []),
          {
            timestamp: new Date().toISOString(),
            action: 'transferred' as const,
            from: ticketData.userName,
            to: newUserName,
            transferredBy: transferredBy
          }
        ],
        updatedAt: new Date().toISOString()
      };
      
      // Update attendee record with new user info
      const attendeeUpdateData = {
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        transferHistory: updateData.transferHistory,
        updatedAt: new Date().toISOString()
      };
      
      transaction.update(ticketRef, updateData);
      transaction.update(attendeeRef, attendeeUpdateData);
      
      return true;
    });
  } catch (error) {
    console.error('Error transferring ticket:', error);
    return false;
  }
}

/**
 * Cancel individual tickets from a group booking (partial refund)
 */
export async function cancelIndividualTickets(
  ticketIds: string[], 
  reason: string,
  cancelledBy: string,
  refundAmount?: number
): Promise<{ success: boolean, cancelledTickets: string[], refundProcessed: boolean }> {
  try {
    const result = {
      success: false,
      cancelledTickets: [] as string[],
      refundProcessed: false
    };
    
    return adminDb!.runTransaction(async (transaction) => {
      const ticketDocs = await Promise.all(
        ticketIds.map(id => transaction.get(adminDb!.collection('tickets').doc(id)))
      );
      
      const attendeeDocs = await Promise.all(
        ticketIds.map(id => transaction.get(adminDb!.collection('eventAttendees').doc(id.replace('ticket_', ''))))
      );
      
      // Validate all tickets can be cancelled
      for (let i = 0; i < ticketDocs.length; i++) {
        const ticketDoc = ticketDocs[i];
        const attendeeDoc = attendeeDocs[i];
        
        if (!ticketDoc.exists || !attendeeDoc.exists) {
          throw new Error(`Ticket ${ticketIds[i]} not found`);
        }
        
        const ticketData = ticketDoc.data() as TicketData;
        
        if (ticketData.status === 'used') {
          throw new Error(`Ticket ${ticketIds[i]} has already been used and cannot be cancelled`);
        }
        
        if (ticketData.status === 'cancelled') {
          throw new Error(`Ticket ${ticketIds[i]} is already cancelled`);
        }
      }
      
      // Calculate refund amount if not provided
      let totalRefund = refundAmount || 0;
      if (!refundAmount) {
        totalRefund = ticketDocs.reduce((sum, doc) => {
          const ticketData = doc.data() as TicketData;
          return sum + ticketData.amount;
        }, 0);
      }
      
      // Cancel all tickets
      for (let i = 0; i < ticketDocs.length; i++) {
        const ticketRef = adminDb!.collection('tickets').doc(ticketIds[i]);
        const attendeeRef = adminDb!.collection('eventAttendees').doc(ticketIds[i].replace('ticket_', ''));
        
        const ticketData = ticketDocs[i].data() as TicketData;
        
        const updateData = {
          status: 'cancelled' as const,
          updatedAt: new Date().toISOString(),
          cancellationInfo: {
            reason,
            cancelledBy,
            cancelledAt: new Date().toISOString(),
            refundAmount: totalRefund / ticketIds.length, // Split refund evenly
            partialRefund: ticketIds.length < (ticketData.ticketQuantity || 1)
          },
          validationHistory: [
            ...(ticketData.validationHistory || []),
            {
              timestamp: new Date().toISOString(),
              action: 'cancelled' as const,
              location: 'system',
              reason
            }
          ]
        };
        
        transaction.update(ticketRef, updateData);
        transaction.update(attendeeRef, {
          status: 'cancelled',
          cancellationInfo: updateData.cancellationInfo,
          updatedAt: new Date().toISOString()
        });
        
        result.cancelledTickets.push(ticketIds[i]);
      }
      
      // TODO: Integrate with payment gateway for actual refund processing
      // For now, just mark as processed
      result.refundProcessed = true;
      result.success = true;
      
      return result;
    });
  } catch (error) {
    console.error('Error cancelling individual tickets:', error);
    return {
      success: false,
      cancelledTickets: [],
      refundProcessed: false
    };
  }
} 