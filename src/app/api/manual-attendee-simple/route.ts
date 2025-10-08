import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/infrastructure/firebase/firebase-admin';

interface SimpleManualAttendeeRequest {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  quantity: number;
  hostUserId: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Simple manual attendee API called');
    
    const body: SimpleManualAttendeeRequest = await request.json();
    console.log('Request body:', body);
    
    const { eventId, name, email, phone, ticketType, quantity = 1, hostUserId } = body;

    // Basic validation
    if (!eventId || !name || !email || !phone || !ticketType || !hostUserId) {
      console.log('Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if event exists
    console.log('Checking if event exists...');
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      console.log('Event not found');
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.log('Event found, processing...');
    const eventData = eventDoc.data();
    
    // Simple authorization check
    const isOwner = eventData?.organizationId === hostUserId || eventData?.creator?.userId === hostUserId;
    if (!isOwner) {
      console.log('Authorization failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('Authorization passed, creating attendee...');
    
    // Create a simple attendee record (no transaction for now)
    const attendeeId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentTime = new Date().toISOString();
    
    const attendeeData = {
      id: attendeeId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      eventId,
      ticketType,
      quantity,
      addedManually: true,
      addedBy: hostUserId,
      addedAt: currentTime,
      status: 'confirmed',
      checkedIn: false
    };

    console.log('Saving attendee to database...');
    await adminDb.collection('eventAttendees').doc(attendeeId).set(attendeeData);
    
    console.log('Attendee created successfully');
    
    return NextResponse.json({
      success: true,
      attendeeId,
      message: `Successfully added ${name} with ${quantity} ticket(s)`
    });

  } catch (error) {
    console.error('Error in simple manual attendee API:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack') : undefined
    }, { status: 500 });
  }
} 