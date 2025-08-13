import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/infrastructure/firebase/firebase-admin';
import { getUserByPhone } from '@/domains/authentication/services/auth.service';
import { generateUniqueTicketNumber, generateQRCodeData } from '@/domains/tickets/services/ticketGenerator';
import { DashboardSecurity } from '@/shared/utils/security/dashboardSecurity';

interface ManualAttendeeRequest {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  quantity: number;
  hostUserId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ManualAttendeeRequest = await request.json();
    const { eventId, name, email, phone, ticketType, quantity = 1, hostUserId } = body;

    console.log('Manual attendee request data:', { 
      eventId, 
      name, 
      email, 
      phone, 
      ticketType, 
      quantity, 
      hostUserId 
    });

    // Validate required fields
    if (!eventId || !name || !email || !phone || !ticketType || !hostUserId) {
      console.log('Missing required fields:', {
        eventId: !!eventId,
        name: !!name,
        email: !!email,
        phone: !!phone,
        ticketType: !!ticketType,
        hostUserId: !!hostUserId
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate quantity
    if (!quantity || quantity < 1 || quantity > 50) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Get event details first for debugging
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventData = eventDoc.data();
    
    // Debug logging for authorization issue
    console.log('Authorization Debug:', {
      eventId,
      hostUserId,
      eventOrganizationId: eventData?.organizationId,
      eventCreator: eventData?.creator,
      organizationIdMatch: eventData?.organizationId === hostUserId,
      creatorUserIdMatch: eventData?.creator?.userId === hostUserId
    });

    // Verify host has permission to add attendees to this event
    let hasPermission = false;
    let authMethod = '';
    
    try {
      const permissions = await DashboardSecurity.verifyDashboardAccess(eventId, hostUserId);
      console.log('Dashboard permissions:', permissions);
      hasPermission = permissions.canManageAttendees;
      authMethod = 'dashboard_security';
    } catch (error) {
      console.log('Primary auth check failed:', error);
    }

    // Fallback authorization checks if primary fails
    if (!hasPermission) {
      // Check if user is the organization owner
      if (eventData?.organizationId === hostUserId) {
        hasPermission = true;
        authMethod = 'organization_owner';
      }
      
      // Check if user is the event creator
      if (!hasPermission && eventData?.creator?.userId === hostUserId) {
        hasPermission = true;
        authMethod = 'event_creator';
      }
      
      // Check if user created this event (alternative field structure)
      if (!hasPermission && eventData?.createdBy === hostUserId) {
        hasPermission = true;
        authMethod = 'created_by';
      }

      console.log('Fallback authorization:', { hasPermission, authMethod });
    }

    if (!hasPermission) {
      return NextResponse.json(
        { 
          error: 'Unauthorized: You do not have permission to add attendees to this event',
          debug: {
            eventOrganizationId: eventData?.organizationId,
            eventCreator: eventData?.creator,
            eventCreatedBy: eventData?.createdBy,
            hostUserId,
            availableEventFields: Object.keys(eventData || {}),
            authAttempted: ['dashboard_security', 'organization_owner', 'event_creator', 'created_by']
          }
        },
        { status: 403 }
      );
    }

    console.log(`Authorization successful via: ${authMethod}`);

    const title = eventData?.title || eventData?.eventTitle || 'Event';
    const venue = eventData?.event_venue || eventData?.eventVenue || 'Venue TBD';

    // Check if ticket type exists and has capacity
    const ticketInfo = eventData?.tickets?.find((t: any) => t.name === ticketType);
    if (!ticketInfo) {
      return NextResponse.json(
        { error: `Ticket type "${ticketType}" not found for this event` },
        { status: 400 }
      );
    }

    // Check current sold tickets for this type
    const attendeesSnapshot = await adminDb
      .collection('eventAttendees')
      .where('eventId', '==', eventId)
      .get();

    const soldCount = attendeesSnapshot.docs.reduce((count, doc) => {
      const attendee = doc.data();
      if (attendee.canCheckInIndependently && attendee.ticketType === ticketType) {
        return count + 1;
      }
      if (typeof attendee.tickets === 'object' && attendee.tickets[ticketType]) {
        return count + attendee.tickets[ticketType];
      }
      return count;
    }, 0);

    if (soldCount + quantity > ticketInfo.capacity) {
      return NextResponse.json(
        { error: `Not enough capacity for ${quantity} tickets. Available: ${ticketInfo.capacity - soldCount}` },
        { status: 400 }
      );
    }

    // Check if user account exists with this phone number
    const existingUser = await getUserByPhone(phone);
    let attendeeUserId = null;

    if (existingUser) {
      attendeeUserId = existingUser.uid;
      console.log(`Found existing user account for phone ${phone}: ${attendeeUserId}`);
    } else {
      console.log(`No existing user account found for phone ${phone}. Tickets will be associated with phone number.`);
    }

    const currentTime = new Date().toISOString();
    const baseId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Arrays to store created records
    const attendeeIds: string[] = [];
    const ticketIds: string[] = [];
    const attendeeDataArray: any[] = [];
    const ticketDataArray: any[] = [];

    // Create multiple attendee and ticket records based on quantity
    for (let i = 0; i < quantity; i++) {
      const attendeeId = `${baseId}_attendee_${i + 1}`;
      const ticketId = `${baseId}_ticket_${i + 1}`;
      const ticketNumber = await generateUniqueTicketNumber();
      const qrCode = generateQRCodeData(ticketId, ticketNumber);

      // Create attendee record
      const attendeeData = {
        id: attendeeId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        userId: attendeeUserId, // Will be null if no account exists
        eventId,
        
        // Ticket information
        tickets: { [ticketType]: 1 },
        ticketType,
        ticketIndex: i + 1,
        totalTicketsInBooking: quantity,
        individualAmount: ticketInfo.price,
        
        // Manual addition metadata
        addedManually: true,
        addedBy: hostUserId,
        addedAt: currentTime,
        paymentStatus: 'manual_entry', // Special status for manual entries
        status: 'confirmed',
        
        // Check-in info
        checkedIn: false,
        checkInTime: null,
        checkInMethod: null,
        checkedInBy: null,
        canCheckInIndependently: true,
        
        // Phone association for future account linking
        phoneForFutureLink: attendeeUserId ? null : phone, // Only set if no account exists
        
        // Standard booking fields
        selectedDate: eventData?.event_date || currentTime.split('T')[0],
        selectedTimeSlot: {
          start_time: eventData?.start_time || '00:00',
          end_time: eventData?.end_time || '23:59'
        },
        
        createdAt: currentTime,
        updatedAt: currentTime,
        attendeeId
      };

      // Create ticket record
      const ticketData = {
        id: ticketId,
        ticketNumber,
        qrCode,
        userId: attendeeUserId, // Will be null if no account exists
        userName: name.trim(),
        userEmail: email.toLowerCase().trim(),
        userPhone: phone.trim(),
        
        type: 'event' as const,
        eventId,
        title,
        venue,
        
        bookingId: attendeeId,
        selectedDate: attendeeData.selectedDate,
        selectedTimeSlot: attendeeData.selectedTimeSlot,
        
        ticketType,
        ticketQuantity: 1,
        
        amount: ticketInfo.price,
        paymentId: `manual_${baseId}`,
        paymentStatus: 'manual_entry',
        
        status: 'active' as const,
        createdAt: currentTime,
        updatedAt: currentTime,
        
        isValid: true,
        addedManually: true,
        addedBy: hostUserId,
        phoneForFutureLink: attendeeUserId ? null : phone, // For future account linking
        
        validationHistory: [{
          timestamp: currentTime,
          action: 'created' as const,
          location: 'manual_entry',
          addedBy: hostUserId
        }]
      };

      attendeeDataArray.push(attendeeData);
      ticketDataArray.push(ticketData);
      attendeeIds.push(attendeeId);
      ticketIds.push(ticketId);
    }

    // Use transaction to ensure data consistency for all records
    await adminDb.runTransaction(async (transaction) => {
      // Create all attendee records
      for (const attendeeData of attendeeDataArray) {
        const attendeeRef = adminDb.collection('eventAttendees').doc(attendeeData.id);
        transaction.set(attendeeRef, attendeeData);
      }

      // Create all ticket records
      for (const ticketData of ticketDataArray) {
        const ticketRef = adminDb.collection('tickets').doc(ticketData.id);
        transaction.set(ticketRef, ticketData);
      }

      // If user has account, add all tickets to their profile's linked tickets
      if (attendeeUserId) {
        const userRef = adminDb.collection('Users').doc(attendeeUserId);
        
        // Get current user data to update linked tickets
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const userData = userDoc.data();
          const existingLinkedTickets = userData?.linkedTickets || [];
          
          transaction.update(userRef, {
            linkedTickets: [...existingLinkedTickets, ...ticketIds],
            updatedAt: currentTime
          });
        }
      }
    });

    console.log(`Manual attendees added successfully: ${quantity} tickets for ${name}, User Account: ${attendeeUserId ? 'Found' : 'Not Found'}`);

    return NextResponse.json({
      success: true,
      attendeeIds,
      ticketIds,
      quantity,
      hasUserAccount: !!attendeeUserId,
      message: attendeeUserId 
        ? `${quantity} ticket${quantity > 1 ? 's' : ''} added and created in their existing account`
        : `${quantity} ticket${quantity > 1 ? 's' : ''} added. They will be linked to their account when they sign up with phone ${phone}`,
      attendeeData: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        ticketType,
        quantity,
        totalAmount: ticketInfo.price * quantity
      }
    });

  } catch (error) {
    console.error('Error adding manual attendee:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to add attendee',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack') : undefined
      },
      { status: 500 }
    );
  }
} 