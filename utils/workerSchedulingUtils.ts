import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes } from 'date-fns';
import { WorkerAvailability } from '@/types/admin';

// Cache for availability results to reduce database queries
const availabilityCache = new Map<string, {
  timestamp: number;
  result: boolean | Array<{workerId: string, available: boolean}>;
}>();

// Cache for slots with workers
const slotsCache = new Map<string, {
  timestamp: number;
  slots: Array<{time: string, availableWorkers: WorkerAvailability[]}>;
}>();

/**
 * Clear availability cache for a specific date
 */
export const clearAvailabilityCache = (merchantId: string, date: string): void => {
  // Find and clear all relevant cache entries
  const keysToDelete: string[] = [];
  
  slotsCache.forEach((_, key) => {
    if (key.includes(merchantId) && key.includes(date)) {
      keysToDelete.push(key);
    }
  });
  
  availabilityCache.forEach((_, key) => {
    if (key.includes(date)) {
      keysToDelete.push(key);
    }
  });
  
  // Delete found keys
  keysToDelete.forEach(key => {
    if (slotsCache.has(key)) {
      slotsCache.delete(key);
    }
    if (availabilityCache.has(key)) {
      availabilityCache.delete(key);
    }
  });
  
  console.log(`Cleared ${keysToDelete.length} cache entries for date ${date}`);
};

/**
 * Optimized batch check if workers are available for a slot
 */
export const batchCheckWorkerAvailability = async (
  workerIds: string[],
  date: string,
  startTime: string,
  endTime: string
): Promise<{[workerId: string]: boolean}> => {
  try {
    // Create a cache key
    const cacheKey = `batch_${date}_${startTime}_${endTime}_${workerIds.join('_')}`;
    const cacheExpiry = 5 * 1000; // 5 seconds expiry
    
    // Check cache first
    const cached = availabilityCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < cacheExpiry)) {
      if (Array.isArray(cached.result)) {
        // Convert array result to object
        const result: {[workerId: string]: boolean} = {};
        cached.result.forEach(item => {
          result[item.workerId] = item.available;
        });
        return result;
      }
    }
    
    // Fetch all relevant data in parallel with a single request per data type
    const [bookingsResult, unavailabilityResult] = await Promise.all([
      // Get all booked slots for this date and these workers
      supabase
        .from('slots')
        .select('worker_id, start_time, end_time')
        .eq('date', date)
        .eq('is_booked', true)
        .in('worker_id', workerIds),
      
      // Get all unavailability entries for this date and these workers
      supabase
        .from('worker_unavailability')
        .select('worker_id, start_time, end_time')
        .eq('date', date)
        .in('worker_id', workerIds)
    ]);
    
    const { data: bookings } = bookingsResult;
    const { data: unavailability } = unavailabilityResult;
    
    // Convert times to minutes for easier comparison
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const slotStartMinutes = startHour * 60 + startMin;
    const slotEndMinutes = endHour * 60 + endMin;
    
    // Create lookup maps for quick checking
    const bookingMap: {[workerId: string]: Array<{start: number, end: number}>} = {};
    const unavailabilityMap: {[workerId: string]: Array<{start: number, end: number}>} = {};
    
    // Process bookings
    (bookings || []).forEach(booking => {
      if (!bookingMap[booking.worker_id]) {
        bookingMap[booking.worker_id] = [];
      }
      
      const [bStartHour, bStartMin] = booking.start_time.split(':').map(Number);
      const [bEndHour, bEndMin] = booking.end_time.split(':').map(Number);
      
      bookingMap[booking.worker_id].push({
        start: bStartHour * 60 + bStartMin,
        end: bEndHour * 60 + bEndMin
      });
    });
    
    // Process unavailability
    (unavailability || []).forEach(period => {
      if (!unavailabilityMap[period.worker_id]) {
        unavailabilityMap[period.worker_id] = [];
      }
      
      const [uStartHour, uStartMin] = period.start_time.split(':').map(Number);
      const [uEndHour, uEndMin] = period.end_time.split(':').map(Number);
      
      unavailabilityMap[period.worker_id].push({
        start: uStartHour * 60 + uStartMin,
        end: uEndHour * 60 + uEndMin
      });
    });
    
    // Check availability for all workers
    const result: {[workerId: string]: boolean} = {};
    const cacheResult: Array<{workerId: string, available: boolean}> = [];
    
    workerIds.forEach(workerId => {
      // Check bookings
      const workerBookings = bookingMap[workerId] || [];
      const hasOverlappingBooking = workerBookings.some(booking => 
        (slotStartMinutes < booking.end && slotEndMinutes > booking.start)
      );
      
      // Check unavailability
      const workerUnavailability = unavailabilityMap[workerId] || [];
      const hasUnavailabilityPeriod = workerUnavailability.some(period => 
        (slotStartMinutes < period.end && slotEndMinutes > period.start)
      );
      
      // Worker is available if no overlapping bookings and no unavailability periods
      const isAvailable = !hasOverlappingBooking && !hasUnavailabilityPeriod;
      result[workerId] = isAvailable;
      cacheResult.push({ workerId, available: isAvailable });
    });
    
    // Update cache
    availabilityCache.set(cacheKey, {
      timestamp: Date.now(),
      result: cacheResult
    });
    
    return result;
  } catch (error) {
    console.error('Error in batch checking worker availability:', error);
    throw error;
  }
};

