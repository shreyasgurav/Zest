import prisma from '@/infrastructure/database/prisma';

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

/**
 * Comprehensive ticket validation with expiration logic using Prisma
 */
export async function validateTicketComprehensive(
  ticketNumber: string, 
  scannerLocation?: string,
  scannerId?: string
): Promise<TicketValidationResult> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        booking: true,
        event: true,
        session: true,
        activity: true,
        activitySlot: true,
        ticketType: true,
      }
    });

    if (!ticket) {
      return {
        isValid: false,
        status: 'cancelled',
        message: 'Invalid ticket number',
        code: 'TICKET_NOT_FOUND'
      };
    }

    const eventDetails = ticket.event || ticket.activity;
    const currentStatus = ticket.status.toLowerCase() as TicketStatus;
    
    // Simplistic security checks
    const securityFlags: string[] = [];

    // Validation logic based on status
    switch (currentStatus) {
      case 'expired':
        return {
          isValid: false,
          status: 'expired',
          message: 'Ticket has expired',
          code: 'TICKET_EXPIRED',
          ticket,
          eventDetails,
          securityFlags
        };

      case 'used':
        return {
          isValid: false,
          status: 'used',
          message: 'Ticket has already been used',
          code: 'ALREADY_USED',
          ticket,
          eventDetails,
          securityFlags
        };

      case 'cancelled':
        return {
          isValid: false,
          status: 'cancelled',
          message: 'Ticket has been cancelled',
          code: 'TICKET_CANCELLED',
          ticket,
          eventDetails,
          securityFlags
        };

      case 'active':
        return {
          isValid: true,
          status: 'active',
          message: 'Ticket is valid and ready to use',
          code: 'VALID',
          ticket,
          eventDetails,
          securityFlags
        };

      default:
        return {
          isValid: false,
          status: 'cancelled',
          message: 'Unknown ticket status',
          code: 'UNKNOWN_STATUS',
          ticket,
          eventDetails,
          securityFlags
        };
    }
  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      status: 'cancelled',
      message: 'Validation service error',
      code: 'SERVICE_ERROR'
    };
  }
}

/**
 * Marks a ticket as used in Postgres
 */
export async function markTicketAsUsed(
  ticketNumber: string, 
  scannerId: string, 
  location: string = 'venue_entrance'
): Promise<boolean> {
  try {
    const updated = await prisma.ticket.update({
      where: { ticketNumber },
      data: {
        status: 'USED',
      }
    });
    return !!updated;
  } catch (error) {
    console.error('Error marking ticket as used:', error);
    return false;
  }
}

/**
 * Returns formatted status for UI display
 */
export function getTicketDisplayStatus(ticket: any) {
  if (!ticket || !ticket.status) return 'Unknown';
  
  const status = ticket.status.toLowerCase();
  
  if (status === 'active') return 'Active';
  if (status === 'used') return 'Used';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'expired') return 'Expired';
  
  return 'Unknown';
}