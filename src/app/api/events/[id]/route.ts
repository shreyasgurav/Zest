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
        sessions: {
          include: {
            ticketTypes: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
        creatorPage: {
          include: { handle: true }
        },
        owner: true
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Map to the frontend EventData structure
    const mappedEvent = {
      id: event.id,
      title: event.title,
      eventTitle: event.title,
      event_image: event.image || '',
      eventImage: event.image || '',
      event_venue: event.venue || '',
      eventVenue: event.venue || '',
      architecture: 'session-centric',
      about_event: event.about || '',
      aboutEvent: event.about || '',
      event_categories: event.categories || [],
      eventCategories: event.categories || [],
      event_guides: event.guides || {},
      eventGuides: event.guides || {},
      event_duration: '', // Add mapping if applicable
      event_languages: '', // Add mapping if applicable
      event_age_limit: '', // Add mapping if applicable
      creator: event.creatorPage ? {
        name: event.creatorPage.name,
        username: event.creatorPage.handle?.value || '',
        type: event.creatorPage.type.toLowerCase(),
        pageId: event.creatorPage.id
      } : null,
      sessions: event.sessions.map((session) => ({
        id: session.id,
        name: session.name,
        date: session.date.toISOString(),
        start_time: session.startTime,
        end_time: session.endTime,
        venue: session.venue || event.venue,
        available: true,
        tickets: session.ticketTypes.map((tt) => ({
          id: tt.id,
          name: tt.name,
          capacity: tt.capacity,
          price: Number(tt.price),
          available_capacity: Math.max(0, tt.capacity - tt.soldCount),
        })),
      })),
      time_slots: event.sessions.map((session) => ({
        date: session.date.toISOString(),
        start_time: session.startTime,
        end_time: session.endTime,
        available: true,
        session_id: session.id
      })),
      tickets: event.sessions.length > 0 ? event.sessions[0].ticketTypes.map((tt) => ({
          id: tt.id,
          name: tt.name,
          capacity: tt.capacity,
          price: Number(tt.price),
          available_capacity: Math.max(0, tt.capacity - tt.soldCount),
      })) : [],
    };

    return NextResponse.json({ success: true, event: mappedEvent }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch event details for booking:`, error);
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

    const data = await request.json();

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        venue: data.event_venue !== undefined ? data.event_venue : undefined,
        about: data.about_event !== undefined ? data.about_event : undefined,
        image: data.event_image !== undefined ? data.event_image : undefined,
        categories: data.event_categories !== undefined ? data.event_categories : undefined,
        guides: data.event_guides !== undefined ? data.event_guides : undefined,
      }
    });

    return NextResponse.json({ success: true, event }, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to update event details:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
