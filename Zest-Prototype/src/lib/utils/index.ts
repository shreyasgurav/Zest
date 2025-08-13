// Main utilities export
// Central export point for all utility functions

export * from './formatting';
export * from './validation';

// Re-export commonly used utilities
export {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  formatPrice,
  formatPhoneNumber,
  formatDuration,
  truncateText,
  capitalizeFirst
} from './formatting';

export {
  isValidEmail,
  isValidPhone,
  isValidUsername,
  isValidPassword,
  isValidDate,
  isValidTime,
  validateField,
  getValidationMessage
} from './validation'; 