/**
 * Security monitoring and logging utilities
 */

export interface SecurityEvent {
  type: 'payment_verification' | 'duplicate_payment' | 'booking_creation' | 'validation_failure' | 'capacity_violation' | 'rate_limit_exceeded';
  userId?: string;
  paymentId?: string;
  orderId?: string;
  bookingId?: string;
  eventId?: string;
  activityId?: string;
  timestamp: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log security events for monitoring and analysis
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    source: 'booking_system'
  };

  // Console logging with appropriate level
  switch (event.severity) {
    case 'critical':
      console.error('🚨 CRITICAL SECURITY EVENT:', logEntry);
      break;
    case 'high':
      console.error('🔴 HIGH SECURITY EVENT:', logEntry);
      break;
    case 'medium':
      console.warn('🟡 MEDIUM SECURITY EVENT:', logEntry);
      break;
    case 'low':
      console.info('🟢 LOW SECURITY EVENT:', logEntry);
      break;
  }

  // In production, you might want to send this to a security monitoring service
  // Example: sendToSecurityService(logEntry);
}

/**
 * Log payment verification events
 */
export function logPaymentVerification(
  success: boolean,
  paymentId: string,
  orderId: string,
  userId: string,
  amount: number,
  details?: any
): void {
  logSecurityEvent({
    type: 'payment_verification',
    userId,
    paymentId,
    orderId,
    timestamp: new Date().toISOString(),
    details: {
      success,
      amount,
      ...details
    },
    severity: success ? 'low' : 'high'
  });
}

/**
 * Log duplicate payment attempts
 */
export function logDuplicatePayment(
  paymentId: string,
  orderId: string,
  userId?: string,
  details?: any
): void {
  logSecurityEvent({
    type: 'duplicate_payment',
    userId,
    paymentId,
    orderId,
    timestamp: new Date().toISOString(),
    details: {
      message: 'Duplicate payment attempt detected',
      ...details
    },
    severity: 'high'
  });
}

/**
 * Log booking creation events
 */
export function logBookingCreation(
  success: boolean,
  bookingId: string,
  userId: string,
  bookingType: 'event' | 'activity',
  resourceId: string,
  amount: number,
  details?: any
): void {
  logSecurityEvent({
    type: 'booking_creation',
    userId,
    bookingId,
    ...(bookingType === 'event' ? { eventId: resourceId } : { activityId: resourceId }),
    timestamp: new Date().toISOString(),
    details: {
      success,
      bookingType,
      amount,
      ...details
    },
    severity: success ? 'low' : 'medium'
  });
}

/**
 * Log validation failures
 */
export function logValidationFailure(
  validationType: string,
  userId: string,
  error: string,
  details?: any
): void {
  logSecurityEvent({
    type: 'validation_failure',
    userId,
    timestamp: new Date().toISOString(),
    details: {
      validationType,
      error,
      ...details
    },
    severity: 'medium'
  });
}

/**
 * Log capacity violations
 */
export function logCapacityViolation(
  resourceType: 'event' | 'activity',
  resourceId: string,
  requestedCapacity: number,
  availableCapacity: number,
  userId: string,
  details?: any
): void {
  logSecurityEvent({
    type: 'capacity_violation',
    userId,
    ...(resourceType === 'event' ? { eventId: resourceId } : { activityId: resourceId }),
    timestamp: new Date().toISOString(),
    details: {
      resourceType,
      requestedCapacity,
      availableCapacity,
      ...details
    },
    severity: 'high'
  });
}

/**
 * Log rate limit violations
 */
export function logRateLimitExceeded(
  userId: string,
  requestCount: number,
  timeWindow: string,
  details?: any
): void {
  logSecurityEvent({
    type: 'rate_limit_exceeded',
    userId,
    timestamp: new Date().toISOString(),
    details: {
      requestCount,
      timeWindow,
      message: 'Rate limit exceeded for user',
      ...details
    },
    severity: 'medium'
  });
}

/**
 * Generate security summary for monitoring dashboards
 */
export function generateSecuritySummary(events: SecurityEvent[]): any {
  const summary = {
    totalEvents: events.length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    recentCritical: events.filter(e => e.severity === 'critical').slice(0, 10),
    timeRange: {
      start: events.length > 0 ? events[events.length - 1].timestamp : null,
      end: events.length > 0 ? events[0].timestamp : null
    }
  };

  // Count by type and severity
  events.forEach(event => {
    summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
    summary.bySeverity[event.severity] = (summary.bySeverity[event.severity] || 0) + 1;
  });

  return summary;
} 