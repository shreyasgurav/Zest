// Common types used across the application

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimestampedEntity extends BaseEntity {
  createdAt: string;
  updatedAt: string;
}

export interface OwnedEntity extends BaseEntity {
  ownerId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface Location {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  social?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
    spotify?: string;
  };
}

export interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  caption?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  };
}

export interface Settings {
  notifications?: boolean;
  emailUpdates?: boolean;
  privacy?: {
    profileVisibility?: 'public' | 'private' | 'friends';
    contactVisibility?: 'public' | 'private' | 'friends';
  };
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type EntityStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export type Permission = 'read' | 'write' | 'delete' | 'admin';

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Form types
export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: FormFieldError[];
  isValid: boolean;
  isSubmitting: boolean;
}

// Navigation types
export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavigationItem[];
  permission?: Permission;
} 