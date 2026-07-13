declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentOptions {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: any;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface BookingData {
  eventId?: string;
  activityId?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  selectedDate: string;
  selectedTimeSlot: any;
  selectedSession?: any;
  tickets: any;
  totalAmount: number;
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const createRazorpayOrder = async (paymentOptions: PaymentOptions) => {
  try {
    const response = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentOptions),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create order');
    }

    return data.order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

// NOTE: Booking persistence now happens against Postgres via the booking API
// routes (/api/bookings and /api/bookings/activity), called directly from the
// booking pages after Razorpay returns. The legacy Firestore verify flow has
// been removed. 