/**
 * Check if a specific time slot is available for a given worker
 * Now optimized to use the batch checker for consistency
 */
export const isWorkerAvailableForSlot = async (
  workerId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  try {
    // Create a cache key
    const cacheKey = `availability_${workerId}_${date}_${startTime}_${endTime}`;
    const cacheExpiry = 5 * 1000; // 5 seconds
    
    // Check cache first
    const cached = availabilityCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < cacheExpiry)) {
      if (typeof cached.result === 'boolean') {
        return cached.result as boolean;
      }
    }
    
    // Use batch check for individual worker for consistency
    const availabilityMap = await batchCheckWorkerAvailability(
      [workerId],
      date,
      startTime,
      endTime
    );
    
    const result = availabilityMap[workerId] || false;
    
    // Update cache
    availabilityCache.set(cacheKey, {
      timestamp: Date.now(),
      result
    });
    
    return result;
  } catch (error) {
    console.error('Error checking worker availability:', error);
    return false;
  }
};

/**
 * Find the first available worker for a given time slot
 */
export const findAvailableWorker = async (
  merchantId: string,
  date: string,
  startTime: string,
  serviceDuration: number
): Promise<WorkerAvailability | null> => {
  try {
    // Get all active workers for this merchant
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true);
      
    if (workersError) throw workersError;
    
    if (!workers || workers.length === 0) {
      console.log('No active workers found for merchant:', merchantId);
      return null;
    }
    
    // Calculate end time based on service duration
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = addMinutes(startDateTime, serviceDuration);
    const endTime = format(endDateTime, 'HH:mm');
    
    // Check all workers' availability in a single batch request
    const workerIds = workers.map(worker => worker.id);
    const availabilityMap = await batchCheckWorkerAvailability(
      workerIds,
      date,
      startTime,
      endTime
    );
    
    // Find the first available worker
    for (const worker of workers) {
      if (availabilityMap[worker.id]) {
        return {
          workerId: worker.id,
          name: worker.name,
          nextAvailableTime: endTime,
          specialty: worker.specialty
        };
      }
    }
    
    return null; // No available workers found
  } catch (error) {
    console.error('Error finding available worker:', error);
    throw error;
  }
};

/**
 * Create a new slot with automatic worker assignment
 */
