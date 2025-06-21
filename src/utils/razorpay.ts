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

export const verifyPayment = async (
  paymentResponse: RazorpayResponse,
  bookingData: BookingData,
  bookingType: 'event' | 'activity'
) => {
  try {
    const response = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        bookingData,
        bookingType,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Payment verification failed');
    }

    return data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

export const initiateRazorpayPayment = async (
  paymentOptions: PaymentOptions,
  bookingData: BookingData,
  bookingType: 'event' | 'activity',
  onSuccess: (bookingId: string) => void,
  onError: (error: string) => void
) => {
  try {
    // Load Razorpay script
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      throw new Error('Failed to load Razorpay script');
    }

    // Create order
    const order = await createRazorpayOrder(paymentOptions);

    // Configure Razorpay options
    const options: RazorpayOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: order.amount,
      currency: order.currency,
      name: 'Zest',
      description: bookingType === 'event' ? 'Event Booking' : 'Activity Booking',
      order_id: order.id,
      handler: async (response: RazorpayResponse) => {
        try {
          const verificationResult = await verifyPayment(response, bookingData, bookingType);
          onSuccess(verificationResult.bookingId);
        } catch (error) {
          console.error('Payment verification failed:', error);
          onError(error instanceof Error ? error.message : 'Payment verification failed');
        }
      },
      prefill: {
        name: bookingData.name,
        email: bookingData.email,
        contact: bookingData.phone,
      },
      theme: {
        color: '#c084fc',
      },
      modal: {
        ondismiss: () => {
          onError('Payment cancelled by user');
        },
      },
    };

    // Open Razorpay checkout
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Error initiating payment:', error);
    onError(error instanceof Error ? error.message : 'Failed to initiate payment');
  }
}; 