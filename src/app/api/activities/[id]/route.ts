import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        owner: true,
        slots: {
          include: {
            bookings: true
          }
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] }
          },
          include: {
            activitySlot: true
          }
        }
      }
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const mappedActivity = {
      id: activity.id,
      name: activity.name,
      activityName: activity.name,
      location: activity.location,
      activityLocation: activity.location,
      city: activity.city || '',
      about_activity: activity.about || '',
      aboutActivity: activity.about || '',
      activity_image: activity.image || '',
      organizationId: activity.owner.firebaseUid,
      hosting_organization: '',
      activity_categories: activity.categories,
      activity_category: activity.categories[0] || '',
      activity_languages: activity.languages || '',
      activity_duration: activity.duration || '',
      activity_age_limit: activity.ageLimit || '',
      price_per_slot: Number(activity.pricePerSlot),
      weekly_schedule: activity.weeklySchedule || [],
      closed_dates: activity.closedDates || [],
      createdAt: activity.createdAt.toISOString(),
    };

    // Map bookings for the frontend to calculate real-time availability
    const mappedBookings = activity.bookings.map(b => ({
      id: b.id,
      activityId: activity.id,
      name: b.contactName,
      email: b.contactEmail,
      phone: b.contactPhone,
      selectedDate: b.activitySlot?.date || '',
      selectedTimeSlot: {
        start_time: b.activitySlot?.startTime || '',
        end_time: b.activitySlot?.endTime || ''
      },
      // Since booking doesn't store ticket count directly at the top level for activities,
      // we'd normally calculate this from the tickets relation. But to match the legacy format:
      tickets: b.totalAmount ? Math.round(Number(b.totalAmount) / Number(activity.pricePerSlot)) : 0,
      createdAt: b.id.slice(0, 8) // Mock timestamp since createdAt might be missing from Booking mapping, or just use current time string
    }));

    // If slots are explicitly materialized in Postgres, we can also return them, 
    // but the frontend calculation in book-activity handles the logic dynamically.
    
    return NextResponse.json({
      success: true,
      activity: mappedActivity,
      bookings: mappedBookings
    });

  } catch (error: any) {
    console.error('Error fetching activity from Postgres:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const data = await request.json();

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        location: data.location !== undefined ? data.location : undefined,
        about: data.about_activity !== undefined ? data.about_activity : undefined,
        image: data.activity_image !== undefined ? data.activity_image : undefined,
        categories: data.activity_categories !== undefined ? data.activity_categories : undefined,
        languages: data.activity_languages !== undefined ? data.activity_languages : undefined,
        duration: data.activity_duration !== undefined ? data.activity_duration : undefined,
        ageLimit: data.activity_age_limit !== undefined ? data.activity_age_limit : undefined,
        weeklySchedule: data.weekly_schedule !== undefined ? data.weekly_schedule : undefined,
        closedDates: data.closed_dates !== undefined ? data.closed_dates : undefined,
      }
    });

    return NextResponse.json({ success: true, activity }, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to update activity details:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

