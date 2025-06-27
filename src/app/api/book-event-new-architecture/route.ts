import { NextRequest, NextResponse } from 'next/server';
import { createBookingWithNewArchitecture } from '@/utils/newBookingFlow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      eventId, 
      sessionId, 
      userId, 
      userInfo, 
      selectedTickets, 
      totalAmount 
    } = body;

    // Validate required fields
    if (!eventId || !sessionId || !userId || !userInfo || !selectedTickets || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate user info
    if (!userInfo.name?.trim() || !userInfo.email?.trim() || !userInfo.phone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Complete user information is required' },
        { status: 400 }
      );
    }

    // Validate tickets
    if (Object.keys(selectedTickets).length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one ticket must be selected' },
        { status: 400 }
      );
    }

    console.log('🎯 Creating booking with new architecture:', {
      eventId,
      sessionId,
      userId,
      ticketsCount: Object.keys(selectedTickets).length,
      totalAmount
    });

    // 🎯 Transform data to match BookingData interface
    const ticketSelections = Object.entries(selectedTickets).map(([ticketName, quantity]) => ({
      ticketName,
      quantity: Number(quantity),
      unitPrice: totalAmount / Object.values(selectedTickets).reduce((sum: number, qty: any) => sum + Number(qty), 0) // Calculate average for now
    }));

    const bookingData = {
      eventId,
      sessionId,
      userId,
      attendeeInfo: {
        name: userInfo.name.trim(),
        email: userInfo.email.trim(),
        phone: userInfo.phone.trim()
      },
      ticketSelections,
      paymentData: {
        paymentId: `temp_${Date.now()}`, // Will be updated by payment processor
        totalAmount
      }
    };

    // 🚀 Use the new booking flow
    const result = await createBookingWithNewArchitecture(bookingData);

    console.log('✅ Booking created successfully:', result.attendeeIds?.length, 'attendees');
    
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: {
        attendeeIds: result.attendeeIds,
        totalTickets: result.totalTickets,
        sessionId: result.sessionId
      }
    });

  } catch (error) {
    console.error('💥 API Error in book-event-new-architecture:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 