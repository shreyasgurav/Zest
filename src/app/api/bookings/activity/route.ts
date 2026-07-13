import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createActivityBooking, InsufficientCapacityError } from '@/domains/bookings/services/booking.service';
import { rateLimit } from '@/infrastructure/redis/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const activityBookingSchema = z.object({
  userId: z.string().min(1),
  activityId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  quantity: z.number().int().positive().max(50),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
  }),
  payment: z
    .object({
      method: z.enum(['RAZORPAY', 'MANUAL', 'FREE']).optional(),
      razorpayOrderId: z.string().optional(),
      razorpayPaymentId: z.string().optional(),
      razorpaySignature: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = activityBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Rate limit per user: max 10 booking attempts per minute.
    const rl = await rateLimit(`booking:${data.userId}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please slow down.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.resetSeconds),
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
          },
        }
      );
    }

    const result = await createActivityBooking({
      userId: data.userId,
      activityId: data.activityId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      quantity: data.quantity,
      contact: data.contact,
      payment: data.payment as any,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientCapacityError) {
      return NextResponse.json(
        { error: 'Sold out', message: error.message },
        { status: 409 }
      );
    }
    console.error('Activity booking failed:', error);
    return NextResponse.json({ error: 'Booking failed' }, { status: 500 });
  }
}
