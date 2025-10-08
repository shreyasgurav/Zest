import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/infrastructure/firebase/firebase-admin';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Add simple rate limiting per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Timeout wrapper for Firebase operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if Firebase Admin is available
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database service not available' },
        { status: 503 }
      );
    }

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(clientIP)) {
      console.warn('Rate limit exceeded for IP:', clientIP);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get the user ID from the request
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    console.log('Tickets API called with params:', {
      userId: userId ? `${userId.substring(0, 8)}...` : null, // Log partial for privacy
      ip: clientIP,
      userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // Validate request parameters
    if (!userId) {
      console.error('Missing userId parameter');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate userId format with stricter checks
    if (typeof userId !== 'string' || 
        userId.trim().length === 0 || 
        userId.length > 128 || // Firebase UIDs are typically 28 chars, but allow some buffer
        /[<>\"'&]/.test(userId)) { // Block potential injection attempts
      console.error('Invalid userId format:', { 
        userId: userId ? `${userId.substring(0, 10)}...` : null,
        length: userId?.length,
        type: typeof userId 
      });
      return NextResponse.json(
        { error: 'Invalid User ID format' },
        { status: 400 }
      );
    }

    console.log('Fetching tickets for user:', `${userId.substring(0, 8)}...`);

    // Test Firebase connection with timeout
    try {
      await withTimeout(
        adminDb!.collection('tickets').limit(1).get(),
        5000 // 5 second timeout
      );
      console.log('Firebase connection test successful');
    } catch (firebaseError) {
      console.error('Firebase connection failed:', {
        error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        timeout: firebaseError instanceof Error && firebaseError.message.includes('timeout')
      });
      
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: 'Unable to connect to the database. Please try again later.'
        },
        { status: 503 } // Service Unavailable
      );
    }

    // Fetch user's tickets with timeout protection
    console.log('Executing Firestore query for userId:', `${userId.substring(0, 8)}...`);
    
    const ticketsSnapshot = await withTimeout(
      adminDb
        .collection('tickets')
        .where('userId', '==', userId)
        .limit(100) // Add limit to prevent huge queries
        .get(),
      10000 // 10 second timeout for the main query
    );
    
    console.log(`Firestore query completed. Found ${ticketsSnapshot.docs.length} documents`);
    
    // Process documents with error handling
    const tickets = [];
    const errors = [];
    
    for (const doc of ticketsSnapshot.docs) {
      try {
        const data = doc.data();
        
        // Validate document structure
        if (!data || typeof data !== 'object') {
          console.warn(`Invalid document structure for ticket ${doc.id}`);
          errors.push(`Invalid ticket data: ${doc.id}`);
          continue;
        }
        
        console.log(`Processing ticket document ${doc.id}:`, {
          hasTitle: !!data.title,
          hasUserId: !!data.userId,
          hasCreatedAt: !!data.createdAt,
          hasStatus: !!data.status,
          docSize: Object.keys(data).length
        });
        
        // Ensure required fields exist with defaults
        const ticket = {
          id: doc.id,
          ticketNumber: data.ticketNumber || `TICKET-${doc.id}`,
          qrCode: data.qrCode || data.ticketNumber || doc.id,
          type: data.type || 'event',
          eventId: data.eventId || undefined,
          activityId: data.activityId || undefined,
          title: data.title || 'Event/Activity',
          venue: data.venue || 'Venue TBD',
          selectedDate: data.selectedDate || new Date().toISOString().split('T')[0],
          selectedTimeSlot: data.selectedTimeSlot || {
            start_time: '00:00',
            end_time: '23:59'
          },
          ticketType: data.ticketType || undefined,
          status: data.status || 'active',
          userName: data.userName || 'User',
          amount: data.amount || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          usedAt: data.usedAt || undefined,
          ...data // Include any additional fields
        };
        
        tickets.push(ticket);
      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
        errors.push(`Failed to process ticket: ${doc.id}`);
      }
    }

    // Sort by createdAt descending with error handling
    try {
      tickets.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Descending order
      });
    } catch (sortError) {
      console.error('Error sorting tickets:', sortError);
      // Continue without sorting if there's an issue
    }

    const processingTime = Date.now() - startTime;
    console.log(`Successfully processed ${tickets.length} tickets for user in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      tickets,
      count: tickets.length,
      debug: {
        documentsFound: ticketsSnapshot.docs.length,
        processingTimeMs: processingTime,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('TICKETS API ERROR - Full details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack trace', // Limit stack trace length
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      isTimeout: error instanceof Error && error.message.includes('timeout'),
      isFirebaseError: error instanceof Error && error.message.includes('Firebase')
    });
    
    // Categorize the error
    let statusCode = 500;
    let errorMessage = 'Failed to fetch tickets';
    let errorDetails = 'An internal server error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
        errorMessage = 'Request timeout';
        errorDetails = 'The request took too long to process. Please try again.';
      } else if (error.message.includes('Firebase') || error.message.includes('Firestore')) {
        statusCode = 503; // Service Unavailable
        errorMessage = 'Database service unavailable';
        errorDetails = 'Database service is temporarily unavailable. Please try again later.';
      } else if (error.message.includes('Permission') || error.message.includes('Unauthorized')) {
        statusCode = 403; // Forbidden
        errorMessage = 'Access denied';
        errorDetails = 'You do not have permission to access these tickets.';
      }
    }
    
    const errorResponse = {
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      processingTimeMs: processingTime
    };
    
    // Include debug info only in development
    if (process.env.NODE_ENV === 'development') {
      (errorResponse as any).debug = {
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.substring(0, 200) : undefined
      };
    }
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
} 