import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const syncSchema = z.object({
  firebaseUid: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Upsert user into Postgres based on firebaseUid
    const user = await prisma.user.upsert({
      where: { firebaseUid: data.firebaseUid },
      update: {
        email: data.email || undefined,
        phone: data.phone || undefined,
        name: data.name || undefined,
        photo: data.photo || undefined,
      },
      create: {
        firebaseUid: data.firebaseUid,
        email: data.email || null,
        phone: data.phone || null,
        name: data.name || null,
        photo: data.photo || null,
      },
    });

    // Link existing unlinked tickets if the user has a phone number
    if (data.phone) {
      await prisma.ticket.updateMany({
        where: {
          attendeePhone: data.phone,
          userId: null
        },
        data: {
          userId: user.id
        }
      });
    }

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    console.error('User sync failed:', error);
    return NextResponse.json({ error: 'User sync failed' }, { status: 500 });
  }
}
