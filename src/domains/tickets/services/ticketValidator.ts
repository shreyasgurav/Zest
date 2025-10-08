import { collection, query, where, getDocs, updateDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';

export type TicketStatus = 'active' | 'used' | 'cancelled' | 'expired';

export interface TicketValidationResult {
  isValid: boolean;
  status: TicketStatus;
  message: string;
  code: string;
  ticket?: any;
  eventDetails?: any;
  securityFlags?: string[];
}

export interface TicketStateUpdate {
  status: TicketStatus;
  updatedAt: string;
  reason: string;
  location?: string;
  scannedBy?: string;
}

/**
 * Comprehensive ticket validation with expiration logic
 */
export async function validateTicketComprehensive(
  ticketNumber: string, 
  scannerLocation?: string,
  scannerId?: string
): Promise<TicketValidationResult> {
  try {
    // Find ticket by ticket number
    const ticketsRef = collection(db(), 'tickets');
    const ticketQuery = query(ticketsRef, where('ticketNumber', '==', ticketNumber));
    const ticketSnapshot = await getDocs(ticketQuery);

    if (ticketSnapshot.empty) {
      return {
        isValid: false,
        status: 'cancelled',
        message: 'Invalid ticket number',
        code: 'TICKET_NOT_FOUND'
      };
    }

    const ticketDoc = ticketSnapshot.docs[0];
    const ticketData = ticketDoc.data();

    // Get event/activity details for time validation
    let eventDetails = null;
    try {
      if (ticketData.type === 'event' && ticketData.eventId) {
        const eventDoc = await getDoc(doc(db(), 'events', ticketData.eventId));
        eventDetails = eventDoc.exists() ? eventDoc.data() : null;
      } else if (ticketData.type === 'activity' && ticketData.activityId) {
        const activityDoc = await getDoc(doc(db(), 'activities', ticketData.activityId));
        eventDetails = activityDoc.exists() ? activityDoc.data() : null;
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    }

    // Check current ticket status and update if needed
    const currentStatus = await checkAndUpdateTicketExpiration(ticketDoc.id, ticketData, eventDetails);
    
    // Security checks
    const securityFlags = await performSecurityChecks(ticketData, eventDetails, scannerLocation);

    // Validation logic based on status
    switch (currentStatus) {
      case 'expired':
        return {
          isValid: false,
          status: 'expired',
          message: 'Ticket has expired',
          code: 'TICKET_EXPIRED',
          ticket: ticketData,
          eventDetails,
          securityFlags
        };

      case 'used':
        return {
          isValid: false,
          status: 'used',
          message: 'Ticket has already been used',
          code: 'ALREADY_USED',
          ticket: ticketData,
          eventDetails,
          securityFlags
        };

      case 'cancelled':
        return {
          isValid: false,
          status: 'cancelled',
          message: 'Ticket has been cancelled',
          code: 'TICKET_CANCELLED',
          ticket: ticketData,
          eventDetails,
          securityFlags
        };

      case 'active':
        // Additional time-based validation for active tickets
        const timeValidation = validateTicketTiming(ticketData, eventDetails);
        if (!timeValidation.isValid) {
          return {
            isValid: false,
            status: timeValidation.shouldExpire ? 'expired' : 'active',
            message: timeValidation.message,
            code: timeValidation.code,
            ticket: ticketData,
            eventDetails,
            securityFlags
          };
        }

        return {
          isValid: true,
          status: 'active',
          message: 'Valid ticket - ready for entry',
          code: 'VALID_ACTIVE',
          ticket: ticketData,
          eventDetails,
          securityFlags
        };

      default:
        return {
          isValid: false,
          status: 'cancelled',
          message: 'Unknown ticket status',
          code: 'UNKNOWN_STATUS',
          securityFlags
        };
    }

  } catch (error) {
    console.error('Error validating ticket:', error);
    return {
      isValid: false,
      status: 'cancelled',
      message: 'System error during validation',
      code: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Check and update ticket expiration based on event timing
 */
async function checkAndUpdateTicketExpiration(
  ticketId: string, 
  ticketData: any, 
  eventDetails: any
): Promise<TicketStatus> {
  if (ticketData.status === 'used' || ticketData.status === 'cancelled') {
    return ticketData.status;
  }

  // Check if ticket should be expired
  const expirationCheck = shouldTicketBeExpired(ticketData, eventDetails);
  
  if (expirationCheck.shouldExpire && ticketData.status !== 'expired') {
    // Update ticket to expired status
    try {
      await updateDoc(doc(db(), 'tickets', ticketId), {
        status: 'expired',
        expiredAt: new Date().toISOString(),
        expiredReason: expirationCheck.reason,
        updatedAt: new Date().toISOString(),
        validationHistory: [
          ...(ticketData.validationHistory || []),
          {
            timestamp: new Date().toISOString(),
            action: 'expired',
            reason: expirationCheck.reason,
            location: 'system_check'
          }
        ]
      });
      return 'expired';
    } catch (error) {
      console.error('Error updating ticket to expired:', error);
      // If update fails, still return expired status for validation
      return 'expired';
    }
  }

  return ticketData.status || 'active';
}

/**
 * Determine if ticket should be expired
 */
function shouldTicketBeExpired(ticketData: any, eventDetails: any): { shouldExpire: boolean; reason?: string } {
  const now = new Date();
  
  // Check ticket date
  if (ticketData.selectedDate) {
    const ticketDate = new Date(ticketData.selectedDate);
    const endOfTicketDay = new Date(ticketDate);
    endOfTicketDay.setHours(23, 59, 59, 999);
    
    if (now > endOfTicketDay) {
      return { shouldExpire: true, reason: 'event_date_passed' };
    }
  }

  // Check specific time slot if available
  if (ticketData.selectedTimeSlot?.end_time && ticketData.selectedDate) {
    const eventEndTime = new Date(`${ticketData.selectedDate}T${ticketData.selectedTimeSlot.end_time}`);
    
    // Add grace period of 2 hours after event end
    const graceEndTime = new Date(eventEndTime.getTime() + (2 * 60 * 60 * 1000));
    
    if (now > graceEndTime) {
      return { shouldExpire: true, reason: 'event_time_passed' };
    }
  }

  // Check session-specific timing for session-centric events
  if (ticketData.isSessionCentric && ticketData.selectedSession) {
    const sessionEnd = new Date(`${ticketData.selectedSession.date}T${ticketData.selectedSession.end_time}`);
    const sessionGraceEnd = new Date(sessionEnd.getTime() + (2 * 60 * 60 * 1000));
    
    if (now > sessionGraceEnd) {
      return { shouldExpire: true, reason: 'session_time_passed' };
    }
  }

  // Check if event/activity is cancelled
  if (eventDetails?.status === 'cancelled') {
    return { shouldExpire: true, reason: 'event_cancelled' };
  }

  return { shouldExpire: false };
}

/**
 * Validate ticket timing for entry
 */
function validateTicketTiming(ticketData: any, eventDetails: any): { isValid: boolean; message: string; code: string; shouldExpire: boolean } {
  const now = new Date();
  
  // Check if trying to enter too early (more than 2 hours before event)
  if (ticketData.selectedDate && ticketData.selectedTimeSlot?.start_time) {
    const eventStart = new Date(`${ticketData.selectedDate}T${ticketData.selectedTimeSlot.start_time}`);
    const earlyEntryTime = new Date(eventStart.getTime() - (2 * 60 * 60 * 1000)); // 2 hours before
    
    if (now < earlyEntryTime) {
      return {
        isValid: false,
        message: `Entry opens 2 hours before event. Event starts at ${eventStart.toLocaleTimeString()}`,
        code: 'TOO_EARLY',
        shouldExpire: false
      };
    }
  }

  // Check if event is today (basic date validation)
  if (ticketData.selectedDate) {
    const ticketDate = new Date(ticketData.selectedDate);
    const today = new Date();
    
    // Allow entry on the same date
    if (ticketDate.toDateString() === today.toDateString()) {
      return { isValid: true, message: 'Valid for today', code: 'VALID_TODAY', shouldExpire: false };
    }
    
    // Check if date is in the future
    if (ticketDate > today) {
      return {
        isValid: false,
        message: `This ticket is for ${ticketDate.toLocaleDateString()}. Cannot enter before event date.`,
        code: 'FUTURE_DATE',
        shouldExpire: false
      };
    }
  }

  return { isValid: true, message: 'Valid timing', code: 'VALID_TIMING', shouldExpire: false };
}

/**
 * Perform security checks on ticket
 */
async function performSecurityChecks(
  ticketData: any, 
  eventDetails: any, 
  scannerLocation?: string
): Promise<string[]> {
  const flags: string[] = [];

  // Check for suspicious timing patterns
  const lastValidation = ticketData.validationHistory?.slice(-1)[0];
  if (lastValidation) {
    const lastValidationTime = new Date(lastValidation.timestamp);
    const timeSinceLastValidation = Date.now() - lastValidationTime.getTime();
    
    // Flag if scanned multiple times within 5 minutes
    if (timeSinceLastValidation < 5 * 60 * 1000) {
      flags.push('RAPID_SCAN_ATTEMPT');
    }
  }

  // Check for duplicate usage attempts
  const usedValidations = ticketData.validationHistory?.filter((v: any) => v.action === 'validated') || [];
  if (usedValidations.length > 0) {
    flags.push('PREVIOUS_USE_DETECTED');
  }

  // Flag tickets with manual creation for additional verification
  if (ticketData.addedManually) {
    flags.push('MANUALLY_CREATED');
  }

  // Check for phone-based tickets (not linked to user account)
  if (ticketData.phoneForFutureLink) {
    flags.push('PHONE_ONLY_TICKET');
  }

  return flags;
}

/**
 * Mark ticket as used after successful validation
 */
export async function markTicketAsUsed(
  ticketNumber: string,
  scannerId: string,
  scannerLocation?: string
): Promise<boolean> {
  try {
    const ticketsRef = collection(db(), 'tickets');
    const ticketQuery = query(ticketsRef, where('ticketNumber', '==', ticketNumber));
    const ticketSnapshot = await getDocs(ticketQuery);

    if (ticketSnapshot.empty) {
      return false;
    }

    const ticketDoc = ticketSnapshot.docs[0];
    const ticketData = ticketDoc.data();

    // Final validation before marking as used
    if (ticketData.status !== 'active') {
      return false;
    }

    const now = new Date().toISOString();
    
    await updateDoc(doc(db(), 'tickets', ticketDoc.id), {
      status: 'used',
      usedAt: now,
      usedBy: scannerId,
      useLocation: scannerLocation || 'unknown',
      updatedAt: now,
      validationHistory: [
        ...(ticketData.validationHistory || []),
        {
          timestamp: now,
          action: 'validated',
          location: scannerLocation || 'unknown',
          scannedBy: scannerId
        }
      ]
    });

    return true;
  } catch (error) {
    console.error('Error marking ticket as used:', error);
    return false;
  }
}

/**
 * Bulk expire tickets for past events (for maintenance jobs)
 */
export async function expireTicketsForPastEvents(): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  try {
    // Get all active tickets
    const ticketsRef = collection(db(), 'tickets');
    const activeTicketsQuery = query(ticketsRef, where('status', '==', 'active'));
    const activeTickets = await getDocs(activeTicketsQuery);

    const batch = writeBatch(db());
    const now = new Date().toISOString();

    for (const ticketDoc of activeTickets.docs) {
      try {
        const ticketData = ticketDoc.data();
        
        // Check if ticket should be expired
        const expirationCheck = shouldTicketBeExpired(ticketData, null);
        
        if (expirationCheck.shouldExpire) {
          batch.update(ticketDoc.ref, {
            status: 'expired',
            expiredAt: now,
            expiredReason: expirationCheck.reason,
            updatedAt: now,
            validationHistory: [
              ...(ticketData.validationHistory || []),
              {
                timestamp: now,
                action: 'expired',
                reason: expirationCheck.reason,
                location: 'batch_expiration'
              }
            ]
          });
          updated++;
        }
      } catch (error) {
        console.error('Error processing ticket for expiration:', error);
        errors++;
      }
    }

    if (updated > 0) {
      await batch.commit();
    }

    console.log(`Bulk expiration completed: ${updated} tickets expired, ${errors} errors`);
    
  } catch (error) {
    console.error('Error in bulk ticket expiration:', error);
    errors++;
  }

  return { updated, errors };
}

/**
 * Get ticket display status for UI
 */
export function getTicketDisplayStatus(ticket: any): { 
  status: TicketStatus; 
  displayText: string; 
  color: string; 
  canUse: boolean 
} {
  // Check if ticket should be expired (without updating DB)
  const expirationCheck = shouldTicketBeExpired(ticket, null);
  const effectiveStatus = expirationCheck.shouldExpire ? 'expired' : ticket.status;

  switch (effectiveStatus) {
    case 'active':
      return {
        status: 'active',
        displayText: 'Active',
        color: '#10b981',
        canUse: true
      };
    case 'used':
      return {
        status: 'used',
        displayText: 'Used',
        color: '#6b7280',
        canUse: false
      };
    case 'expired':
      return {
        status: 'expired',
        displayText: 'Expired',
        color: '#ef4444',
        canUse: false
      };
    case 'cancelled':
      return {
        status: 'cancelled',
        displayText: 'Cancelled',
        color: '#f59e0b',
        canUse: false
      };
    default:
      return {
        status: 'cancelled',
        displayText: 'Unknown',
        color: '#6b7280',
        canUse: false
      };
  }
} 