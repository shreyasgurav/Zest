import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { randomBytes } from 'crypto';

// Initialize Razorpay only when environment variables are available
const getRazorpayInstance = () => {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export async function POST(request: NextRequest) {
  try {
    // Check if Razorpay is properly configured
    const razorpay = getRazorpayInstance();
    
    const body = await request.json();
    const { amount, currency = 'INR', receipt, notes } = body;

    // Enhanced validation
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 1000000) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number less than ₹10,00,000' },
        { status: 400 }
      );
    }

    // Validate currency
    if (currency !== 'INR') {
      return NextResponse.json(
        { error: 'Only INR currency is supported' },
        { status: 400 }
      );
    }

    // Validate notes if provided
    if (notes && typeof notes !== 'object') {
      return NextResponse.json(
        { error: 'Notes must be an object' },
        { status: 400 }
      );
    }

    // Generate secure receipt if not provided
    const secureReceipt = receipt || `ZST_${Date.now()}_${randomBytes(4).toString('hex')}`;
    
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in smallest currency unit (paise)
      currency,
      receipt: secureReceipt,
      notes: notes || {},
    };

    console.log('Creating Razorpay order', {
      amount: options.amount,
      currency: options.currency,
      receipt: secureReceipt,
      timestamp: new Date().toISOString()
    });

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created successfully', {
      orderId: order.id,
      amount: order.amount,
      receipt: order.receipt
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    // Handle specific Razorpay configuration errors
    if (error instanceof Error && error.message.includes('Razorpay credentials not configured')) {
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
} 