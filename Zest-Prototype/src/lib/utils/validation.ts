import { AUTH_CONFIG } from '@/shared/config/constants';

// Basic validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidUsername = (username: string): boolean => {
  const { minLength, maxLength, pattern } = AUTH_CONFIG.validation.username;
  
  if (username.length < minLength || username.length > maxLength) {
    return false;
  }
  
  return pattern.test(username);
};

export const isValidPassword = (password: string): boolean => {
  const { 
    minLength, 
    requireUppercase, 
    requireLowercase, 
    requireNumbers, 
    requireSpecialChars 
  } = AUTH_CONFIG.validation.password;
  
  if (password.length < minLength) {
    return false;
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    return false;
  }
  
  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }
  
  return true;
};

// Event validation
export const isValidEventTitle = (title: string): boolean => {
  return title.trim().length >= 3 && title.trim().length <= 100;
};

export const isValidEventDescription = (description: string): boolean => {
  return description.trim().length >= 10 && description.trim().length <= 2000;
};

export const isValidEventVenue = (venue: string): boolean => {
  return venue.trim().length >= 3 && venue.trim().length <= 100;
};

export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

export const isValidTime = (timeString: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

export const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of day
  return date >= now;
};

export const isValidDateRange = (startDate: string, endDate?: string): boolean => {
  if (!isValidDate(startDate)) return false;
  if (!endDate) return true;
  if (!isValidDate(endDate)) return false;
  
  return new Date(startDate) <= new Date(endDate);
};

export const isValidTimeRange = (startTime: string, endTime: string, startDate?: string, endDate?: string): boolean => {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
  
  // If same date or no end date, end time should be after start time
  if (!endDate || startDate === endDate) {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    return end > start;
  }
  
  // If different dates, any time is valid
  return true;
};

// Ticket validation
export const isValidTicketPrice = (price: number): boolean => {
  return price >= 0 && price <= 100000;
};

export const isValidTicketCapacity = (capacity: number): boolean => {
  return capacity > 0 && capacity <= 10000;
};

export const isValidTicketName = (name: string): boolean => {
  return name.trim().length >= 1 && name.trim().length <= 50;
};

// File validation
export const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return validTypes.includes(file.type) && file.size <= maxSize;
};

export const isValidDocumentFile = (file: File): boolean => {
  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return validTypes.includes(file.type) && file.size <= maxSize;
};

// Payment validation
export const isValidAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 100000 && Number.isFinite(amount);
};

// Array validation
export const isNonEmptyArray = <T>(arr: T[]): boolean => {
  return Array.isArray(arr) && arr.length > 0;
};

export const hasUniqueItems = <T>(arr: T[]): boolean => {
  return arr.length === new Set(arr).size;
};

// String validation
export const isNonEmptyString = (str: string): boolean => {
  return typeof str === 'string' && str.trim().length > 0;
};

export const hasMinLength = (str: string, minLength: number): boolean => {
  return str.trim().length >= minLength;
};

export const hasMaxLength = (str: string, maxLength: number): boolean => {
  return str.trim().length <= maxLength;
};

export const isWithinLength = (str: string, minLength: number, maxLength: number): boolean => {
  const length = str.trim().length;
  return length >= minLength && length <= maxLength;
};

// Number validation
export const isPositiveNumber = (num: number): boolean => {
  return typeof num === 'number' && num > 0 && Number.isFinite(num);
};

export const isNonNegativeNumber = (num: number): boolean => {
  return typeof num === 'number' && num >= 0 && Number.isFinite(num);
};

export const isInRange = (num: number, min: number, max: number): boolean => {
  return num >= min && num <= max;
};

// Object validation
export const hasRequiredFields = <T>(obj: T, requiredFields: (keyof T)[]): boolean => {
  return requiredFields.every(field => obj[field] !== undefined && obj[field] !== null);
};

// Custom validation messages
export const getValidationMessage = (field: string, rule: string, ...params: any[]): string => {
  const messages: Record<string, string> = {
    required: `${field} is required`,
    email: `${field} must be a valid email address`,
    phone: `${field} must be a valid phone number`,
    url: `${field} must be a valid URL`,
    username: `${field} must be 3-30 characters and contain only letters, numbers, hyphens, and underscores`,
    password: `${field} must be at least 8 characters long`,
    minLength: `${field} must be at least ${params[0]} characters long`,
    maxLength: `${field} must be no more than ${params[0]} characters long`,
    min: `${field} must be at least ${params[0]}`,
    max: `${field} must be no more than ${params[0]}`,
    range: `${field} must be between ${params[0]} and ${params[1]}`,
    futureDate: `${field} must be a future date`,
    validDate: `${field} must be a valid date`,
    validTime: `${field} must be a valid time`,
    timeRange: `End time must be after start time`,
    dateRange: `End date must be after start date`,
    positiveNumber: `${field} must be a positive number`,
    invalidFile: `${field} must be a valid file`,
    imageFile: `${field} must be a valid image file (JPEG, PNG, GIF, WebP) under 5MB`,
    documentFile: `${field} must be a valid document file (PDF, DOC, DOCX) under 10MB`,
  };
  
  return messages[rule] || `${field} is invalid`;
};

// Form validation helper
export const validateField = (value: any, rules: string[], field: string = 'Field'): string[] => {
  const errors: string[] = [];
  
  for (const rule of rules) {
    const [ruleName, ...params] = rule.split(':');
    
    switch (ruleName) {
      case 'required':
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors.push(getValidationMessage(field, 'required'));
        }
        break;
      case 'email':
        if (value && !isValidEmail(value)) {
          errors.push(getValidationMessage(field, 'email'));
        }
        break;
      case 'phone':
        if (value && !isValidPhone(value)) {
          errors.push(getValidationMessage(field, 'phone'));
        }
        break;
      case 'url':
        if (value && !isValidUrl(value)) {
          errors.push(getValidationMessage(field, 'url'));
        }
        break;
      case 'username':
        if (value && !isValidUsername(value)) {
          errors.push(getValidationMessage(field, 'username'));
        }
        break;
      case 'password':
        if (value && !isValidPassword(value)) {
          errors.push(getValidationMessage(field, 'password'));
        }
        break;
      case 'minLength':
        if (value && !hasMinLength(value, parseInt(params[0]))) {
          errors.push(getValidationMessage(field, 'minLength', params[0]));
        }
        break;
      case 'maxLength':
        if (value && !hasMaxLength(value, parseInt(params[0]))) {
          errors.push(getValidationMessage(field, 'maxLength', params[0]));
        }
        break;
      case 'min':
        if (value && value < parseInt(params[0])) {
          errors.push(getValidationMessage(field, 'min', params[0]));
        }
        break;
      case 'max':
        if (value && value > parseInt(params[0])) {
          errors.push(getValidationMessage(field, 'max', params[0]));
        }
        break;
      case 'futureDate':
        if (value && !isFutureDate(value)) {
          errors.push(getValidationMessage(field, 'futureDate'));
        }
        break;
      case 'validDate':
        if (value && !isValidDate(value)) {
          errors.push(getValidationMessage(field, 'validDate'));
        }
        break;
      case 'validTime':
        if (value && !isValidTime(value)) {
          errors.push(getValidationMessage(field, 'validTime'));
        }
        break;
      case 'positiveNumber':
        if (value && !isPositiveNumber(value)) {
          errors.push(getValidationMessage(field, 'positiveNumber'));
        }
        break;
    }
  }
  
  return errors;
}; 