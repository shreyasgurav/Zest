import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { app } from '@/infrastructure/firebase';
import { adminDb } from '@/infrastructure/firebase/firebase-admin';
import { validateTicketComprehensive, markTicketAsUsed } from '@/domains/tickets/services/ticketValidator';

const db = getFirestore(app());

export async function POST(request: NextRequest) {
  try {
    const { ticketNumber, scannerId, scannerType, eventId, scannerLocation } = await request.json();

    if (!ticketNumber || !scannerId || !scannerType || !eventId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Use comprehensive ticket validation
    const validationResult = await validateTicketComprehensive(
      ticketNumber, 
      scannerLocation || 'venue_entrance',
      scannerId
    );

    // Check if ticket is not valid
    if (!validationResult.isValid) {
      const statusCode = validationResult.code === 'TICKET_NOT_FOUND' ? 404 :
                        validationResult.code === 'ALREADY_USED' ? 409 :
                        validationResult.code === 'TICKET_EXPIRED' ? 410 :
                        validationResult.code === 'TICKET_CANCELLED' ? 403 : 400;

      return NextResponse.json({
        success: false,
        error: validationResult.message,
        code: validationResult.code,
        status: validationResult.status,
        securityFlags: validationResult.securityFlags,
        usedAt: validationResult.ticket?.usedAt,
        usedBy: validationResult.ticket?.usedBy,
        expiredAt: validationResult.ticket?.expiredAt,
        expiredReason: validationResult.ticket?.expiredReason
      }, { status: statusCode });
    }

    const ticketData = validationResult.ticket;

    // Verify ticket belongs to the event/activity
    if (ticketData.eventId !== eventId && ticketData.activityId !== eventId) {
      return NextResponse.json({
        success: false,
        error: 'Ticket does not belong to this event',
        code: 'WRONG_EVENT'
      }, { status: 403 });
    }

    // Verify scanner has permission to scan for this event
    let hasPermission = false;
    
    if (scannerType === 'organization') {
      // Check if scanner owns the event/activity
      const eventRef = doc(db, ticketData.type === 'event' ? 'events' : 'activities', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        hasPermission = eventData.createdBy === scannerId || eventData.organizationId === scannerId;
      }
    } else if (scannerType === 'user') {
      // Check if user is authorized staff for this event
      const eventRef = doc(db, ticketData.type === 'event' ? 'events' : 'activities', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        hasPermission = eventData.authorizedStaff?.includes(scannerId) || eventData.createdBy === scannerId;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to scan tickets for this event',
        code: 'UNAUTHORIZED'
      }, { status: 403 });
    }

    // Add fraud prevention for group bookings
    if (ticketData?.originalBookingData?.bookingReference) {
      // Check how many tickets from this booking have already been used
      const groupBookingRef = ticketData.originalBookingData.bookingReference;
      const totalTicketsInBooking = ticketData.totalTicketsInBooking || 1;
      
      // Query all attendees from the same booking
      const sameBookingQuery = adminDb
        .collection('eventAttendees')
        .where('originalBookingData.bookingReference', '==', groupBookingRef)
        .where('checkedIn', '==', true);
        
      const checkedInFromSameBooking = await sameBookingQuery.get();
      
      // Prevent check-in if this person has already checked in with another ticket from the same booking
      const userAlreadyCheckedIn = checkedInFromSameBooking.docs.some(doc => {
        const data = doc.data();
        return data.email === ticketData.email && data.userId === ticketData.userId;
      });
      
      if (userAlreadyCheckedIn) {
        console.warn('Attempted duplicate check-in for same user from group booking:', {
          userId: ticketData.userId,
          email: ticketData.email,
          bookingReference: groupBookingRef,
          ticketNumber: ticketData.ticketNumber
        });
        
        return NextResponse.json({
          success: false,
          message: 'You have already checked in with another ticket from this booking',
          details: 'Each person can only check in once per event, even with multiple tickets'
        }, { status: 400 });
      }
      
      // Additional validation: Check if too many tickets from this booking have been used
      if (checkedInFromSameBooking.size >= totalTicketsInBooking) {
        console.warn('All tickets from this booking have already been used:', {
          bookingReference: groupBookingRef,
          totalTickets: totalTicketsInBooking,
          checkedIn: checkedInFromSameBooking.size
        });
        
        return NextResponse.json({
          success: false,
          message: 'All tickets from this booking have already been used',
          details: 'No more check-ins available for this booking'
        }, { status: 400 });
      }
    }

    // Mark ticket as used using our comprehensive system
    const markUsedSuccess = await markTicketAsUsed(
      ticketNumber, 
      scannerId, 
      scannerLocation || 'venue_entrance'
    );

    if (!markUsedSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to mark ticket as used. Please try again.',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Log the entry
    try {
      await addDoc(collection(db, 'entry_logs'), {
        ticketId: ticketData.id,
        ticketNumber: ticketNumber,
        eventId: eventId,
        eventType: ticketData.type,
        scannerId: scannerId,
        scannerType: scannerType,
        timestamp: now,
        attendeeName: ticketData.userName,
        attendeeId: ticketData.userId,
        scannerLocation: scannerLocation || 'venue_entrance',
        securityFlags: validationResult.securityFlags || []
      });
    } catch (logError) {
      console.error('Error logging entry:', logError);
      // Don't fail the entire operation for logging errors
    }

    // Return success with ticket details
    return NextResponse.json({
      success: true,
      message: 'Entry approved',
      ticket: {
        id: ticketData.id,
        ticketNumber: ticketData.ticketNumber,
        userName: ticketData.userName,
        eventTitle: ticketData.title,
        ticketType: ticketData.ticketType || 'General',
        amount: ticketData.amount,
        selectedDate: ticketData.selectedDate,
        selectedTimeSlot: ticketData.selectedTimeSlot,
        entryTime: now
      },
      securityFlags: validationResult.securityFlags,
      validationDetails: {
        status: validationResult.status,
        message: validationResult.message,
        eventDetails: validationResult.eventDetails?.title || 'Unknown Event'
      }
    });

  } catch (error) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 