import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { randomBytes } from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
} 