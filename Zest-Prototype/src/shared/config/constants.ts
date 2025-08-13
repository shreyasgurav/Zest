// Application constants and configuration values

export const APP_CONFIG = {
  name: 'Zest',
  version: '0.1.0',
  description: 'Your guide to everything',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  support: {
    email: 'support@zest.com',
    phone: '+91-XXXXXXXXXX',
  },
} as const;

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// Firebase Configuration
export const FIREBASE_CONFIG = {
  collections: {
    users: 'Users',
    artists: 'Artists',
    organizations: 'Organisations',
    venues: 'Venues',
    events: 'events',
    activities: 'activities',
    tickets: 'tickets',
    eventAttendees: 'eventAttendees',
    activityAttendees: 'activityAttendees',
  },
  storage: {
    buckets: {
      images: 'images',
      events: 'events',
      profiles: 'profiles',
      activities: 'activities',
    },
  },
} as const;

// Event Configuration
export const EVENT_CONFIG = {
  categories: [
    { id: 'music', label: 'Music' },
    { id: 'comedy', label: 'Comedy' },
    { id: 'clubbing', label: 'Clubbing' },
    { id: 'party', label: 'Party' },
    { id: 'art', label: 'Art' },
    { id: 'adventure', label: 'Adventure' },
    { id: 'sports', label: 'Sports' },
  ],
  architecture: {
    legacy: 'legacy',
    sessionCentric: 'session-centric',
  },
  status: {
    draft: 'draft',
    active: 'active',
    cancelled: 'cancelled',
    completed: 'completed',
    expired: 'expired',
  },
  maxSessions: 50,
  maxTicketTypes: 10,
  maxCapacityPerSession: 10000,
} as const;

// Guide Options for Events
export const GUIDE_OPTIONS = [
  { id: 'duration', label: 'Duration', placeholder: 'e.g., 2 hours' },
  { id: 'age_requirement', label: 'Age Requirement', placeholder: 'e.g., 16+ years' },
  { id: 'language', label: 'Language', placeholder: 'e.g., Hindi, English' },
  { id: 'seating', label: 'Seating Arrangement', placeholder: 'e.g., Theater, Round Table' },
  { id: 'kid_friendly', label: 'Kid Friendly', placeholder: 'e.g., Yes/No or details' },
  { id: 'pet_friendly', label: 'Pet Friendly', placeholder: 'e.g., Yes/No or details' },
  { id: 'wheelchair', label: 'Wheelchair Accessible', placeholder: 'e.g., Yes/No or details' },
  { id: 'parking', label: 'Parking Available', placeholder: 'e.g., Yes/No or details' },
  { id: 'food', label: 'Food & Beverages', placeholder: 'e.g., Snacks, Dinner, Drinks' },
  { id: 'outdoor', label: 'Outdoor Event', placeholder: 'e.g., Yes/No or details' },
  { id: 'indoor', label: 'Indoor Event', placeholder: 'e.g., Yes/No or details' },
  { id: 'dress_code', label: 'Dress Code', placeholder: 'e.g., Formal, Casual' },
  { id: 'photography', label: 'Photography Allowed?', placeholder: 'e.g., Yes/No or details' },
  { id: 'alcohol', label: 'Alcohol allowed?', placeholder: 'e.g., Yes/No or details' },
] as const;

// Cities Configuration
export const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna',
  'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali',
  'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad',
  'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota',
  'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad', 'Mysore', 'Tiruchirappalli', 'Bareilly', 'Aligarh',
  'Tiruppur', 'Gurgaon', 'Moradabad', 'Jalandhar', 'Bhubaneswar', 'Salem', 'Warangal', 'Guntur', 'Noida',
  'Dehradun', 'Kochi',
] as const;

// Payment Configuration
export const PAYMENT_CONFIG = {
  currency: 'INR',
  providers: {
    razorpay: 'razorpay',
    stripe: 'stripe',
    cash: 'cash',
  },
  fees: {
    processingFeePercentage: 2.5,
    minimumFee: 5,
    maximumFee: 1000,
  },
  limits: {
    minimumAmount: 1,
    maximumAmount: 100000,
  },
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  images: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  documents: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  },
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  providers: {
    google: 'google',
    phone: 'phone',
    email: 'email',
  },
  session: {
    timeout: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 60 * 60 * 1000, // 1 hour
  },
  validation: {
    username: {
      minLength: 3,
      maxLength: 30,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
    phone: {
      pattern: /^\+?[1-9]\d{1,14}$/,
    },
  },
} as const;

// Pagination Configuration
export const PAGINATION_CONFIG = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultPage: 1,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  ttl: {
    events: 5 * 60 * 1000, // 5 minutes
    profiles: 10 * 60 * 1000, // 10 minutes
    static: 60 * 60 * 1000, // 1 hour
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  generic: 'Something went wrong. Please try again.',
  network: 'Network error. Please check your connection.',
  unauthorized: 'You are not authorized to perform this action.',
  forbidden: 'Access denied.',
  notFound: 'The requested resource was not found.',
  validation: 'Please check your input and try again.',
  rateLimit: 'Too many requests. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  created: 'Created successfully!',
  updated: 'Updated successfully!',
  deleted: 'Deleted successfully!',
  saved: 'Saved successfully!',
  sent: 'Sent successfully!',
} as const; 