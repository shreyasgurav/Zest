import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/infrastructure/firebase/firebase-admin';
import { createTicketsForBooking } from '@/domains/tickets/services/ticketGenerator';
import { validateCompleteBooking } from '@/domains/payments/services/validation.service';
// Temporary stub implementations for logging functions during reorganization
const logPaymentVerification = (...args: any[]) => console.log('Payment verification logged:', args);
const logDuplicatePayment = (...args: any[]) => console.log('Duplicate payment logged:', args);
const logBookingCreation = (...args: any[]) => console.log('Booking creation logged:', args);
const logValidationFailure = (...args: any[]) => console.log('Validation failure logged:', args);
const logCapacityViolation = (...args: any[]) => console.log('Capacity violation logged:', args);

/**
 * Check for duplicate payment to prevent replay attacks
 */
async function checkPaymentDuplicate(paymentId: string): Promise<boolean> {
  try {
    // Check in both event and activity bookings
    const [eventBookings, activityBookings] = await Promise.all([
      adminDb!
        .collection('eventAttendees')
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get(),
      adminDb!
        .collection('activity_bookings')
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get()
    ]);

    return !eventBookings.empty || !activityBookings.empty;
  } catch (error) {
    console.error('Error checking payment duplicate:', error);
    // Be conservative - assume duplicate if check fails
    return true;
  }
}

/**
 * Atomically create event booking with capacity update and individual attendee records
 */
