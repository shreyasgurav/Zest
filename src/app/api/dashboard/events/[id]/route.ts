import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        owner: true,
        sessions: {
          include: {
            ticketTypes: true
          }
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] }
          }
        },
        tickets: {
          where: {
            status: { in: ['ACTIVE', 'USED'] }
          },
          include: {
            ticketType: true,
            session: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Map Prisma models to the expected frontend legacy schema to avoid rewriting 3000 lines of UI code
    const mappedEvent = {
      id: event.id,
      title: event.title,
      event_image: event.image || '',
      organizationId: event.owner.firebaseUid,
      event_type: 'event',
      architecture: 'session-centric',
      sessions: event.sessions.map((session) => ({
        id: session.id,
        name: session.name,
        date: session.date.toISOString(),
        start_time: session.startTime,
        end_time: session.endTime,
        venue: session.venue || event.venue,
        available: true,
        tickets: session.ticketTypes.map((tt) => ({
          name: tt.name,
          capacity: tt.capacity,
          price: Number(tt.price),
          available_capacity: Math.max(0, tt.capacity - tt.soldCount),
        })),
        maxCapacity: session.ticketTypes.reduce((acc, tt) => acc + tt.capacity, 0)
      })),
      event_venue: event.venue || '',
      about_event: event.about || '',
      hosting_club: '',
      organization_username: '',
      event_category: event.categories[0] || '',
      event_languages: '',
      event_duration: '',
      event_age_limit: '',
      status: event.status.toLowerCase(),
    };

    // Map tickets
    const mappedTickets = event.tickets.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userName: ticket.attendeeName,
      userEmail: ticket.attendeeEmail,
      ticketType: ticket.ticketType?.name,
      eventId: event.id,
      sessionId: ticket.sessionId,
      userId: ticket.userId || '',
      status: ticket.status.toLowerCase(),
      createdAt: ticket.createdAt.toISOString(),
      usedAt: ticket.usedAt?.toISOString(),
      qrCode: ticket.qrCode,
      type: 'event',
      title: event.title,
      venue: event.venue,
      selectedDate: ticket.session?.date.toISOString(),
      selectedTimeSlot: {
        start_time: ticket.session?.startTime,
        end_time: ticket.session?.endTime
      },
      amount: Number(ticket.amount),
      bookingId: ticket.bookingId,
      checkedIn: ticket.checkedIn,
      checkInTime: ticket.checkInTime?.toISOString(),
      checkInMethod: ticket.checkInMethod,
      checkedInBy: ticket.checkedInBy
    }));

    return NextResponse.json({
      success: true,
      event: mappedEvent,
      attendees: mappedTickets,
      tickets: mappedTickets, // Legacy aliases for same data
    });

  } catch (error: any) {
    console.error('Error fetching event from Postgres:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Prisma onDelete: Cascade will handle relations mostly, but to be safe we delete related records manually if needed
    // Actually Event model has Cascade on owner but not for bookings.
    // Let's delete bookings, sessions, and tickets first.
    await prisma.ticket.deleteMany({ where: { eventId } });
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.ticketType.deleteMany({ where: { session: { eventId } } });
    await prisma.session.deleteMany({ where: { eventId } });
    
    await prisma.event.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to delete event:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const { action, payload } = await request.json();

    if (action === 'CHECK_IN_ATTENDEE') {
      const { ticketId, checkInSessionId } = payload;
      
      const ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'USED',
          usedAt: new Date(),
        }
      });
      return NextResponse.json({ success: true, ticket }, { status: 200 });
    }
    
    if (action === 'UPDATE_SESSION_TICKET') {
      const { sessionId, ticketName, updates } = payload;
      
      // Find the ticket type by name and session
      const ticketTypes = await prisma.ticketType.findMany({
        where: { sessionId, name: ticketName }
      });
      
      if (ticketTypes.length > 0) {
        const tt = await prisma.ticketType.update({
          where: { id: ticketTypes[0].id },
          data: updates
        });
        return NextResponse.json({ success: true, ticketType: tt }, { status: 200 });
      }
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    }

    if (action === 'ADD_SESSION_TICKET') {
      const { sessionId, ticket } = payload;
      
      const newTicketType = await prisma.ticketType.create({
        data: {
          name: ticket.name,
          capacity: Number(ticket.capacity),
          price: Number(ticket.price),
          sessionId: sessionId
        }
      });
      return NextResponse.json({ success: true, ticketType: newTicketType }, { status: 200 });
    }

    if (action === 'DELETE_SESSION_TICKET') {
      const { sessionId, ticketName } = payload;
      
      const ticketTypes = await prisma.ticketType.findMany({
        where: { sessionId, name: ticketName }
      });
      
      if (ticketTypes.length > 0) {
        await prisma.ticketType.delete({
          where: { id: ticketTypes[0].id }
        });
        return NextResponse.json({ success: true }, { status: 200 });
      }
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    }

    if (action === 'UPDATE_SESSION') {
      const { sessionId, updates } = payload;
      
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: {
          name: updates.name,
          startTime: updates.start_time,
          endTime: updates.end_time,
          date: updates.date ? new Date(updates.date) : undefined
        }
      });
      return NextResponse.json({ success: true, session }, { status: 200 });
    }

    if (action === 'DELETE_SESSION') {
      const { sessionId } = payload;
      
      await prisma.ticketType.deleteMany({ where: { sessionId } });
      await prisma.session.delete({ where: { id: sessionId } });
      
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (action === 'ADD_SESSION') {
      const { session } = payload;
      
      const newSession = await prisma.session.create({
        data: {
          eventId: eventId,
          name: session.name,
          date: new Date(session.date),
          startTime: session.start_time,
          endTime: session.end_time,
          venue: session.venue,
        }
      });
      
      if (session.tickets && session.tickets.length > 0) {
        for (const t of session.tickets) {
          await prisma.ticketType.create({
            data: {
              name: t.name,
              capacity: Number(t.capacity),
              price: Number(t.price),
              sessionId: newSession.id
            }
          });
        }
      }
      return NextResponse.json({ success: true, session: newSession }, { status: 200 });
    }

    if (action === 'UPDATE_EVENT_DETAILS') {
      const { updates } = payload;
      
      const event = await prisma.event.update({
        where: { id: eventId },
        data: {
          title: updates.title,
          venue: updates.event_venue,
          about: updates.about_event,
          image: updates.event_image
        }
      });
      return NextResponse.json({ success: true, event }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error(`Failed to execute action:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
