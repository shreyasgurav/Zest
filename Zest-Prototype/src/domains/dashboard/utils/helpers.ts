import { FilterOptions } from '../types/dashboard.types';

export const getEmptyStateMessage = (
  searchTerm: string, 
  filterStatus: FilterOptions['filterStatus']
): string => {
  if (searchTerm && filterStatus !== 'all') {
    return `No attendees found matching "${searchTerm}" with status "${filterStatus}"`;
  }
  
  if (searchTerm) {
    return `No attendees found matching "${searchTerm}"`;
  }
  
  if (filterStatus !== 'all') {
    return `No attendees found with status "${filterStatus}"`;
  }
  
  return 'No attendees have registered for this event yet.';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}; 