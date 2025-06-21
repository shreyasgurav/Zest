import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Get the user ID from the request
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching tickets for user:', userId);

    // Fetch user's tickets from Firestore using Admin SDK
    // Using simple where query to avoid index requirements
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('userId', '==', userId)
      .get();
    
    // Convert to array and sort in memory
    let tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdAt descending in memory
    tickets.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Descending order
    });

    console.log(`Found ${tickets.length} tickets for user ${userId}`);

    return NextResponse.json({
      success: true,
      tickets,
      count: tickets.length
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 