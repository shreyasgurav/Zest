/**
 * Enhanced Security Module for Production-Level Security
 * This module provides additional security measures for the booking system
 */

import { NextRequest } from 'next/server';
import { adminDb } from '@/infrastructure/firebase/firebase-admin';
import { logSecurityEvent } from './securityMonitoring';
import { db } from '@/infrastructure/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as crypto from 'crypto';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
const suspiciousIPs = new Set<string>();

// Enhanced Security Constants
const SECURITY_CONFIG = {
  encryption: {
    algorithm: 'aes-256-cbc',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    iterations: 100000,
    digest: 'sha512'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  ipBlocking: {
    maxFailedAttempts: 5,
    blockDuration: 30 * 60 * 1000 // 30 minutes
  },
  audit: {
    retentionDays: 90,
    alertThreshold: 10
  }
};

// IP blocking store (should be replaced with Redis in production)
const ipBlockList = new Map<string, { count: number; blockedUntil: number }>();

export interface SecurityConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxFailedAttemptsBeforeBlock: number;
  blockDurationMinutes: number;
  suspiciousActivityThreshold: number;
}

export const defaultSecurityConfig: SecurityConfig = {
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 500,
  maxFailedAttemptsBeforeBlock: 5,
  blockDurationMinutes: 15,
  suspiciousActivityThreshold: 10
};

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  action?: 'block' | 'warn' | 'monitor';
  remainingRequests?: number;
}

/**
 * Enhanced rate limiting with IP tracking and progressive penalties
 */
export function enhancedRateLimit(
  identifier: string,
  config: SecurityConfig = defaultSecurityConfig
): SecurityCheckResult {
  const now = Date.now();
  const minuteKey = `${identifier}:minute:${Math.floor(now / 60000)}`;
  const hourKey = `${identifier}:hour:${Math.floor(now / 3600000)}`;
  const failureKey = `${identifier}:failures`;

  // Check if currently blocked
  const failureData = rateLimitStore.get(failureKey);
  if (failureData?.blockedUntil && now < failureData.blockedUntil) {
    return {
      allowed: false,
      reason: 'IP temporarily blocked due to suspicious activity',
      action: 'block'
    };
  }

  // Check minute limit
  const minuteData = rateLimitStore.get(minuteKey);
  if (minuteData && minuteData.count >= config.maxRequestsPerMinute) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded - too many requests per minute',
      action: 'block'
    };
  }

  // Check hour limit
  const hourData = rateLimitStore.get(hourKey);
  if (hourData && hourData.count >= config.maxRequestsPerHour) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded - too many requests per hour',
      action: 'block'
    };
  }

  // Update counters
  rateLimitStore.set(minuteKey, {
    count: (minuteData?.count || 0) + 1,
    resetTime: now + 60000
  });

  rateLimitStore.set(hourKey, {
    count: (hourData?.count || 0) + 1,
    resetTime: now + 3600000
  });

  // Calculate remaining requests
  const remainingMinute = config.maxRequestsPerMinute - ((minuteData?.count || 0) + 1);
  const remainingHour = config.maxRequestsPerHour - ((hourData?.count || 0) + 1);

  return {
    allowed: true,
    remainingRequests: Math.min(remainingMinute, remainingHour)
  };
}

/**
 * Record security failure and implement progressive blocking
 */
export function recordSecurityFailure(
  identifier: string,
  failureType: string,
  config: SecurityConfig = defaultSecurityConfig
): void {
  const now = Date.now();
  const failureKey = `${identifier}:failures`;
  
  const failureData = rateLimitStore.get(failureKey) || { count: 0, resetTime: now + 3600000 };
  
  // Reset if past the reset time
  if (now > failureData.resetTime) {
    failureData.count = 0;
    failureData.resetTime = now + 3600000;
  }
  
  failureData.count += 1;
  
  // Block if too many failures
  if (failureData.count >= config.maxFailedAttemptsBeforeBlock) {
    failureData.blockedUntil = now + (config.blockDurationMinutes * 60000);
    suspiciousIPs.add(identifier);
    
    // Log critical security event
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      userId: 'unknown',
      timestamp: new Date().toISOString(),
      details: {
        identifier,
        failureType,
        failureCount: failureData.count,
        blockedUntil: new Date(failureData.blockedUntil).toISOString()
      },
      severity: 'critical'
    });
  }
  
  rateLimitStore.set(failureKey, failureData);
}