export const createSlotWithAutoAssignment = async (
  merchantId: string,
  date: string,
  startTime: string,
  serviceDuration: number,
  serviceName?: string,
  servicePrice?: number
): Promise<{slotId: string, workerId: string, workerName: string} | null> => {
  try {
    // Find an available worker
    const availableWorker = await findAvailableWorker(
      merchantId,
      date,
      startTime,
      serviceDuration
    );
    
    if (!availableWorker) {
      console.log('No available workers found for the requested time');
      return null;
    }
    
    // Calculate end time
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = addMinutes(startDateTime, serviceDuration);
    const endTime = format(endDateTime, 'HH:mm');
    
    // Create the slot
    const { data, error } = await supabase
      .from('slots')
      .insert({
        merchant_id: merchantId,
        date,
        start_time: startTime,
        end_time: endTime,
        worker_id: availableWorker.workerId,
        service_duration: serviceDuration,
        service_name: serviceName || null,
        service_price: servicePrice || 0,
        is_booked: false
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    // Clear cache for this date to ensure fresh availability data
    clearAvailabilityCache(merchantId, date);
    
    return {
      slotId: data.id,
      workerId: availableWorker.workerId,
      workerName: availableWorker.name
    };
  } catch (error) {
    console.error('Error creating slot with auto assignment:', error);
    throw error;
  }
};

/**
 * Get all available time slots with assigned workers for a date and service
 */
export const getAvailableSlotsWithWorkers = async (
  merchantId: string,
  date: string,
  serviceDuration: number,
  interval: number = 10
): Promise<Array<{time: string, availableWorkers: WorkerAvailability[]}>> => {
  try {
    // Create a cache key
    const cacheKey = `slots_${merchantId}_${date}_${serviceDuration}_${interval}`;
    const cacheExpiry = 5 * 1000; // 5 seconds
    
    // Check cache first
    const cached = slotsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < cacheExpiry)) {
      return cached.slots;
    }
    
    // Get merchant settings for business hours
    const { data: settings, error: settingsError } = await supabase
      .from('merchant_settings')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();
      
    if (settingsError) {
      console.error('Error fetching merchant settings:', settingsError);
      // Default hours if settings not found
      return getAvailableSlotsWithWorkersInRange(
        merchantId, 
        date, 
        '09:00', 
        '17:00', 
        serviceDuration, 
        interval
      );
    }
    
    const slots = await getAvailableSlotsWithWorkersInRange(
      merchantId,
      date,
      settings.working_hours_start,
      settings.working_hours_end,
      serviceDuration,
      interval
    );
    
    // Update cache
    slotsCache.set(cacheKey, {
      timestamp: Date.now(),
      slots
    });
    
    return slots;
  } catch (error) {
    console.error('Error getting available slots with workers:', error);
    throw error;
  }
};

/**
 * Helper function to get available slots within a time range
 * Optimized version with batch processing
 */
async function getAvailableSlotsWithWorkersInRange(
  merchantId: string,
  date: string,
  startHour: string,
  endHour: string,
  serviceDuration: number,
  interval: number
): Promise<Array<{time: string, availableWorkers: WorkerAvailability[]}>> {
  try {
    // Get all active workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true);
      
    if (workersError) throw workersError;
    
    if (!workers || workers.length === 0) {
      return [];
    }
    
    const workerIds = workers.map(w => w.id);
    const workerMap: Record<string, typeof workers[0]> = {};
    workers.forEach(w => workerMap[w.id] = w);
    
    // Create time slots at specified intervals
    const startTime = new Date(`${date}T${startHour}`);
    const endTime = new Date(`${date}T${endHour}`);
    const currentTime = new Date();
    
    // Generate all possible time slot strings and end times first
    const timeSlots: Array<{start: string, end: string}> = [];
    for (
      let slotTime = new Date(startTime);
      slotTime < endTime;
      slotTime = addMinutes(slotTime, interval)
    ) {
      // Skip slots in the past
      if (slotTime < currentTime && date === format(currentTime, 'yyyy-MM-dd')) {
        continue;
      }
      
      const slotTimeStr = format(slotTime, 'HH:mm');
      const endTimeStr = format(addMinutes(slotTime, serviceDuration), 'HH:mm');
      
      timeSlots.push({
        start: slotTimeStr,
        end: endTimeStr
      });
    }
    
    if (timeSlots.length === 0) {
      return [];
    }
    
    // Get all bookings and unavailability for this date and these workers
    const [allBookings, allUnavailability] = await Promise.all([
      supabase
        .from('slots')
        .select('worker_id, start_time, end_time')
        .eq('date', date)
        .eq('is_booked', true)
        .in('worker_id', workerIds),
      
      supabase
        .from('worker_unavailability')
        .select('worker_id, start_time, end_time')
        .eq('date', date)
        .in('worker_id', workerIds)
    ]);
    
    const { data: bookings } = allBookings;
    const { data: unavailability } = allUnavailability;
    
    // Create booking and unavailability maps for each worker
    interface TimeRange { start: number, end: number }
    const bookingMap: Record<string, TimeRange[]> = {};
    const unavailabilityMap: Record<string, TimeRange[]> = {};
    
    // Process all bookings
    (bookings || []).forEach(booking => {
      if (!bookingMap[booking.worker_id]) {
        bookingMap[booking.worker_id] = [];
      }
      
      const [startHour, startMin] = booking.start_time.split(':').map(Number);
      const [endHour, endMin] = booking.end_time.split(':').map(Number);
      
      bookingMap[booking.worker_id].push({
        start: startHour * 60 + startMin,
        end: endHour * 60 + endMin
      });
    });
    
    // Process all unavailability
    (unavailability || []).forEach(period => {
      if (!unavailabilityMap[period.worker_id]) {
        unavailabilityMap[period.worker_id] = [];
      }
      
      const [startHour, startMin] = period.start_time.split(':').map(Number);
      const [endHour, endMin] = period.end_time.split(':').map(Number);
      
      unavailabilityMap[period.worker_id].push({
        start: startHour * 60 + startMin,
        end: endHour * 60 + endMin
      });
    });
    
    // Process each time slot to find available workers
    const availableSlots: Array<{time: string, availableWorkers: WorkerAvailability[]}> = [];
    
    timeSlots.forEach(slot => {
      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour, endMin] = slot.end.split(':').map(Number);
      
      const slotStartMinutes = startHour * 60 + startMin;
      const slotEndMinutes = endHour * 60 + endMin;
      
      // Find available workers for this time slot
      const availableWorkersForSlot: WorkerAvailability[] = [];
      
      workerIds.forEach(workerId => {
        const worker = workerMap[workerId];
        
        // Check for conflicting bookings
        const workerBookings = bookingMap[workerId] || [];
        const hasBookingConflict = workerBookings.some(booking => 
          (slotStartMinutes < booking.end && slotEndMinutes > booking.start)
        );
        
        if (hasBookingConflict) {
          return; // Skip this worker
        }
        
        // Check for unavailability
        const workerUnavailability = unavailabilityMap[workerId] || [];
        const hasUnavailabilityConflict = workerUnavailability.some(period => 
          (slotStartMinutes < period.end && slotEndMinutes > period.start)
        );
        
        if (hasUnavailabilityConflict) {
          return; // Skip this worker
        }
        
        // Worker is available
        availableWorkersForSlot.push({
          workerId: worker.id,
          name: worker.name,
          nextAvailableTime: slot.end,
          specialty: worker.specialty
        });
      });
      
      // Only add slots with available workers
      if (availableWorkersForSlot.length > 0) {
        availableSlots.push({
          time: slot.start,
          availableWorkers: availableWorkersForSlot
        });
      }
    });
    
    return availableSlots;
  } catch (error) {
    console.error('Error getting available slots in range:', error);
    throw error;
  }
}

