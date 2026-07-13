import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const creatorPageId = searchParams.get('creatorPageId');
    
    const whereClause: any = {};
    if (creatorPageId) {
      whereClause.creatorPageId = creatorPageId;
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limitParam,
      include: {
        owner: true
      }
    });

    // Map to frontend expected format
    const mappedActivities = activities.map(activity => ({
      id: activity.id,
      name: activity.name,
      activityName: activity.name, // legacy compat
      location: activity.location,
      activityLocation: activity.location, // legacy
      city: activity.city || '',
      about_activity: activity.about || '',
      aboutActivity: activity.about || '', // legacy
      activity_image: activity.image || '',
      organizationId: activity.owner.firebaseUid,
      hosting_organization: '',
      activity_categories: activity.categories,
      activity_category: activity.categories[0] || '', // legacy
      activity_languages: activity.languages || '',
      activity_duration: activity.duration || '',
      activity_age_limit: activity.ageLimit || '',
      price_per_slot: Number(activity.pricePerSlot),
      weekly_schedule: activity.weeklySchedule || [],
      closed_dates: activity.closedDates || [],
      createdAt: activity.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, activities: mappedActivities });
  } catch (error: any) {
    console.error('Failed to fetch activities from Postgres:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      name,
      location,
      city,
      about_activity,
      activity_image,
      organizationId,
      creator,
      activity_categories,
      price_per_slot,
      weekly_schedule,
      closed_dates,
    } = data;

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { firebaseUid: organizationId } });
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
       const page = await prisma.page.findUnique({ where: { id: creator.pageId } });
       if (page) {
         creatorPageId = page.id;
       }
    }

    const activity = await prisma.activity.create({
      data: {
        name: name || 'Untitled Activity',
        location: location || 'TBA',
        city: city || null,
        about: about_activity || '',
        image: activity_image || null,
        categories: activity_categories || [],
        pricePerSlot: parseFloat(price_per_slot) || 0,
        weeklySchedule: weekly_schedule || [],
        closedDates: closed_dates || [],
        ownerId: user.id,
        creatorPageId: creatorPageId,
      }
    });

    return NextResponse.json({ success: true, activityId: activity.id, activity }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create activity in Postgres:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