/**
 * Extract client identifier from request
 */
export function getClientIdentifier(request: NextRequest): string {
  // Priority order: x-forwarded-for, x-real-ip, connection remote address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddress = request.headers.get('x-vercel-forwarded-for');
  
  let clientIP = forwardedFor?.split(',')[0] || realIP || remoteAddress || 'unknown';
  
  // Clean up the IP address
  clientIP = clientIP.trim();
  
  // Include user agent in identifier for more accurate tracking
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const shortUserAgent = userAgent.substring(0, 50); // Limit length
  
  return `${clientIP}:${shortUserAgent}`;
}

/**
 * Validate request headers for security
 */
export function validateRequestHeaders(request: NextRequest): SecurityCheckResult {
  const userAgent = request.headers.get('user-agent') || '';
  const contentType = request.headers.get('content-type') || '';
  const referer = request.headers.get('referer') || '';
  
  // Block requests with suspicious user agents
  const suspiciousUserAgents = [
    'curl', 'wget', 'python-requests', 'postman', 'insomnia',
    'bot', 'crawler', 'spider', 'scraper'
  ];
  
  if (suspiciousUserAgents.some(ua => userAgent.toLowerCase().includes(ua))) {
    return {
      allowed: false,
      reason: 'Suspicious user agent detected',
      action: 'block'
    };
  }
  
  // Validate content type for POST requests
  if (request.method === 'POST' && !contentType.includes('application/json')) {
    return {
      allowed: false,
      reason: 'Invalid content type for POST request',
      action: 'block'
    };
  }
  
  // Check for missing essential headers
  if (!userAgent) {
    return {
      allowed: false,
      reason: 'Missing user agent header',
      action: 'warn'
    };
  }
  
  return { allowed: true };
}

/**
 * Input sanitization for security
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .replace(/\0/g, '') // Remove null bytes
      .substring(0, 1000); // Limit length
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof key === 'string' && key.length < 100) {
        sanitized[sanitizeInput(key)] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  return input;
}

/**
 * Enhanced payment validation with additional security checks
 */
export function validatePaymentData(paymentData: any): SecurityCheckResult {
  // Check for required fields
  const requiredFields = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'];
  for (const field of requiredFields) {
    if (!paymentData[field] || typeof paymentData[field] !== 'string') {
      return {
        allowed: false,
        reason: `Invalid or missing ${field}`,
        action: 'block'
      };
    }
  }
  
  // Validate format of Razorpay IDs
  const orderIdRegex = /^order_[A-Za-z0-9]+$/;
  const paymentIdRegex = /^pay_[A-Za-z0-9]+$/;
  
  if (!orderIdRegex.test(paymentData.razorpay_order_id)) {
    return {
      allowed: false,
      reason: 'Invalid order ID format',
      action: 'block'
    };
  }
  
  if (!paymentIdRegex.test(paymentData.razorpay_payment_id)) {
    return {
      allowed: false,
      reason: 'Invalid payment ID format',
      action: 'block'
    };
  }
  
  // Validate signature format (hex string)
  const signatureRegex = /^[a-f0-9]{64}$/;
  if (!signatureRegex.test(paymentData.razorpay_signature)) {
    return {
      allowed: false,
      reason: 'Invalid signature format',
      action: 'block'
    };
  }
  
  return { allowed: true };
}

/**
 * Booking data validation with enhanced security
 */