async function createEventBookingAtomic(
  finalBookingData: any,
  bookingData: any
): Promise<string> {
  return adminDb!.runTransaction(async (transaction) => {
    const eventRef = adminDb!.collection('events').doc(bookingData.eventId);
    const eventDoc = await transaction.get(eventRef);
    
    if (!eventDoc.exists) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    
    // Handle session-centric vs legacy events differently
    const isSessionCentric = eventData?.architecture === 'session-centric';
    let currentTickets = [];
    let sessionId: string | null = null;
    let selectedSession = null;

    if (isSessionCentric) {
      // For session-centric events, extract session information
      sessionId = bookingData.selectedSession?.id || 
                 bookingData.selectedTimeSlot?.session_id || 
                 null;
      selectedSession = bookingData.selectedSession;
      
      if (!sessionId || !selectedSession) {
        throw new Error('Session information missing for session-centric event');
      }
      
      // Find the specific session and its tickets
      const targetSession = eventData.sessions?.find((s: any) => s.id === sessionId);
      if (!targetSession) {
        throw new Error(`Session ${sessionId} not found in event`);
      }
      
      currentTickets = targetSession.tickets || [];
    } else {
      // For legacy events, use global tickets
      currentTickets = eventData?.tickets || [];
    }
    
    // Check availability and calculate new capacity
    const updatedTickets = currentTickets.map((ticket: any) => {
      const bookedQuantity = bookingData.tickets[ticket.name] || 0;
      const newAvailableCapacity = ticket.available_capacity - bookedQuantity;
      
      if (newAvailableCapacity < 0) {
        throw new Error(`Insufficient capacity for ticket type: ${ticket.name}. Available: ${ticket.available_capacity}, Requested: ${bookedQuantity}`);
      }
      
      return {
        ...ticket,
        available_capacity: newAvailableCapacity
      };
    });

    // Create individual attendee records for each ticket
    const attendeeIds: string[] = [];
    const ticketEntries = Object.entries(bookingData.tickets as Record<string, number>);
    
    // Find the ticket price for amount calculation
    const getTicketPrice = (ticketName: string) => {
      const ticket = currentTickets.find((t: any) => t.name === ticketName);
      return ticket ? ticket.price : 0;
    };
    
    // Performance optimization: Add limits for large group bookings
    const totalTickets = ticketEntries.reduce((total, [, qty]) => total + qty, 0);
    
    // Set reasonable limits to prevent database overload
    const MAX_INDIVIDUAL_TICKETS = 50; // Maximum individual tickets per booking
    const BATCH_SIZE = 10; // Process tickets in batches for large bookings
    
    if (totalTickets > MAX_INDIVIDUAL_TICKETS) {
      throw new Error(`Group bookings are limited to ${MAX_INDIVIDUAL_TICKETS} tickets. For larger events, please contact support.`);
    }
    
    // Validate that individual amounts will equal the total paid
    let calculatedTotal = 0;
    for (const [ticketType, quantity] of ticketEntries) {
      const ticketPrice = getTicketPrice(ticketType);
      calculatedTotal += ticketPrice * quantity;
    }
    
    // Handle potential price discrepancies (e.g., if prices changed after booking started)
    const totalDifference = Math.abs(calculatedTotal - bookingData.totalAmount);
    if (totalDifference > 0.01) { // Allow 1 paisa difference for rounding
      console.warn('Price discrepancy detected:', {
        calculated: calculatedTotal,
        paid: bookingData.totalAmount,
        difference: totalDifference
      });
    }
    
    // Use the actual amount paid for individual calculations to maintain accuracy
    let remainingAmount = bookingData.totalAmount;
    let processedTickets = 0;
    
    // Process tickets in batches for better performance
    const attendeeData: any[] = [];
    
    for (const [ticketType, quantity] of ticketEntries) {
      const ticketPrice = getTicketPrice(ticketType);
      
      for (let i = 0; i < quantity; i++) {
        processedTickets++;
        
        // Calculate individual amount - use proportional amount for last ticket to handle rounding
        const individualAmount = processedTickets === totalTickets 
          ? remainingAmount // Give remaining amount to last ticket
          : Math.round((ticketPrice / bookingData.totalAmount * bookingData.totalAmount) * 100) / 100;
        
        remainingAmount -= individualAmount;
        
        const attendeeRef = adminDb!.collection('eventAttendees').doc();
        const individualAttendeeData = {
          ...finalBookingData,
          // Individual ticket info - each attendee gets 1 ticket of their type
          tickets: { [ticketType]: 1 },
          ticketType: ticketType,
          ticketIndex: i + 1, // Track which ticket number this is (1st, 2nd, etc.)
          totalTicketsInBooking: totalTickets,
          individualAmount: individualAmount,
          
          // CRITICAL FIX: Store session information for session-centric events
          sessionId: sessionId, // Store the session ID for efficient querying
          selectedSession: selectedSession, // Store full session object for compatibility
          isSessionCentric: isSessionCentric,
          
          // Ensure consistent time slot data
          selectedTimeSlot: isSessionCentric ? {
            date: selectedSession.date,
            start_time: selectedSession.start_time,
            end_time: selectedSession.end_time,
            available: true,
            session_id: sessionId
          } : bookingData.selectedTimeSlot,
          
          // Track the original booking for reference and revenue verification
          originalBookingData: {
            originalTotalAmount: bookingData.totalAmount,
            originalTickets: bookingData.tickets,
            bookingReference: attendeeRef.id,
            priceAtBooking: ticketPrice, // Store the price at time of booking
            verifiedTotal: calculatedTotal, // Store calculated total for auditing
            sessionReference: sessionId // Store session reference
          },
          // Check-in status - each attendee can check in independently
          checkedIn: false,
          checkInTime: null,
          checkInMethod: null,
          checkedInBy: null,
          // Add attendee identification
          attendeeId: attendeeRef.id,
          canCheckInIndependently: true,
          // Performance optimization: Add batch ID for grouping
          batchId: Math.floor(processedTickets / BATCH_SIZE),
          createdInBatch: true
        };
        
        attendeeData.push({ ref: attendeeRef, data: individualAttendeeData });
        attendeeIds.push(attendeeRef.id);
      }
    }
    
    // Batch write all attendee records
    for (const { ref, data } of attendeeData) {
      transaction.set(ref, data);
    }
    
    // Update event capacity based on event type
    if (isSessionCentric) {
      // Update specific session's tickets
      const updatedSessions = eventData.sessions.map((session: any) => {
        if (session.id === sessionId) {
          return {
            ...session,
            tickets: updatedTickets
          };
        }
        return session;
      });
      
      transaction.update(eventRef, {
        sessions: updatedSessions,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Update global tickets for legacy events
      transaction.update(eventRef, {
        tickets: updatedTickets,
        updatedAt: new Date().toISOString()
      });
    }

    // Return the first attendee ID as the primary booking reference
    return attendeeIds[0];
  });
}

/**
 * Atomically create activity booking with capacity update and individual attendee records
 */
async function createActivityBookingAtomic(
  finalBookingData: any,
  bookingData: any
): Promise<string> {
  return adminDb!.runTransaction(async (transaction) => {
    const activityRef = adminDb!.collection('activities').doc(bookingData.activityId);
    const activityDoc = await transaction.get(activityRef);
    
    if (!activityDoc.exists) {
      throw new Error('Activity not found');
    }

    const activityData = activityDoc.data();
    const selectedDate = new Date(bookingData.selectedDate);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find the time slot and check capacity
    const updatedSchedule = activityData?.weekly_schedule.map((day: any) => {
      if (day.day === dayOfWeek) {
        return {
          ...day,
          time_slots: day.time_slots.map((slot: any) => {
            if (slot.start_time === bookingData.selectedTimeSlot.start_time && 
                slot.end_time === bookingData.selectedTimeSlot.end_time) {
              
              const requestedTickets = bookingData.tickets as number;
              const newAvailableCapacity = slot.available_capacity - requestedTickets;
              
              if (newAvailableCapacity < 0) {
                throw new Error(`Insufficient capacity for time slot ${slot.start_time}-${slot.end_time}. Available: ${slot.available_capacity}, Requested: ${requestedTickets}`);
              }
              
              return {
                ...slot,
                available_capacity: newAvailableCapacity
              };
            }
            return slot;
          })
        };
      }
      return day;
    });

    // Create individual attendee records for each ticket (using activityAttendees collection)
    const attendeeIds: string[] = [];
    const requestedTickets = bookingData.tickets as number;
    const individualAmount = bookingData.totalAmount / requestedTickets;
    
    for (let i = 0; i < requestedTickets; i++) {
      const attendeeRef = adminDb!.collection('activityAttendees').doc();
      const individualAttendeeData = {
        ...finalBookingData,
        // Individual ticket info - each attendee gets 1 ticket
        tickets: 1,
        ticketIndex: i + 1, // Track which ticket number this is (1st, 2nd, etc.)
        totalTicketsInBooking: requestedTickets,
        individualAmount: individualAmount,
        // Track the original booking for reference
        originalBookingData: {
          originalTotalAmount: bookingData.totalAmount,
          originalTickets: bookingData.tickets,
          bookingReference: attendeeRef.id
        },
        // Check-in status - each attendee can check in independently
        checkedIn: false,
        checkInTime: null,
        checkInMethod: null,
        checkedInBy: null,
        // Add attendee identification
        attendeeId: attendeeRef.id,
        canCheckInIndependently: true
      };
      
      transaction.set(attendeeRef, individualAttendeeData);
      attendeeIds.push(attendeeRef.id);
    }
    
    // Update activity schedule
    transaction.update(activityRef, {
      weekly_schedule: updatedSchedule,
      updatedAt: new Date().toISOString()
    });

    // Return the first attendee ID as the primary booking reference
    return attendeeIds[0];
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is available
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database service not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingData,
      bookingType,
    } = body;

    // Validate required payment fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // Validate booking type
    if (!bookingType || !['event', 'activity'].includes(bookingType)) {
      return NextResponse.json(
        { error: 'Invalid booking type' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      console.error('Payment signature verification failed', {
        expectedSignature: digest,
        receivedSignature: razorpay_signature,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });

      // Log security event
      logPaymentVerification(
        false,
        razorpay_payment_id,
        razorpay_order_id,
        bookingData?.userId || 'unknown',
        bookingData?.totalAmount || 0,
        { reason: 'signature_mismatch' }
      );
      
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Check for duplicate payment (prevent replay attacks)
    const isDuplicate = await checkPaymentDuplicate(razorpay_payment_id);
    if (isDuplicate) {
      console.warn('Duplicate payment detected', {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      // Log security event
      logDuplicatePayment(
        razorpay_payment_id,
        razorpay_order_id,
        bookingData?.userId,
        { 
          bookingType,
          attemptedAt: new Date().toISOString(),
          userAgent: request.headers.get('user-agent'),
          clientIP: request.headers.get('x-forwarded-for')
        }
      );
      
      return NextResponse.json(
        { 
          error: 'Payment has already been processed',
          details: 'This payment ID has already been used for a successful booking. If you believe this is an error, please contact support.',
          paymentId: razorpay_payment_id.slice(-8) // Only show last 8 characters for security
        },
        { status: 409 }
      );
    }

    // Comprehensive booking validation
    const validationResult = await validateCompleteBooking(bookingData, bookingType);
    if (!validationResult.isValid) {
      console.error('Booking validation failed', {
        error: validationResult.error,
        details: validationResult.details,
        bookingData: JSON.stringify(bookingData, null, 2)
      });

      // Log validation failure
      logValidationFailure(
        'comprehensive_booking_validation',
        bookingData?.userId || 'unknown',
        validationResult.error || 'unknown_validation_error',
        {
          bookingType,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          details: validationResult.details
        }
      );
      
      return NextResponse.json(
        { 
          error: validationResult.error,
          details: validationResult.details
        },
        { status: 400 }
      );
    }

    console.log('Payment verified successfully, proceeding with booking creation...', {
      bookingType,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      serverAmount: validationResult.serverAmount
    });

    // Log successful payment verification
    logPaymentVerification(
      true,
      razorpay_payment_id,
      razorpay_order_id,
      bookingData.userId,
      validationResult.serverAmount || bookingData.totalAmount,
      { bookingType }
    );

    // Prepare final booking data
    const currentTime = new Date().toISOString();
    const finalBookingData = {
      ...bookingData,
      paymentStatus: 'completed',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentSignature: razorpay_signature,
      status: 'confirmed',
      createdAt: currentTime,
      updatedAt: currentTime,
      verifiedAmount: validationResult.serverAmount,
      amountBreakdown: validationResult.breakdown
    };

    let bookingId: string;

    try {
      // Create booking atomically with capacity updates
      if (bookingType === 'event') {
        bookingId = await createEventBookingAtomic(finalBookingData, bookingData);
        console.log('Event booking created successfully with ID:', bookingId);
        
        // Log successful booking creation
        logBookingCreation(
          true,
          bookingId,
          bookingData.userId,
          'event',
          bookingData.eventId,
          validationResult.serverAmount || bookingData.totalAmount,
          { paymentId: razorpay_payment_id, orderId: razorpay_order_id }
        );
      } else {
        bookingId = await createActivityBookingAtomic(finalBookingData, bookingData);
        console.log('Activity booking created successfully with ID:', bookingId);
        
        // Log successful booking creation
        logBookingCreation(
          true,
          bookingId,
          bookingData.userId,
          'activity',
          bookingData.activityId,
          validationResult.serverAmount || bookingData.totalAmount,
          { paymentId: razorpay_payment_id, orderId: razorpay_order_id }
        );
      }

      // Create tickets for the booking
      let ticketIds: string[] = [];
      try {
        console.log('Creating tickets for booking...');
        ticketIds = await createTicketsForBooking(
          finalBookingData,
          bookingId,
          bookingType
        );
        console.log(`Successfully created ${ticketIds.length} tickets:`, ticketIds);
        
        // TODO: Send consolidated email notification for group bookings
        if (bookingType === 'event' && finalBookingData.totalTicketsInBooking > 1) {
          console.log('Group booking created - email notification would be sent here:', {
            userEmail: bookingData.email,
            userName: bookingData.name,
            totalTickets: finalBookingData.totalTicketsInBooking,
            totalAmount: bookingData.totalAmount
          });
        }
        
        return NextResponse.json({
          success: true,
          bookingId,
          ticketIds,
          message: finalBookingData.totalTicketsInBooking > 1 
            ? `Payment verified, ${finalBookingData.totalTicketsInBooking} individual tickets created for your group booking`
            : 'Payment verified, booking confirmed, and tickets created',
          amount: validationResult.serverAmount,
          breakdown: validationResult.breakdown,
          groupBookingInfo: finalBookingData.totalTicketsInBooking > 1 ? {
            totalTickets: finalBookingData.totalTicketsInBooking,
            individualTickets: ticketIds.length,
            checkInInfo: 'Each person can check in independently with their individual QR code'
          } : null
        });
        
      } catch (ticketError) {
        console.error('Error creating tickets:', ticketError);
        
        // Booking was successful but ticket creation failed
        // This is not critical as tickets can be regenerated
        return NextResponse.json({
          success: true,
          bookingId,
          ticketIds: [],
          message: 'Payment verified and booking confirmed. Tickets will be generated shortly.',
          warning: 'Tickets creation pending - they will be available in your tickets section soon.',
          amount: validationResult.serverAmount,
          breakdown: validationResult.breakdown
        });
      }

    } catch (bookingError) {
      console.error('Error creating booking:', bookingError);
      
      // Provide detailed error information for debugging
      const errorMessage = bookingError instanceof Error ? bookingError.message : 'Unknown booking error';
      
      // Log failed booking creation
      logBookingCreation(
        false,
        'failed',
        bookingData.userId,
        bookingType,
        bookingType === 'event' ? bookingData.eventId : bookingData.activityId,
        validationResult.serverAmount || bookingData.totalAmount,
        {
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          error: errorMessage,
          errorType: bookingError instanceof Error ? bookingError.name : 'UnknownError'
        }
      );

      // Check if this is a capacity violation
      if (errorMessage.includes('Insufficient capacity')) {
        logCapacityViolation(
          bookingType,
          bookingType === 'event' ? bookingData.eventId : bookingData.activityId,
          bookingType === 'event' ? 
            Object.values(bookingData.tickets).reduce((a: any, b: any) => a + b, 0) : 
            bookingData.tickets,
          0, // We don't have the exact available capacity here
          bookingData.userId,
          { paymentId: razorpay_payment_id, orderId: razorpay_order_id }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Payment verified but booking creation failed',
          details: errorMessage,
          debugInfo: {
            bookingType,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            timestamp: currentTime,
            errorType: bookingError instanceof Error ? bookingError.name : 'UnknownError'
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Critical error in payment verification:', error);
    
    return NextResponse.json(
      { 
        error: 'Payment verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 