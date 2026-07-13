import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username.toLowerCase();

    // The legacy database had separate collections for Artists, Organisations, Venues
    // and they all used `username` field.
    // In Postgres, we consolidated them into `Page` + `Handle`.
    // Wait, the migration script hasn't migrated Pages yet!
    // But we are migrating the frontend first and relying on the new schema.
    
    let handle = await prisma.handle.findUnique({
      where: { value: username },
      include: {
        page: {
          include: {
            owner: true,
            events: {
              where: { status: 'ACTIVE' }
            },
            activities: true
          }
        }
      }
    });

    if (!handle || !handle.page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const page = handle.page;

    // Map to legacy frontend schema
    const mappedPage = {
      uid: page.id,
      name: page.name,
      username: handle.value,
      bio: page.bio || '',
      photoUrl: page.photo || '',
      profileImageUrl: page.photo || '',
      location: page.city || '',
      address: page.address || '',
      capacity: page.capacity || null,
      type: page.type.toLowerCase(),
      ownerId: page.owner.firebaseUid,
    };

    // Map events
    const ownedEvents = page.events.map(event => ({
      id: event.id,
      title: event.title,
      event_image: event.image || '',
      event_venue: event.venue || '',
      createdAt: event.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      page: mappedPage,
      events: ownedEvents,
      collaboratedEvents: [] // Will be fetched from collaborations if migrated
    });

  } catch (error: any) {
    console.error('Error fetching page from Postgres:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
