import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createBooking, InsufficientCapacityError } from '@/domains/bookings/services/booking.service';
import { rateLimit } from '@/infrastructure/redis/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bookingSchema = z.object({
  userId: z.string().min(1),
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
  }),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().positive().max(50),
      })
    )
    .min(1),
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
    const parsed = bookingSchema.safeParse(body);

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

    const result = await createBooking({
      userId: data.userId,
      eventId: data.eventId,
      sessionId: data.sessionId,
      contact: data.contact,
      items: data.items,
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
    console.error('Booking failed:', error);
    return NextResponse.json({ error: 'Booking failed' }, { status: 500 });
  }
}
