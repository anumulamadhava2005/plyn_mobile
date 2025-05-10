
import { format, formatRelative, parseISO, isToday, isYesterday } from 'date-fns';

/**
 * Formats a date string or Date object into a readable date format
 * @param date - The date to format
 * @param formatStr - Optional format string
 */
export const formatDate = (date: string | Date, formatStr = 'EEEE, MMMM d, yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a time string into 12-hour format
 * @param timeStr - The time string in 24-hour format (e.g., "14:30")
 */
export const formatTime = (timeStr: string): string => {
  try {
    // Create a temporary date object with the time
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    
    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeStr; // Return original if there's an error
  }
};

/**
 * Returns a relative time string (e.g., "today", "yesterday", "2 days ago")
 * @param date - The date to format
 */
export const getRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isToday(dateObj)) {
      return 'today';
    }
    
    if (isYesterday(dateObj)) {
      return 'yesterday';
    }
    
    return formatRelative(dateObj, new Date()).replace(/at\s+\d+:\d+\s+(AM|PM)/i, '');
  } catch (error) {
    console.error('Error getting relative time:', error);
    return 'some time ago';
  }
};

/**
 * Combines a date and time slot into a single Date object
 * @param date - The date (string or Date object)
 * @param timeSlot - The time slot (e.g., "14:30")
 */
export const combineDateAndTime = (date: string | Date, timeSlot: string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const [hours, minutes] = timeSlot.split(':').map(Number);
  
  const result = new Date(dateObj);
  result.setHours(hours);
  result.setMinutes(minutes);
  
  return result;
};

/**
 * Ensures a date string is in yyyy-MM-dd format
 * @param dateStr - The date string to format
 */
export const ensureDateFormat = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date string:', error);
    return dateStr; // Return original if there's an error
  }
};

/**
 * Formats a Date object to ISO string date (YYYY-MM-DD) without time or timezone
 * @param date - The date to format
 */
export const formatToISODate = (date: Date): string => {
  try {
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting to ISO date:', error);
    return format(new Date(), 'yyyy-MM-dd'); // Fallback to today
  }
};
