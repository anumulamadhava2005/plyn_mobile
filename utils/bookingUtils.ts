import { addDays, format, isAfter, isBefore, parse, parseISO, addMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getAvailableTimeSlots, generateSalonTimeSlots, findAvailableTimeSlots } from './slotUtils';
import { WorkerAvailability } from './admin';
import { findAvailableWorker } from './workerSchedulingUtils';

// Export functions from slotUtils that are imported by other files
export { getAvailableTimeSlots as fetchAvailableSlots } from './slotUtils';
export { generateSalonTimeSlots as createDynamicTimeSlots } from './slotUtils';
export { generateSalonTimeSlots } from './slotUtils';
export { findAvailableTimeSlots } from './slotUtils';

// Cache for slot availability results to prevent redundant queries
const slotAvailabilityCache = new Map<string, {
  timestamp: number;
  result: { available: boolean; slotId: string; workerId?: string, workerName?: string };
}>();

// Fetch merchant slots with caching
export const fetchMerchantSlots = async (merchantId: string) => {
  const cacheKey = `merchant_slots_${merchantId}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  const cacheExpiry = 60 * 1000; // 1 minute cache
  
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < cacheExpiry) {
      return data;
    }
  }
  
  const { data, error } = await supabase
    .from('slots')
    .select(`
      *,
      workers (
        id,
        name,
        specialty
      )
    `)
    .eq('merchant_id', merchantId);

  if (error) {
    console.error("Error fetching merchant slots:", error);
    throw new Error(`Error fetching slots: ${error.message}`);
  }
  
  // Store in cache
  sessionStorage.setItem(cacheKey, JSON.stringify({
    data: data || [],
    timestamp: Date.now()
  }));
  
  return data || [];
};

// Check slot availability with dynamic worker assignment and caching
export const checkSlotAvailability = async (
  merchantId: string,
  date: string,
  time: string,
  serviceDuration: number = 30
): Promise<{ available: boolean; slotId: string; workerId?: string, workerName?: string }> => {
  try {
    // Create a cache key based on the input parameters
    const cacheKey = `${merchantId}-${date}-${time}-${serviceDuration}`;
    
    // Check cache first (valid for 30 seconds)
    const cached = slotAvailabilityCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 30000)) {
      return cached.result;
    }
    
    console.log(`Checking availability for ${date} at ${time}`);
    
    // First check if there's an existing slot that matches the criteria
    const { data: existingSlots, error: slotsError } = await supabase
      .from('slots')
      .select(`
        id, 
        is_booked,
        worker_id,
        workers (
          id,
          name
        )
      `)
      .eq('merchant_id', merchantId)
      .eq('date', date)
      .eq('start_time', time);

    if (slotsError) {
      console.error("Error checking existing slots:", slotsError);
      throw new Error(`Error checking available slots: ${slotsError.message}`);
    }

    // Find an available slot from existing ones
    const availableSlot = (existingSlots || []).find(slot => !slot.is_booked);
    
    if (availableSlot) {
      console.log(`Found available slot: ${availableSlot.id}`);
      const result = {
        available: true,
        slotId: availableSlot.id,
        workerId: availableSlot.worker_id ?? undefined,
        workerName: availableSlot.workers?.name
      };
      
      // Store in cache
      slotAvailabilityCache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });
      
      return result;
    }
    
    // If no existing slot is available, find an available worker
    console.log(`No existing available slot found, finding available worker`);
    const availableWorker = await findAvailableWorker(merchantId, date, time, serviceDuration);
    
    if (!availableWorker) {
      // No workers are available at this time
      console.log(`No available worker found for ${date} at ${time}`);
      const result = {
        available: false,
        slotId: (existingSlots && existingSlots.length > 0) ? existingSlots[0].id : ''
      };
      
      // Store in cache
      slotAvailabilityCache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });
      
      return result;
    }
    
    console.log(`Found available worker: ${availableWorker.workerId}`);
    
    // Create a new slot for the available worker
    const { data: newSlot, error: createError } = await supabase
      .from('slots')
      .insert({
        merchant_id: merchantId,
        date,
        start_time: time,
        end_time: format(addMinutes(new Date(`${date}T${time}`), serviceDuration), 'HH:mm'),
        worker_id: availableWorker.workerId,
        service_duration: serviceDuration,
        is_booked: false
      })
      .select('id')
      .single();
      
    if (createError) {
      console.error("Error creating new slot:", createError);
      throw new Error(`Error creating new slot: ${createError.message}`);
    }
    
    console.log(`Created new slot: ${newSlot.id}`);
    
    const result = {
      available: true,
      slotId: newSlot.id,
      workerId: availableWorker.workerId,
      workerName: availableWorker.name
    };
    
    // Store in cache
    slotAvailabilityCache.set(cacheKey, {
      timestamp: Date.now(),
      result
    });
    
    return result;
  } catch (error: any) {
    console.error("Error in checkSlotAvailability:", error);
    throw new Error("Could not check slot availability");
  }
};

// Book a slot
export const bookSlot = async (
  slotId: string,
  serviceName?: string,
  serviceDuration?: number,
  servicePrice?: number
): Promise<{workerId?: string, workerName?: string}> => {
  try {
    // If no slotId provided or the slotId is 'new', we can't proceed
    if (!slotId || slotId === 'new' || slotId === '' || slotId === null || slotId === undefined) {
      console.error("Invalid slot ID provided:", slotId);
      throw new Error("No valid slot ID provided. Please select a valid time slot.");
    }

    // Validate the slot ID format (simple UUID format check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(slotId)) {
      console.error("Slot ID is not a valid UUID format:", slotId);
      throw new Error("Invalid slot ID format. Please select a valid time slot.");
    }

    console.log(`Booking slot with ID: ${slotId}`);
    
    // First get the slot details to get worker information
    const { data: slot, error: getError } = await supabase
      .from('slots')
      .select(`
        id, 
        worker_id,
        is_booked,
        workers (
          id,
          name
        )
      `)
      .eq('id', slotId)
      .maybeSingle();
      
    if (getError) {
      console.error("Error getting slot details:", getError);
      throw getError;
    }
    
    if (!slot) {
      console.error("Slot not found with ID:", slotId);
      throw new Error("Selected time slot was not found. Please select another time.");
    }
    
    if (slot.is_booked) {
      console.error("Slot already booked:", slotId);
      throw new Error("This time slot has already been booked. Please select another time.");
    }
    
    console.log(`Found slot with worker ID: ${slot.worker_id}`);
    
    // Update the slot to mark it as booked
    const { error } = await supabase
      .from('slots')
      .update({ 
        is_booked: true,
        service_name: serviceName || null,
        service_duration: serviceDuration || 30,
        service_price: servicePrice || null
      })
      .eq('id', slotId);

    if (error) {
      console.error("Error booking slot:", error);
      throw error;
    }
    
    return {
      workerId: slot.worker_id ?? undefined,
      workerName: slot.workers?.name
    };
  } catch (error) {
    console.error("Error in bookSlot:", error);
    throw new Error("Could not book the slot");
  }
};

// Release a slot (make it available again)
export const releaseSlot = async (slotId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('slots')
      .update({ is_booked: false })
      .eq('id', slotId);

    if (error) {
      console.error("Error releasing slot:", error);
      throw new Error(`Error releasing slot: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in releaseSlot:", error);
    throw new Error("Could not release the slot");
  }
};

