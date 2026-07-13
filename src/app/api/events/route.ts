import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      title,
      about_event,
      event_venue,
      event_image,
      event_categories,
      event_guides,
      organizationId,
      creator,
      sessions,
    } = data;

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
    }

    // Upsert the default/system user if it doesn't exist, or use the provided organizationId
    let user = await prisma.user.findUnique({ where: { firebaseUid: organizationId } });
    
    // Fallback just in case user hasn't fully synced yet
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: organizationId,
          email: 'auto-created@zest.dev',
          name: 'Auto Created Organizer'
        }
      });
    }

    let creatorPageId = null;
    if (creator && creator.type !== 'user' && creator.pageId) {
       // Lookup the creator page if it exists in Postgres
       const page = await prisma.page.findUnique({ where: { id: creator.pageId } });
       if (page) {
         creatorPageId = page.id;
       }
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        title: title || 'Untitled Event',
        about: about_event || '',
        venue: event_venue || 'TBA',
        image: event_image || null,
        categories: event_categories || [],
        guides: event_guides || {},
        ownerId: user.id,
        creatorPageId: creatorPageId,
        sessions: {
          create: (sessions || []).map((s: any) => ({
            name: s.name || 'Main Session',
            date: new Date(s.date),
            startTime: s.start_time || '00:00',
            endTime: s.end_time || '23:59',
            venue: s.venue || event_venue || 'TBA',
            ticketTypes: {
              create: (s.tickets || []).map((t: any) => ({
                name: t.name,
                price: parseFloat(t.price) || 0,
                capacity: parseInt(t.capacity) || 0,
              }))
            }
          }))
        }
      },
      include: {
        sessions: {
          include: {
            ticketTypes: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, eventId: event.id, event }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create event in Postgres:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const creatorPageId = searchParams.get('creatorPageId');
    
    const whereClause: any = { status: 'ACTIVE' };
    if (creatorPageId) {
      whereClause.creatorPageId = creatorPageId;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limitParam,
      include: {
        sessions: {
          include: { ticketTypes: true }
        },
        owner: true
      }
    });

    // Map to frontend expected format
    const mappedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      eventTitle: event.title, // legacy compat
      event_image: event.image || '',
      eventImage: event.image || '', // legacy compat
      event_venue: event.venue || '',
      eventVenue: event.venue || '', // legacy compat
      architecture: 'session-centric',
      categories: event.categories,
      event_categories: event.categories,
      organizationId: event.owner.firebaseUid,
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
      time_slots: event.sessions.map(session => ({
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
    }));

    return NextResponse.json({ success: true, events: mappedEvents });
  } catch (error: any) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

