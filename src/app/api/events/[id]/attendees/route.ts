import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const whereClause: any = { eventId };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    // Fetch tickets instead of 'attendees' because each ticket represents an attendee
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        booking: true,
        ticketType: true,
        session: true,
      },
      orderBy: {
        booking: {
          createdAt: 'desc'
        }
      }
    });

    const formattedAttendees = tickets.map(ticket => ({
      id: ticket.id,
      name: ticket.booking?.contactName || 'Unknown',
      email: ticket.booking?.contactEmail || 'Unknown',
      phone: ticket.booking?.contactPhone || 'Unknown',
      ticketType: ticket.ticketType?.name || 'General',
      checkedIn: ticket.status === 'USED',
      ticketNumber: ticket.ticketNumber,
      sessionId: ticket.sessionId,
      userId: ticket.booking?.userId,
      eventId: ticket.eventId,
      status: ticket.status,
      createdAt: ticket.booking?.createdAt.toISOString(),
      selectedDate: ticket.session ? ticket.session.date.toISOString() : undefined,
      selectedTimeSlot: ticket.session ? {
        start_time: ticket.session.startTime,
        end_time: ticket.session.endTime
      } : undefined
    }));

    return NextResponse.json({ success: true, attendees: formattedAttendees });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
