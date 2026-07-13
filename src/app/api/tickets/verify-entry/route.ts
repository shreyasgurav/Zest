import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { validateTicketComprehensive, markTicketAsUsed } from '@/domains/tickets/services/ticketValidator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    
    if (scannerType === 'organization' || scannerType === 'user') {
      // In Postgres, we can check if the scanner is the owner of the event
      if (ticketData.eventId) {
        const event = await prisma.event.findUnique({ where: { id: ticketData.eventId } });
        hasPermission = event?.ownerId === scannerId;
      } else if (ticketData.activityId) {
        const activity = await prisma.activity.findUnique({ where: { id: ticketData.activityId } });
        hasPermission = activity?.ownerId === scannerId;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to scan tickets for this event',
        code: 'UNAUTHORIZED'
      }, { status: 403 });
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

    // Log the entry (we can add an EntryLog model in Postgres later if needed, but for now just log it)
    console.log(`Ticket ${ticketNumber} scanned successfully at ${now} by ${scannerId}`);

    // Return success with ticket details
    return NextResponse.json({
      success: true,
      message: 'Entry approved',
      ticket: {
        id: ticketData.id,
        ticketNumber: ticketData.ticketNumber,
        userName: ticketData.booking?.contactName || 'Unknown',
        eventTitle: validationResult.eventDetails?.title || validationResult.eventDetails?.name || 'Unknown Event',
        ticketType: ticketData.ticketType?.name || 'General',
        amount: Number(ticketData.booking?.totalAmount || 0),
        entryTime: now
      },
      validationDetails: {
        status: validationResult.status,
        message: validationResult.message,
        eventDetails: validationResult.eventDetails?.title || validationResult.eventDetails?.name || 'Unknown Event'
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