export function validateBookingData(bookingData: any): SecurityCheckResult {
  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(bookingData.email)) {
    return {
      allowed: false,
      reason: 'Invalid email format',
      action: 'block'
    };
  }
  
  // Validate phone format (basic)
  const phoneRegex = /^[+]?[\d\s\-\(\)]{8,15}$/;
  if (!phoneRegex.test(bookingData.phone)) {
    return {
      allowed: false,
      reason: 'Invalid phone format',
      action: 'block'
    };
  }
  
  // Validate name (no special characters)
  const nameRegex = /^[a-zA-Z\s.'-]{2,100}$/;
  if (!nameRegex.test(bookingData.name)) {
    return {
      allowed: false,
      reason: 'Invalid name format',
      action: 'block'
    };
  }
  
  // Validate amount (reasonable range)
  if (typeof bookingData.totalAmount !== 'number' || 
      bookingData.totalAmount < 0 || 
      bookingData.totalAmount > 1000000) {
    return {
      allowed: false,
      reason: 'Invalid amount range',
      action: 'block'
    };
  }
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(bookingData.selectedDate)) {
    return {
      allowed: false,
      reason: 'Invalid date format',
      action: 'block'
    };
  }
  
  // Validate that date is not too far in the future (max 2 years)
  const selectedDate = new Date(bookingData.selectedDate);
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);
  
  if (selectedDate > maxFutureDate) {
    return {
      allowed: false,
      reason: 'Date too far in the future',
      action: 'block'
    };
  }
  
  return { allowed: true };
}

/**
 * Check if IP is on suspicious list
 */
export function isSuspiciousIP(ip: string): boolean {
  return suspiciousIPs.has(ip);
}

/**
 * Get security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://api.razorpay.com;",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, data] of entries) {
    if (now > data.resetTime && (!data.blockedUntil || now > data.blockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Comprehensive security middleware
 */
export function securityMiddleware(request: NextRequest): SecurityCheckResult {
  const clientId = getClientIdentifier(request);
  
  // Rate limiting
  const rateLimitResult = enhancedRateLimit(clientId);
  if (!rateLimitResult.allowed) {
    recordSecurityFailure(clientId, 'rate_limit_exceeded');
    return rateLimitResult;
  }
  
  // Header validation
  const headerResult = validateRequestHeaders(request);
  if (!headerResult.allowed) {
    recordSecurityFailure(clientId, 'invalid_headers');
    return headerResult;
  }
  
  // Check if IP is suspicious
  if (isSuspiciousIP(clientId.split(':')[0])) {
    return {
      allowed: false,
      reason: 'Request from suspicious IP',
      action: 'block'
    };
  }
  
  return { allowed: true };
}

