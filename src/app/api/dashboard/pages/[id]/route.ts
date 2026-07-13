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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = await prisma.page.findUnique({
      where: { id: params.id },
      include: { handle: true, owner: true }
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Map to legacy frontend schema
    const mappedPage = {
      uid: page.id,
      name: page.name,
      username: page.handle?.value || '',
      bio: page.bio || '',
      photoURL: page.photo || '',
      location: page.city || '',
      address: page.address || '',
      capacity: page.capacity || null,
      type: page.type,
      ownerId: page.owner.firebaseUid,
    };

    return NextResponse.json({ success: true, page: mappedPage });
  } catch (error: any) {
    console.error('Error fetching page by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid: decodedToken.uid } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const existingPage = await prisma.page.findUnique({
      where: { id: params.id },
      include: { handle: true }
    });

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (existingPage.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the handle if username changed
    if (body.username && body.username.toLowerCase() !== existingPage.handle?.value) {
      // Check if handle is taken
      const existingHandle = await prisma.handle.findUnique({
        where: { value: body.username.toLowerCase() }
      });
      if (existingHandle) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }

      if (existingPage.handle) {
        await prisma.handle.update({
          where: { id: existingPage.handle.id },
          data: { value: body.username.toLowerCase() }
        });
      } else {
        await prisma.handle.create({
          data: {
            value: body.username.toLowerCase(),
            ownerType: existingPage.type as any,
            pageId: existingPage.id
          }
        });
      }
    }

    // Update the page
    const updatedPage = await prisma.page.update({
      where: { id: existingPage.id },
      data: {
        name: body.name || undefined,
        bio: body.bio || undefined,
        photo: body.photoURL || undefined,
        city: body.location || undefined,
        address: body.address || undefined,
        capacity: body.capacity ? parseInt(body.capacity, 10) : undefined,
      },
      include: { handle: true, owner: true }
    });

    const mappedPage = {
      uid: updatedPage.id,
      name: updatedPage.name,
      username: updatedPage.handle?.value || '',
      bio: updatedPage.bio || '',
      photoURL: updatedPage.photo || '',
      location: updatedPage.city || '',
      address: updatedPage.address || '',
      capacity: updatedPage.capacity || null,
      type: updatedPage.type,
      ownerId: updatedPage.owner.firebaseUid,
    };

    return NextResponse.json({ success: true, page: mappedPage });
  } catch (error: any) {
    console.error('Error updating page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
