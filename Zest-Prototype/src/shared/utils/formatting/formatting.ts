// Date formatting utilities
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const date = new Date(dateString);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export const formatTime = (timeString: string): string => {
  try {
    // Handle different time formats
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
};

export const formatDateTime = (dateString: string, timeString?: string): string => {
  const formattedDate = formatDate(dateString);
  
  if (timeString) {
    const formattedTime = formatTime(timeString);
    return `${formattedDate} at ${formattedTime}`;
  }
  
  return formattedDate;
};

export const formatDateRange = (startDate: string, endDate?: string): string => {
  const start = formatDate(startDate);
  
  if (!endDate || startDate === endDate) {
    return start;
  }
  
  const end = formatDate(endDate);
  return `${start} - ${end}`;
};

// Currency formatting
export const formatCurrency = (
  amount: number, 
  currency: string = 'INR', 
  locale: string = 'en-IN'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${amount}`;
  }
};

export const formatPrice = (price: number): string => {
  if (price === 0) return 'Free';
  return formatCurrency(price);
};

// Number formatting
export const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
  try {
    return new Intl.NumberFormat('en-IN', options).format(num);
  } catch (error) {
    console.error('Error formatting number:', error);
    return num.toString();
  }
};

export const formatCompactNumber = (num: number): string => {
  return formatNumber(num, { notation: 'compact', compactDisplay: 'short' });
};

// Text formatting
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Indian phone number format
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  if (cleaned.length === 13 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

export const formatUsername = (username: string): string => {
  return username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
};

export const formatSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Capacity and statistics formatting
export const formatCapacity = (current: number, total: number): string => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  return `${current}/${total} (${percentage}%)`;
};

export const formatDuration = (startTime: string, endTime: string, startDate?: string, endDate?: string): string => {
  try {
    const start = new Date(`${startDate || '2000-01-01'} ${startTime}`);
    let end = new Date(`${endDate || startDate || '2000-01-01'} ${endTime}`);
    
    // If end time is before start time and no end date specified, assume next day
    if (end <= start && !endDate) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    
    const diffMs = end.getTime() - start.getTime();
    
    if (diffMs <= 0) return 'Invalid duration';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    
    return parts.join(', ') || '0 minutes';
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'Invalid duration';
  }
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

// Truncate text
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};

// Capitalize text
export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => capitalizeFirst(txt));
};

// URL formatting
export const formatUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// Social media handle formatting
export const formatInstagramHandle = (handle: string): string => {
  return handle.replace(/^@/, '').replace(/^instagram\.com\//, '').replace(/^www\.instagram\.com\//, '');
};

export const formatTwitterHandle = (handle: string): string => {
  return handle.replace(/^@/, '').replace(/^twitter\.com\//, '').replace(/^www\.twitter\.com\//, '');
};

export const formatSpotifyUrl = (url: string): string => {
  if (url.includes('spotify.com')) return url;
  if (url.includes('spotify:')) return url.replace('spotify:', 'https://open.spotify.com/');
  return `https://open.spotify.com/artist/${url}`;
};

// Tailwind CSS utility functions
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 