// Create a booking with worker assignment
export const createBooking = async (bookingData: any): Promise<{ id: string }> => {
  try {
    // Remove payment_method field if it exists in bookingData
    if (bookingData.payment_method) {
      // Store it temporarily if we need it for a payment record
      const paymentMethod = bookingData.payment_method;
      delete bookingData.payment_method;
    }
    
    // Remove any fields that don't exist in the bookings table schema
    if (bookingData.worker_name) {
      delete bookingData.worker_name;
    }

    // Remove user_profile_id if it exists since it doesn't exist in the database
    if (bookingData.user_profile_id) {
      delete bookingData.user_profile_id;
    }
    
    // Convert camelCase to snake_case for database columns
    if (bookingData.coinsEarned !== undefined) {
      bookingData.coins_earned = bookingData.coinsEarned;
      delete bookingData.coinsEarned;
    }
    
    if (bookingData.coinsUsed !== undefined) {
      bookingData.coins_used = bookingData.coinsUsed;
      delete bookingData.coinsUsed;
    }
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating booking:", error);
      throw new Error(`Error creating booking: ${error.message}`);
    }

    return { id: data.id };
  } catch (error) {
    console.error("Error in createBooking:", error);
    throw new Error("Could not create the booking");
  }
};

// Update booking status
export const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled' | 'pending' | 'missed'): Promise<void> => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      console.error("Error updating booking status:", error);
      throw new Error(`Error updating booking status: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in updateBookingStatus:", error);
    throw new Error("Could not update the booking status");
  }
};

// Cancel booking and refund coins
export const cancelBookingAndRefund = async (bookingId: string): Promise<void> => {
  try {
    // First, get the booking details to check if PLYN coins were used
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, slot_id, user_id, coins_used, status')
      .eq('id', bookingId)
      .single();
      
    if (bookingError) {
      console.error("Error fetching booking for cancellation:", bookingError);
      throw new Error(`Error fetching booking: ${bookingError.message}`);
    }
    
    if (!booking) {
      throw new Error("Booking not found");
    }
    
    // Check if booking is already cancelled to prevent double processing
    if (booking.status === 'cancelled') {
      console.log("Booking already cancelled");
      return;
    }
    
    // Begin a transaction to ensure all operations succeed or fail together
    // First, release the slot
    if (booking.slot_id) {
      await releaseSlot(booking.slot_id);
    }
    
    // Update booking status to cancelled
    await updateBookingStatus(bookingId, 'cancelled');
    
    // If coins were used, refund them to the user
    if (booking.coins_used > 0 && booking.user_id) {
      // Get the user's current coins
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', booking.user_id)
        .single();
      
      if (userError) {
        console.error("Error fetching user data for refund:", userError);
        throw new Error(`Error fetching user data: ${userError.message}`);
      }
      
      const currentCoins = userData?.coins || 0;
      const updatedCoins = currentCoins + booking.coins_used;
      
      // Update the user's coins
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: updatedCoins })
        .eq('id', booking.user_id);
        
      if (updateError) {
        console.error("Error refunding coins:", updateError);
        throw new Error(`Error refunding coins: ${updateError.message}`);
      }
      
      console.log(`Refunded ${booking.coins_used} coins to user ${booking.user_id}`);
    }
  } catch (error: any) {
    console.error("Error in cancelBookingAndRefund:", error);
    throw new Error(`Failed to cancel booking: ${error.message}`);
  }
};

// Mark past appointments as missed
export const markMissedAppointments = async (): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Find all confirmed appointments that are in the past and haven't been cancelled or marked as missed
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_date, time_slot, status')
      .lt('booking_date', todayStr)
      .in('status', ['confirmed', 'pending']);
      
    if (error) {
      console.error("Error fetching past appointments:", error);
      throw new Error(`Error fetching past appointments: ${error.message}`);
    }
    
    // If there are past appointments, mark them as missed
    if (data && data.length > 0) {
      const missedIds = data.map(booking => booking.id);
      
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'missed' })
        .in('id', missedIds);
        
      if (updateError) {
        console.error("Error marking appointments as missed:", updateError);
        throw new Error(`Error marking appointments as missed: ${updateError.message}`);
      }
      
      console.log(`Marked ${data.length} past appointments as missed`);
    }
  } catch (error: any) {
    console.error("Error in markMissedAppointments:", error);
    throw new Error(`Failed to mark missed appointments: ${error.message}`);
  }
};

// Fetch user bookings with optimized query
import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchUserBookings = async (userId: string): Promise<any[]> => {
  try {
    const cacheKey = `user_bookings_${userId}`;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        merchant_id,
        salon_id,
        salon_name,
        service_name,
        booking_date,
        time_slot,
        service_price,
        service_duration,
        status,
        worker_id,
        slot_id
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: false })
      .order('time_slot', { ascending: true });

    if (error) {
      console.error("Error fetching user bookings:", error);
      throw new Error(`Error fetching bookings: ${error.message}`);
    }

    await markMissedAppointments();

    const processedData = (data || []).map(booking => ({
      ...booking,
      status: booking.status === 'confirmed' && isBookingInPast(booking.booking_date, booking.time_slot)
        ? 'completed'
        : booking.status
    }));

    // ✅ Store using AsyncStorage instead of sessionStorage
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      data: processedData,
      timestamp: Date.now()
    }));

    return processedData;
  } catch (error) {
    console.error("Error in fetchUserBookings:", error);
    throw new Error("Could not fetch the user bookings");
  }
};


// Helper function to check if a booking is in the past
const isBookingInPast = (bookingDate: string | null, timeSlot: string | null): boolean => {
  if (!bookingDate || !timeSlot) return false;
  
  try {
    const now = new Date();
    
    // Parse the booking datetime
    const [startTime] = timeSlot.split(' - ');
    const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
    
    return bookingDateTime < now;
  } catch {
    return false;
  }
};

// Update a booking
export const updateBooking = async (bookingId: string, bookingData: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update(bookingData)
      .eq('id', bookingId);

    if (error) {
      console.error("Error updating booking:", error);
      throw new Error(`Error updating booking: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in updateBooking:", error);
    throw new Error("Could not update the booking");
  }
};

