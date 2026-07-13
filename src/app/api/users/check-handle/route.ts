import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const handleValue = searchParams.get('handle');

    if (!handleValue) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    const handle = await prisma.handle.findUnique({
      where: { value: handleValue.toLowerCase() },
      include: { page: true }
    });

    if (!handle) {
      return NextResponse.json({ available: true });
    }

    // Determine what type of entity owns the handle for the error message
    let takenBy = 'someone else';
    if (handle.ownerType === 'USER') takenBy = 'user';
    else if (handle.ownerType === 'ARTIST') takenBy = 'artist';
    else if (handle.ownerType === 'ORGANISATION') takenBy = 'organisation';
    else if (handle.ownerType === 'VENUE') takenBy = 'venue';

    return NextResponse.json({ 
      available: false, 
      takenBy
    });

  } catch (error: any) {
    console.error('Error checking handle availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
