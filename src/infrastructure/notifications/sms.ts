// Alternative SMS service without reCAPTCHA using Twilio
// This is a cleaner approach that many websites use

export interface SMSService {
  sendOTP: (phoneNumber: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (phoneNumber: string, code: string) => Promise<{ success: boolean; message: string; userId?: string }>;
}

// Mock SMS service for development (no actual SMS sent)
export class MockSMSService implements SMSService {
  
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in localStorage for development persistence
      const otpData = {
        code,
        timestamp: Date.now() + 5 * 60 * 1000 // 5 minutes
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`otp_${phoneNumber}`, JSON.stringify(otpData));
      }
      
      // Show OTP prominently in console AND alert
      console.log(`🔐 OTP for ${phoneNumber}: ${code}`);
      console.log(`📱 ENTER THIS CODE: ${code}`);
      
      // Also show in alert for immediate visibility
      if (typeof window !== 'undefined') {
        alert(`🔐 DEV MODE: Your OTP is ${code}\n\nEnter this code to login.`);
      }
      
      return {
        success: true,
        message: `OTP sent to ${phoneNumber}. Your OTP: ${code}`
      };
    } catch (error) {
      console.error('Error in sendOTP:', error);
      return {
        success: false,
        message: "Failed to generate OTP"
      };
    }
  }
  
  async verifyOTP(phoneNumber: string, code: string): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      let stored = null;
      
      // Get from localStorage
      if (typeof window !== 'undefined') {
        const storedData = localStorage.getItem(`otp_${phoneNumber}`);
        if (storedData) {
          stored = JSON.parse(storedData);
        }
      }
      
      if (!stored) {
        return { success: false, message: "No OTP found. Please request a new one." };
      }
      
      if (Date.now() > stored.timestamp) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`otp_${phoneNumber}`);
        }
        return { success: false, message: "OTP expired. Please request a new one." };
      }
      
      if (stored.code !== code) {
        console.log(`❌ OTP Mismatch: Expected ${stored.code}, Got ${code}`);
        return { success: false, message: `Invalid OTP. Expected: ${stored.code}` };
      }
      
      // Clean up
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`otp_${phoneNumber}`);
      }
      
      // Generate a mock user ID
      const userId = `user_${phoneNumber.replace(/[^\d]/g, '')}`;
      
      console.log(`✅ OTP Verified! User ID: ${userId}`);
      
      return {
        success: true,
        message: "OTP verified successfully!",
        userId
      };
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return {
        success: false,
        message: "Error verifying OTP"
      };
    }
  }
}

// Twilio SMS service (for production)
export class TwilioSMSService implements SMSService {
  private accountSid: string;
  private authToken: string;
  private serviceSid: string;
  
  constructor() {
    this.accountSid = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.serviceSid = process.env.NEXT_PUBLIC_TWILIO_VERIFY_SERVICE_SID || '';
  }
  
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/sms/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: "Failed to send OTP" };
    }
  }
  
  async verifyOTP(phoneNumber: string, code: string): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      const response = await fetch('/api/sms/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: "Failed to verify OTP" };
    }
  }
}

// Export the appropriate service based on environment
export const smsService: SMSService = process.env.NODE_ENV === 'production' 
  ? new TwilioSMSService() 
  : new MockSMSService(); 