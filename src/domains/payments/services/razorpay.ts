declare global {
  interface Window {
    Razorpay: any;
  }
}

// Add global payment processing lock
let isPaymentProcessing = false;
let processedPayments = new Set<string>();

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

export const verifyPayment = async (
  paymentResponse: RazorpayResponse,
  bookingData: BookingData,
  bookingType: 'event' | 'activity'
) => {
  try {
    // Check if this specific payment is already being processed
    const paymentKey = `${paymentResponse.razorpay_payment_id}_${paymentResponse.razorpay_order_id}`;
    
    if (processedPayments.has(paymentKey)) {
      console.warn('Payment already processed in this session:', paymentKey);
      throw new Error('Payment verification already in progress');
    }

    // Mark payment as being processed
    processedPayments.add(paymentKey);

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
      // Remove from processed set if verification failed (allow retry for genuine failures)
      if (response.status !== 409) { // Don't retry if it's a duplicate
        processedPayments.delete(paymentKey);
      }
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
    // Prevent multiple simultaneous payment initiations
    if (isPaymentProcessing) {
      console.warn('Payment already in progress');
      onError('Payment already in progress. Please wait.');
      return;
    }

    isPaymentProcessing = true;

    // Load Razorpay script
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      isPaymentProcessing = false;
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
          console.log('Payment handler called with response:', response);
          const verificationResult = await verifyPayment(response, bookingData, bookingType);
          
          // Reset the processing flag only after successful verification
          isPaymentProcessing = false;
          onSuccess(verificationResult.bookingId);
        } catch (error) {
          console.error('Payment verification failed:', error);
          isPaymentProcessing = false;
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
          isPaymentProcessing = false;
          onError('Payment cancelled by user');
        },
      },
    };

    // Open Razorpay checkout
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Error initiating payment:', error);
    isPaymentProcessing = false;
    onError(error instanceof Error ? error.message : 'Failed to initiate payment');
  }
}; 