export class EnhancedSecurity {
  /**
   * Encrypt sensitive data
   */
  static async encryptData(data: string, userId: string): Promise<{ encrypted: string; iv: string }> {
    try {
      // Generate a unique salt for this encryption
      const salt = crypto.randomBytes(SECURITY_CONFIG.encryption.saltLength);
      
      // Derive encryption key from userId and salt
      const key = crypto.pbkdf2Sync(
        userId,
        salt,
        SECURITY_CONFIG.encryption.iterations,
        SECURITY_CONFIG.encryption.keyLength,
        SECURITY_CONFIG.encryption.digest
      );
      
      // Generate initialization vector
      const iv = crypto.randomBytes(SECURITY_CONFIG.encryption.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        SECURITY_CONFIG.encryption.algorithm,
        key,
        iv
      );
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Store salt in database for future decryption
      await addDoc(collection(db(), 'encryptionKeys'), {
        userId,
        salt: salt.toString('hex'),
        createdAt: serverTimestamp()
      });
      
      return {
        encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decryptData(
    encrypted: string,
    iv: string,
    userId: string
  ): Promise<string> {
    try {
      // Get salt from database
      const keysQuery = query(
        collection(db(), 'encryptionKeys'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(keysQuery);
      if (snapshot.empty) {
        throw new Error('Encryption key not found');
      }
      
      const keyData = snapshot.docs[0].data();
      const salt = Buffer.from(keyData.salt, 'hex');
      
      // Derive key
      const key = crypto.pbkdf2Sync(
        userId,
        salt,
        SECURITY_CONFIG.encryption.iterations,
        SECURITY_CONFIG.encryption.keyLength,
        SECURITY_CONFIG.encryption.digest
      );
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        SECURITY_CONFIG.encryption.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Enhanced rate limiting with IP tracking
   */
  static async checkRateLimit(userId: string, ip: string): Promise<boolean> {
    try {
      // Check IP block list
      const now = Date.now();
      const ipBlock = ipBlockList.get(ip);
      
      if (ipBlock && ipBlock.blockedUntil > now) {
        await this.logSecurityEvent({
          type: 'ip_blocked',
          userId,
          ip,
          details: { blockedUntil: new Date(ipBlock.blockedUntil).toISOString() }
        });
        return false;
      }
      
      // Check request rate
      const windowStart = new Date(now - SECURITY_CONFIG.rateLimit.windowMs);
      
      const requestsQuery = query(
        collection(db(), 'securityEvents'),
        where('userId', '==', userId),
        where('ip', '==', ip),
        where('timestamp', '>=', windowStart)
      );
      
      const snapshot = await getDocs(requestsQuery);
      
      if (snapshot.size >= SECURITY_CONFIG.rateLimit.maxRequests) {
        // Block IP
        ipBlockList.set(ip, {
          count: 0,
          blockedUntil: now + SECURITY_CONFIG.ipBlocking.blockDuration
        });
        
        await this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          userId,
          ip,
          details: { requestCount: snapshot.size }
        });
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return false;
    }
  }

  /**
   * Security event monitoring with alerts
   */
  static async monitorSecurityEvents(userId: string): Promise<void> {
    try {
      const windowStart = new Date(Date.now() - 3600000); // Last hour
      
      const eventsQuery = query(
        collection(db(), 'securityEvents'),
        where('userId', '==', userId),
        where('timestamp', '>=', windowStart),
        where('type', 'in', ['access_denied', 'suspicious_activity', 'rate_limit_exceeded'])
      );
      
      const snapshot = await getDocs(eventsQuery);
      
      if (snapshot.size >= SECURITY_CONFIG.audit.alertThreshold) {
        // Send alert (implement your alert mechanism here)
        await this.sendSecurityAlert({
          userId,
          eventCount: snapshot.size,
          timeWindow: '1 hour',
          events: snapshot.docs.map(doc => doc.data())
        });
      }
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  }

  /**
   * Clean up old security events
   */
  static async cleanupOldEvents(): Promise<void> {
    try {
      const retentionDate = new Date(Date.now() - (SECURITY_CONFIG.audit.retentionDays * 24 * 60 * 60 * 1000));
      
      const oldEventsQuery = query(
        collection(db(), 'securityEvents'),
        where('timestamp', '<=', retentionDate)
      );
      
      const snapshot = await getDocs(oldEventsQuery);
      
      // Delete old events in batches
      const batch = snapshot.docs.map(doc => doc.ref);
      
      for (let i = 0; i < batch.length; i += 500) {
        const chunk = batch.slice(i, i + 500);
        await Promise.all(chunk.map(ref => updateDoc(ref, { archived: true })));
      }
    } catch (error) {
      console.error('Event cleanup error:', error);
    }
  }

  /**
   * Send security alert
   */
  private static async sendSecurityAlert(alert: any): Promise<void> {
    try {
      await addDoc(collection(db(), 'securityAlerts'), {
        ...alert,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  /**
   * Log security event
   */
  private static async logSecurityEvent(event: any): Promise<void> {
    try {
      await addDoc(collection(db(), 'securityEvents'), {
        ...event,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
} 