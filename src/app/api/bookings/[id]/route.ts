import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        activity: true,
        session: true,
        tickets: {
          include: {
            ticketType: true,
          }
        }
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Format for legacy frontend compatibility where possible
    const formattedBooking = {
      id: booking.id,
      eventId: booking.eventId,
      activityId: booking.activityId,
      userId: booking.userId,
      name: booking.contactName,
      email: booking.contactEmail,
      phone: booking.contactPhone,
      selectedDate: booking.session ? booking.session.date.toISOString() : undefined,
      selectedTimeSlot: booking.session ? {
        start_time: booking.session.startTime,
        end_time: booking.session.endTime
      } : undefined,
      tickets: booking.tickets.reduce((acc, ticket) => {
        const typeName = ticket.ticketType?.name || 'General';
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalAmount: Number(booking.totalAmount),
      createdAt: booking.createdAt.toISOString(),
      status: booking.status,
    };

    return NextResponse.json({ 
      success: true, 
      booking: formattedBooking,
      type: booking.eventId ? 'event' : 'activity',
      eventDetails: booking.event ? {
        id: booking.event.id,
        title: booking.event.title,
        event_venue: booking.event.venue,
      } : undefined,
      activityDetails: booking.activity ? {
        id: booking.activity.id,
        name: booking.activity.name,
        location: booking.activity.location,
      } : undefined
    }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch booking:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
