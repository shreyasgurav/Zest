import { adminDb } from '@/infrastructure/firebase/admin';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

export interface BookingValidationData {
  eventId?: string;
  activityId?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  selectedDate: string;
  selectedTimeSlot: any;
  selectedSession?: any;
  tickets: any;
  totalAmount: number;
}

/**
 * Validate booking data structure and required fields
 */
export function validateBookingDataStructure(
  bookingData: any, 
  bookingType: 'event' | 'activity'
): ValidationResult {
  // Check required common fields
  const requiredFields = ['userId', 'name', 'email', 'selectedDate', 'selectedTimeSlot', 'tickets', 'totalAmount'];
  
  for (const field of requiredFields) {
    if (!bookingData[field]) {
      return {
        isValid: false,
        error: `Missing required field: ${field}`
      };
    }
  }

  // Check booking type specific fields
  if (bookingType === 'event') {
    if (!bookingData.eventId) {
      return {
        isValid: false,
        error: 'Event ID is required for event booking'
      };
    }
    if (typeof bookingData.tickets !== 'object' || Object.keys(bookingData.tickets).length === 0) {
      return {
        isValid: false,
        error: 'Invalid ticket selection for event booking'
      };
    }
  } else if (bookingType === 'activity') {
    if (!bookingData.activityId) {
      return {
        isValid: false,
        error: 'Activity ID is required for activity booking'
      };
    }
    if (typeof bookingData.tickets !== 'number' || bookingData.tickets <= 0) {
      return {
        isValid: false,
        error: 'Invalid ticket quantity for activity booking'
      };
    }
  }

  // Validate amount
  if (typeof bookingData.totalAmount !== 'number' || bookingData.totalAmount <= 0) {
    return {
      isValid: false,
      error: 'Invalid total amount'
    };
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(bookingData.selectedDate)) {
    return {
      isValid: false,
      error: 'Invalid date format. Expected YYYY-MM-DD'
    };
  }

  // Validate time slot structure
  if (!bookingData.selectedTimeSlot.start_time || !bookingData.selectedTimeSlot.end_time) {
    return {
      isValid: false,
      error: 'Invalid time slot data'
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(bookingData.email)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  return { isValid: true };
}

/**
 * Calculate server-side amount for event booking
 */
export async function calculateEventAmount(bookingData: BookingValidationData): Promise<{ amount: number; breakdown: any[] }> {
  const eventDoc = await adminDb!.collection('events').doc(bookingData.eventId!).get();
  
  if (!eventDoc.exists) {
    throw new Error('Event not found');
  }

  const eventData = eventDoc.data();
  
  // Handle session-centric vs legacy events
  let tickets: any[] = [];
  
  if (eventData?.architecture === 'session-centric') {
    // For session-centric events, extract session ID and find session-specific tickets
    const sessionId = bookingData.selectedTimeSlot?.session_id || 
                     bookingData.selectedSession?.id;
    
    if (!sessionId) {
      throw new Error('Session ID is required for session-centric events');
    }
    
    // Find the specific session
    const targetSession = eventData.sessions?.find((session: any) => session.id === sessionId);
    
    if (!targetSession) {
      throw new Error(`Session ${sessionId} not found in event`);
    }
    
    tickets = targetSession.tickets || [];
    
    if (tickets.length === 0) {
      throw new Error(`No tickets found for session ${sessionId}`);
    }
  } else {
    // For legacy events, use global tickets
    tickets = eventData?.tickets || [];
  }
  
  if (tickets.length === 0) {
    throw new Error('No tickets found for this event');
  }
  
  let totalAmount = 0;
  const breakdown: any[] = [];

  for (const [ticketTypeName, quantity] of Object.entries(bookingData.tickets as Record<string, number>)) {
    const ticketType = tickets.find((t: any) => t.name === ticketTypeName);
    
    if (!ticketType) {
      throw new Error(`Invalid ticket type: ${ticketTypeName}. Available tickets: ${tickets.map(t => t.name).join(', ')}`);
    }

    const subtotal = ticketType.price * quantity;
    totalAmount += subtotal;
    
    breakdown.push({
      ticketType: ticketTypeName,
      quantity,
      price: ticketType.price,
      subtotal,
      sessionId: eventData?.architecture === 'session-centric' ? 
        (bookingData.selectedTimeSlot?.session_id || bookingData.selectedSession?.id) : 
        null
    });
  }

  return { amount: totalAmount, breakdown };
}

/**
 * Calculate server-side amount for activity booking
 */
export async function calculateActivityAmount(bookingData: BookingValidationData): Promise<{ amount: number; breakdown: any[] }> {
  const activityDoc = await adminDb!.collection('activities').doc(bookingData.activityId!).get();
  
  if (!activityDoc.exists) {
    throw new Error('Activity not found');
  }

  const activityData = activityDoc.data();
  const pricePerSlot = activityData?.price_per_slot || 0;
  const quantity = bookingData.tickets as number;
  
  const totalAmount = pricePerSlot * quantity;
  
  const breakdown = [{
    ticketType: 'Activity Spot',
    quantity,
    price: pricePerSlot,
    subtotal: totalAmount
  }];

  return { amount: totalAmount, breakdown };
}

/**
 * Verify event/activity exists and is bookable
 */
export async function verifyBookingEligibility(
  bookingData: BookingValidationData,
  bookingType: 'event' | 'activity'
): Promise<ValidationResult> {
  try {
    if (bookingType === 'event') {
      const eventDoc = await adminDb!.collection('events').doc(bookingData.eventId!).get();
      
      if (!eventDoc.exists) {
        return {
          isValid: false,
          error: 'Event not found'
        };
      }

      const eventData = eventDoc.data();
      
      if (!eventData) {
        return {
          isValid: false,
          error: 'Event data not found'
        };
      }
      
      // Check if event is in the future
      const eventDate = new Date(bookingData.selectedDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset time to compare dates only
      
      if (eventDate < now) {
        return {
          isValid: false,
          error: 'Cannot book past events'
        };
      }

      // Check if event allows bookings (you can add more status checks here)
      if (eventData.status === 'cancelled') {
        return {
          isValid: false,
          error: 'Event has been cancelled'
        };
      }

    } else if (bookingType === 'activity') {
      const activityDoc = await adminDb!.collection('activities').doc(bookingData.activityId!).get();
      
      if (!activityDoc.exists) {
        return {
          isValid: false,
          error: 'Activity not found'
        };
      }

      const activityData = activityDoc.data();
      
      if (!activityData) {
        return {
          isValid: false,
          error: 'Activity data not found'
        };
      }
      
      // Check if activity date is in the future
      const activityDate = new Date(bookingData.selectedDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (activityDate < now) {
        return {
          isValid: false,
          error: 'Cannot book past activities'
        };
      }

      // Check if the selected date is in closed dates
      const closedDates = activityData.closed_dates || [];
      if (closedDates.includes(bookingData.selectedDate)) {
        return {
          isValid: false,
          error: 'Activity is not available on selected date'
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error verifying booking eligibility',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check for recent bookings to prevent spam
 */
export async function checkRateLimit(userId: string, bookingType: 'event' | 'activity'): Promise<ValidationResult> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const collection = bookingType === 'event' ? 'eventAttendees' : 'activity_bookings';
    
    const recentBookings = await adminDb!
      .collection(collection)
      .where('userId', '==', userId)
      .where('createdAt', '>', oneHourAgo)
      .get();

    if (recentBookings.size >= 5) {
      return {
        isValid: false,
        error: 'Too many bookings in the last hour. Please try again later.',
        details: { recentBookingCount: recentBookings.size }
      };
    }

    return { isValid: true };
  } catch (error) {
    // Don't fail booking if rate limit check fails
    console.error('Rate limit check failed:', error);
    return { isValid: true };
  }
}

/**
 * Comprehensive booking validation
 */
export async function validateCompleteBooking(
  bookingData: any,
  bookingType: 'event' | 'activity'
): Promise<ValidationResult & { serverAmount?: number; breakdown?: any[] }> {
  
  // 1. Validate data structure
  const structureValidation = validateBookingDataStructure(bookingData, bookingType);
  if (!structureValidation.isValid) {
    return structureValidation;
  }

  // 2. Check rate limiting
  const rateLimitResult = await checkRateLimit(bookingData.userId, bookingType);
  if (!rateLimitResult.isValid) {
    return rateLimitResult;
  }

  // 3. Verify booking eligibility
  const eligibilityResult = await verifyBookingEligibility(bookingData, bookingType);
  if (!eligibilityResult.isValid) {
    return eligibilityResult;
  }

  // 4. Calculate and verify amount
  try {
    const { amount, breakdown } = bookingType === 'event' 
      ? await calculateEventAmount(bookingData)
      : await calculateActivityAmount(bookingData);

    if (Math.abs(amount - bookingData.totalAmount) > 0.01) { // Allow for minor floating point differences
      return {
        isValid: false,
        error: 'Amount mismatch between client and server calculation',
        details: {
          clientAmount: bookingData.totalAmount,
          serverAmount: amount,
          breakdown
        }
      };
    }

    return {
      isValid: true,
      serverAmount: amount,
      breakdown
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error calculating booking amount',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 