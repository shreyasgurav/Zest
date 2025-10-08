# Razorpay Payment Gateway Setup

This guide will help you set up Razorpay payment gateway for your Zest application.

## Prerequisites

1. Create a Razorpay account at [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)
2. Generate API keys from your Razorpay dashboard

## Environment Variables Setup

Add the following environment variables to your `.env.local` file:

```env
# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Getting Your Razorpay Keys

1. Log in to your Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. Generate keys or use existing ones:
   - **Key ID** (starts with `rzp_test_` for test mode) → Use for `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - **Key Secret** → Use for `RAZORPAY_KEY_SECRET`

## Test vs Live Mode

- **Test Mode**: Use keys starting with `rzp_test_` for development and testing
- **Live Mode**: Use keys starting with `rzp_live_` for production

## Features Implemented

✅ **Event Booking Payment**
- Secure payment processing via Razorpay
- Payment verification with webhook signatures
- Automatic booking confirmation after successful payment
- Payment failure handling with retry options

✅ **Activity Booking Payment**
- Real-time capacity management
- Secure payment processing
- Automatic confirmation and capacity updates

✅ **Payment Confirmation**
- Detailed booking confirmation page
- Payment ID and transaction details
- Email notifications (if configured)

✅ **Error Handling**
- Payment failure page with retry options
- User-friendly error messages
- Automatic redirects based on payment status

## Security Features

- Server-side payment verification
- HMAC signature validation
- Secure API endpoints
- Environment variable protection

## Testing

You can test payments using Razorpay's test cards:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002

For more test cards, visit [Razorpay Test Cards](https://razorpay.com/docs/payments/test-card-upi-details/)

## Support

For issues related to:
- **Razorpay Integration**: Check [Razorpay Documentation](https://razorpay.com/docs/)
- **Implementation**: Refer to the code comments and error logs 