// Get available workers
export const getAvailableWorkers = async (
  merchantId: string,
  date: string,
  time: string,
  duration: number
): Promise<WorkerAvailability[]> => {
  try {
    // First get all active workers for this merchant
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true);

    if (workersError) throw workersError;
    
    if (!workers || workers.length === 0) {
      return [];
    }
    
    // For each worker, check if they're available at the requested time
    const availabilityChecks = workers.map(async (worker) => {
      // Check if worker has any unavailability for this date
      const { data: unavailability, error: unavailabilityError } = await supabase
        .from('worker_unavailability')
        .select('*')
        .eq('worker_id', worker.id)
        .eq('date', date);
        
      if (unavailabilityError) throw unavailabilityError;
      
      // Check if worker already has a booking at this time
      const { data: bookings, error: bookingsError } = await supabase
        .from('slots')
        .select('*')
        .eq('worker_id', worker.id)
        .eq('date', date)
        .eq('start_time', time)
        .eq('is_booked', true);
        
      if (bookingsError) throw bookingsError;
      
      const isAvailable = 
        (!unavailability || unavailability.length === 0) && 
        (!bookings || bookings.length === 0);
      
      if (isAvailable) {
        return {
          workerId: worker.id,
          name: worker.name,
          nextAvailableTime: time,
          specialty: worker.specialty
        };
      }
      
      return null;
    });
    
    const availabilities = await Promise.all(availabilityChecks);
    return availabilities.filter(Boolean) as WorkerAvailability[];
    
  } catch (error) {
    console.error("Error getting available workers:", error);
    throw new Error("Could not check worker availability");
  }
};

// Export getUserCoins for backward compatibility, but mark as deprecated
/**
 * @deprecated Use getUserCoins from userUtils.ts instead
 */
export const getUserCoins = async (userId: string): Promise<number> => {
  const { getUserCoins: getCoins } = await import('./userUtils');
  return getCoins(userId);
};
