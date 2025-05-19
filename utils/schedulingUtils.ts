
import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes } from 'date-fns';

// Cache for booking operations with short expiration
const bookingCache = new Map<string, {
  timestamp: number;
  data: any;
}>();

/**
 * Clear scheduling cache for a specific date
 */
export const clearSchedulingCache = (date: string): void => {
  const keysToDelete: string[] = [];
  
  bookingCache.forEach((_, key) => {
    if (key.includes(date)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => bookingCache.delete(key));
  console.log(`Cleared ${keysToDelete.length} scheduling cache entries for date ${date}`);
};

/**
 * Reallocate a slot from one worker to another
 */
export const reallocateSlot = async (
  slotId: string,
  newWorkerId: string
): Promise<boolean> => {
  try {
    // Update the slot with new worker
    const { error } = await supabase
      .from('slots')
      .update({ worker_id: newWorkerId })
      .eq('id', slotId);
      
    if (error) throw error;
    
    // Get the date of the updated slot to clear cache
    const { data: slotData } = await supabase
      .from('slots')
      .select('date')
      .eq('id', slotId)
      .single();
      
    if (slotData?.date) {
      clearSchedulingCache(slotData.date);
    }
    
    return true;
  } catch (error) {
    console.error('Error reallocating slot:', error);
    return false;
  }
};

/**
 * Get worker's schedule for a specific date
 */
export const getWorkerSchedule = async (
  workerId: string,
  date: string
) => {
  const cacheKey = `worker_schedule_${workerId}_${date}`;
  const cacheExpiry = 30 * 1000; // 30 seconds
  
  const cached = bookingCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < cacheExpiry)) {
    return cached.data;
  }
  
  try {
    // Fetch booked slots (appointments) for this worker and date
    const { data: bookedSlots, error: bookedSlotsError } = await supabase
      .from('slots')
      .select(`
        id,
        date,
        start_time,
        end_time,
        service_name,
        service_duration
      `)
      .eq('worker_id', workerId)
      .eq('date', date)
      .eq('is_booked', true);
      
    if (bookedSlotsError) throw bookedSlotsError;
    
    // Format and process appointments
    const appointments = [];
    
    if (bookedSlots && bookedSlots.length > 0) {
      for (const slot of bookedSlots) {
        // Find associated booking for this slot
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('id, user_id, customer_email, status')
          .eq('slot_id', slot.id)
          .maybeSingle();
          
        if (bookingError) {
          console.error('Error fetching booking:', bookingError);
          continue;
        }
        
        let customerName = 'Customer';
        if (bookingData) {
          // Use customer_email if available, otherwise use a generic name
          if (bookingData.customer_email) {
            customerName = bookingData.customer_email.split('@')[0];
          } else {
            // Try to get username from profiles if user_id is available
            if (bookingData.user_id) {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', bookingData.user_id)
                .maybeSingle();
                
              if (!userError && userData && userData.username) {
                customerName = userData.username;
              }
            }
          }
        }
        
        appointments.push({
          id: slot.id,
          booking_date: slot.date,
          time_slot: slot.start_time,
          end_time: slot.end_time,
          service_name: slot.service_name || 'Service',
          service_duration: slot.service_duration || 30,
          customer_name: customerName,
          status: bookingData?.status || 'confirmed'
        });
      }
    }
    
    // Save to cache
    bookingCache.set(cacheKey, {
      timestamp: Date.now(),
      data: appointments
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting worker schedule:', error);
    throw error;
  }
};
