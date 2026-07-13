import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';

/**
 * Maintenance endpoint to expire tickets for past events
 * This should be called by a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    // Add basic authentication/authorization here
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.MAINTENANCE_API_TOKEN;
    
    if (!expectedToken) {
      console.warn('MAINTENANCE_API_TOKEN not configured');
      return NextResponse.json(
        { error: 'Maintenance endpoint not configured' },
        { status: 503 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting ticket expiration maintenance job...');
    
    const now = new Date();
    // In Postgres, we can just update all ACTIVE tickets whose session is in the past
    // Or events that are in the past
    const result = await prisma.ticket.updateMany({
      where: {
        status: 'ACTIVE',
        session: {
          date: {
            lt: now
          }
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });
    
    console.log('Ticket expiration job completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Ticket expiration job completed',
      result: {
        ticketsExpired: result.count,
        errors: [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in ticket expiration job:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'operational',
    endpoint: 'ticket-expiration-maintenance',
    timestamp: new Date().toISOString()
  });
} 