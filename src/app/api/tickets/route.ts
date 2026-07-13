import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch all tickets for the user
    const tickets = await prisma.ticket.findMany({
      where: {
        booking: {
          userId: userId
        }
      },
      include: {
        event: true,
        activity: true,
        session: true,
        booking: true,
        ticketType: true,
      },
      orderBy: {
        booking: {
          createdAt: 'desc'
        }
      }
    });

    const formattedTickets = tickets.map(ticket => {
      const eventOrActivity = ticket.event || ticket.activity;
      
      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrCode: ticket.qrCode,
        type: ticket.eventId ? 'event' : 'activity',
        eventId: ticket.eventId,
        activityId: ticket.activityId,
        title: eventOrActivity ? ('title' in eventOrActivity ? eventOrActivity.title : (eventOrActivity as any).name) : 'Unknown',
        venue: eventOrActivity ? ('venue' in eventOrActivity ? eventOrActivity.venue : (eventOrActivity as any).location) : 'Unknown',
        selectedDate: ticket.session ? ticket.session.date.toISOString() : ticket.booking?.createdAt.toISOString(),
        selectedTimeSlot: ticket.session ? {
          start_time: ticket.session.startTime,
          end_time: ticket.session.endTime
        } : undefined,
        ticketType: ticket.ticketType?.name || 'General',
        status: ticket.status.toLowerCase(),
        userName: ticket.booking?.contactName || 'Unknown',
        amount: ticket.ticketType ? Number(ticket.ticketType.price) : 0,
        createdAt: ticket.booking?.createdAt.toISOString(),
        event_image: eventOrActivity?.image,
        totalTicketsInBooking: tickets.filter(t => t.bookingId === ticket.bookingId).length,
      };
    });

    return NextResponse.json({
      success: true,
      tickets: formattedTickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}