import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { admin } from '@/infrastructure/firebase/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (err) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { handle: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: user.name || '',
        username: user.handle?.value || '',
        bio: user.bio || '',
        phone: user.phone || '',
        email: user.email || '',
        contactEmail: user.email || '',
        photo: user.photo || '',
      }
    });

  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const emailValue = data.contactEmail === '' ? null : (data.contactEmail !== undefined ? data.contactEmail : undefined);
    const phoneValue = data.phone === '' ? null : (data.phone !== undefined ? data.phone : undefined);
    const createEmailValue = data.contactEmail || decodedToken.email || null;
    const createPhoneValue = data.phone || null;

    const user = await prisma.user.upsert({
      where: { firebaseUid: decodedToken.uid },
      update: {
        name: data.name !== undefined ? data.name : undefined,
        bio: data.bio !== undefined ? data.bio : undefined,
        phone: phoneValue,
        email: emailValue,
        photo: data.photo !== undefined ? data.photo : undefined,
      },
      create: {
        firebaseUid: decodedToken.uid,
        email: createEmailValue === '' ? null : createEmailValue,
        name: data.name || null,
        bio: data.bio || null,
        phone: createPhoneValue === '' ? null : createPhoneValue,
        photo: data.photo || null,
      }
    });

    if (data.username) {
      const username = data.username.toLowerCase();
      await prisma.handle.upsert({
        where: { value: username },
        update: { ownerType: 'USER', userId: user.id },
        create: { value: username, ownerType: 'USER', userId: user.id }
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
