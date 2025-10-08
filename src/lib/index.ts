// Main library exports
// Central export point for all library functionality
// NOTE: This file will be deprecated in favor of direct shared imports

// Configuration and constants
export * from '../shared/config/constants';

// Type definitions
export * from '../shared/types';

// Utilities
export * from '../shared/utils';

// Re-export commonly used items for convenience
export {
  APP_CONFIG,
  EVENT_CONFIG,
  CITIES,
  GUIDE_OPTIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '../shared/config/constants';

export type {
  Event,
  EventSession,
  EventAttendee,
  UserData,
  ArtistData,
  OrganizationData,
  VenueData,
  AuthSession,
  ApiResponse
} from '../shared/types'; 