/**
 * Update slot booking status and assign worker
 */
export const bookSlotWithWorker = async (
  slotId: string,
  serviceName: string,
  serviceDuration: number,
  servicePrice: number,
  merchantId: string,
  date: string,
  startTime: string
): Promise<{success: boolean, workerId?: string, workerName?: string}> => {
  try {
    // First check if the slot is still available
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();
      
    if (slotError) throw slotError;
    
    if (slot.is_booked) {
      // If slot is already booked, find an available worker
      const availableWorker = await findAvailableWorker(
        merchantId,
        date,
        startTime,
        serviceDuration
      );
      
      if (!availableWorker) {
        return { success: false };
      }
      
      // Calculate end time
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = addMinutes(startDateTime, serviceDuration);
      const endTime = format(endDateTime, 'HH:mm');
      
      // Create a new slot with the available worker
      const { data: newSlot, error: createError } = await supabase
        .from('slots')
        .insert({
          merchant_id: merchantId,
          date,
          start_time: startTime,
          end_time: endTime,
          worker_id: availableWorker.workerId,
          service_name: serviceName,
          service_price: servicePrice,
          service_duration: serviceDuration,
          is_booked: true
        })
        .select('id')
        .single();
        
      if (createError) throw createError;
      
      // Clear cache for this date
      clearAvailabilityCache(merchantId, date);
      
      return {
        success: true,
        workerId: availableWorker.workerId,
        workerName: availableWorker.name
      };
    } else {
      // Update the existing slot
      const { error: updateError } = await supabase
        .from('slots')
        .update({
          is_booked: true,
          service_name: serviceName,
          service_price: servicePrice,
          service_duration: serviceDuration
        })
        .eq('id', slotId);
        
      if (updateError) throw updateError;
      
      // Get the worker's name
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('name')
        .eq('id', slot.worker_id)
        .single();
        
      if (workerError) throw workerError;
      
      // Clear cache for this date
      clearAvailabilityCache(merchantId, date);
      
      return {
        success: true,
        workerId: slot.worker_id,
        workerName: worker.name
      };
    }
  } catch (error) {
    console.error('Error booking slot with worker:', error);
    throw error;
  }
};
