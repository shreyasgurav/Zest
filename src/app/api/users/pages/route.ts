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
      include: { 
        pages: {
          include: { handle: true }
        } 
      }
    });

    if (!user) {
      console.log("GET /api/users/pages: user not found");
      return NextResponse.json({ pages: [] });
    }

    console.log("GET /api/users/pages: found user with pages", user.pages.length);
    console.log("Pages payload:", JSON.stringify(user.pages, null, 2));

    return NextResponse.json({
      success: true,
      pages: user.pages
    });

  } catch (error: any) {
    console.error('Error fetching user pages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, username, bio, location, phoneNumber, genre, address, capacity } = body;

    if (!type || !name || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if handle is available
    const existingHandle = await prisma.handle.findUnique({
      where: { value: username.toLowerCase() }
    });

    if (existingHandle) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const pageTypeEnum = type.toUpperCase() === 'ARTIST' ? 'ARTIST' 
                       : type.toUpperCase() === 'VENUE' ? 'VENUE' 
                       : 'ORGANISATION';
                       
    const handleOwnerTypeEnum = type.toUpperCase() === 'ARTIST' ? 'ARTIST' 
                       : type.toUpperCase() === 'VENUE' ? 'VENUE' 
                       : 'ORGANISATION';

    // Create the page and handle in a transaction
    const page = await prisma.$transaction(async (tx) => {
      const newPage = await tx.page.create({
        data: {
          type: pageTypeEnum,
          name,
          bio,
          city: location,
          address,
          capacity: capacity ? parseInt(capacity) : null,
          ownerId: user.id
        }
      });

      await tx.handle.create({
        data: {
          value: username.toLowerCase(),
          ownerType: handleOwnerTypeEnum,
          pageId: newPage.id
        }
      });

      return newPage;
    });

    return NextResponse.json({ success: true, page, username: username.toLowerCase() }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
