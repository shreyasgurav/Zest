import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    
    if (query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results = [];

    // Search events
    const events = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { venue: { contains: query, mode: 'insensitive' } },
          { about: { contains: query, mode: 'insensitive' } },
        ]
      },
      take: 15,
      include: { sessions: true }
    });

    for (const event of events) {
      results.push({
        id: event.id,
        type: 'event',
        title: event.title,
        description: event.about || '',
        location: event.venue || '',
        organizationName: '',
        image: event.image || '',
        date: event.sessions.length > 0 ? event.sessions[0].date.toISOString() : ''
      });
    }

    // Search pages (Artists, Organisations, Venues)
    const pages = await prisma.page.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { handle: true },
      take: 15
    });

    for (const page of pages) {
      if (page.handle) {
        results.push({
          id: page.id,
          type: page.type.toLowerCase(), // 'artist', 'organisation', 'venue'
          title: page.name,
          description: page.bio || '',
          image: page.photo || '',
          username: page.handle.value
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error in search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
