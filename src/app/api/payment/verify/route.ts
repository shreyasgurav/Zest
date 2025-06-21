import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { createTicketsForBooking } from '@/utils/ticketGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingData,
      bookingType,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Payment is verified, save booking to database
    try {
      console.log('Payment verified successfully, attempting to save booking...');
      console.log('Booking type:', bookingType);
      console.log('Booking data:', JSON.stringify(bookingData, null, 2));

      const currentTime = new Date().toISOString();
      const finalBookingData = {
        ...bookingData,
        paymentStatus: 'completed',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        paymentSignature: razorpay_signature,
        status: 'confirmed',
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      console.log('Final booking data to be saved:', JSON.stringify(finalBookingData, null, 2));

      let bookingId;
      if (bookingType === 'event') {
        console.log('Saving event booking to eventAttendees collection');
        
        // Validate required fields for event booking
        if (!bookingData.eventId) {
          throw new Error('Event ID is required for event booking');
        }
        
        const docRef = await adminDb.collection('eventAttendees').add(finalBookingData);
        bookingId = docRef.id;
        console.log('Event booking saved successfully with ID:', bookingId);
      } else if (bookingType === 'activity') {
        console.log('Saving activity booking to activity_bookings collection');
        
        // Validate required fields for activity booking
        if (!bookingData.activityId) {
          throw new Error('Activity ID is required for activity booking');
        }
        
        const docRef = await adminDb.collection('activity_bookings').add(finalBookingData);
        bookingId = docRef.id;
        console.log('Activity booking saved successfully with ID:', bookingId);

        // Update activity capacity for activity bookings
        if (bookingData.activityId && bookingData.selectedDate && bookingData.selectedTimeSlot && bookingData.tickets) {
          try {
            console.log('Updating activity capacity...');
            const activityRef = adminDb.collection('activities').doc(bookingData.activityId);
            const activityDoc = await activityRef.get();
            
            if (activityDoc.exists) {
              const activityData = activityDoc.data();
              const selectedDate = new Date(bookingData.selectedDate);
              const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
              
              const updatedTimeSlots = activityData?.weekly_schedule.map((day: any) => {
                if (day.day === dayOfWeek) {
                  return {
                    ...day,
                    time_slots: day.time_slots.map((slot: any) => {
                      if (slot.start_time === bookingData.selectedTimeSlot.start_time && 
                          slot.end_time === bookingData.selectedTimeSlot.end_time) {
                        return {
                          ...slot,
                          available_capacity: Math.max(0, slot.available_capacity - (bookingData.tickets as number))
                        };
                      }
                      return slot;
                    })
                  };
                }
                return day;
              });

              await activityRef.update({
                weekly_schedule: updatedTimeSlots
              });
              console.log('Activity capacity updated successfully');
            } else {
              console.warn('Activity document not found for ID:', bookingData.activityId);
            }
          } catch (capacityError) {
            console.error('Error updating activity capacity:', capacityError);
            // Don't fail the booking if capacity update fails
          }
        }
      } else {
        throw new Error(`Invalid booking type: ${bookingType}`);
      }

      console.log('Booking saved successfully with ID:', bookingId);
      
      // Create tickets for the booking
      try {
        console.log('Creating tickets for booking...');
        const ticketIds = await createTicketsForBooking(
          finalBookingData,
          bookingId,
          bookingType
        );
        console.log(`Successfully created ${ticketIds.length} tickets:`, ticketIds);
        
        return NextResponse.json({
          success: true,
          bookingId,
          ticketIds,
          message: 'Payment verified, booking confirmed, and tickets created',
        });
      } catch (ticketError) {
        console.error('Error creating tickets:', ticketError);
        // Don't fail the booking if ticket creation fails, but log it
        return NextResponse.json({
          success: true,
          bookingId,
          message: 'Payment verified and booking confirmed (tickets creation pending)',
          warning: 'Tickets could not be created immediately but booking is confirmed',
        });
      }
    } catch (dbError) {
      console.error('Error saving booking to database:', dbError);
      console.error('Error type:', typeof dbError);
      console.error('Error name:', dbError instanceof Error ? dbError.name : 'Unknown');
      console.error('Error message:', dbError instanceof Error ? dbError.message : String(dbError));
      console.error('Error stack:', dbError instanceof Error ? dbError.stack : 'No stack trace');
      console.error('Booking data that failed:', JSON.stringify(bookingData, null, 2));
      console.error('Booking type:', bookingType);
      
      // Return more specific error information
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return NextResponse.json(
        { 
          error: 'Payment verified but failed to save booking',
          details: errorMessage,
          debugInfo: {
            bookingType,
            hasEventId: !!bookingData.eventId,
            hasActivityId: !!bookingData.activityId,
            hasUserId: !!bookingData.userId,
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { 
        error: 'Payment verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 