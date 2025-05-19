import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Extends an existing slot by updating the end time
 */
export const extendSlot = async (
  slotId: string,
  newEndTime: string
): Promise<boolean> => {
  try {
    // Get current slot details
    const { data: currentSlot, error: fetchError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();
      
    if (fetchError) throw fetchError;
    
    if (!currentSlot) {
      throw new Error('Slot not found');
    }
    
    // Make sure the new end time is after the current start time
    if (newEndTime <= currentSlot.start_time) {
      throw new Error('New end time must be after the start time');
    }
    
    // Calculate the new duration in minutes
    const startParts = currentSlot.start_time.split(':').map(Number);
    const endParts = newEndTime.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const durationMinutes = endMinutes - startMinutes;
    
    // Update the slot with the new end time and duration
    const { error: updateError } = await supabase
      .from('slots')
      .update({
        end_time: newEndTime,
        service_duration: durationMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId);
      
    if (updateError) throw updateError;
    
    // If there's a booking associated with this slot, update the booking's service duration
    if (currentSlot.is_booked) {
      const { data: bookingData, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('id')
        .eq('slot_id', slotId)
        .single();
        
      if (!bookingFetchError && bookingData) {
        await supabase
          .from('bookings')
          .update({
            service_duration: durationMinutes,
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingData.id);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error extending slot:', error);
    throw error;
  }
};

/**
 * Check if a slot can be extended (no conflicts)
 */
export const canExtendSlot = async (
  slotId: string,
  merchantId: string,
  date: string,
  workerId: string | null,
  newEndTime: string
): Promise<boolean> => {
  try {
    // Get current slot
    const { data: currentSlot, error: fetchError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();
      
    if (fetchError) throw fetchError;
    
    if (!currentSlot) {
      throw new Error('Slot not found');
    }
    
    // Check if there are any other slots that would conflict with the extension
    const { data: conflictingSlots, error: conflictError } = await supabase
      .from('slots')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('date', date)
      .neq('id', slotId) // Ignore the current slot
      .order('start_time', { ascending: true });
      
    if (conflictError) throw conflictError;
    
    // If worker is specified, only check for conflicts with that worker
    const relevantSlots = workerId 
      ? conflictingSlots?.filter(slot => slot.worker_id === workerId)
      : conflictingSlots;
    
    // Check for any overlaps with the extended time
    const hasConflict = relevantSlots?.some(slot => {
      // If the new end time is after or equal to the start time of another slot
      // and the current slot's start time is before the other slot's end time
      return newEndTime > slot.start_time && currentSlot.start_time < slot.end_time;
    }) || false;
    
    return !hasConflict;
  } catch (error) {
    console.error('Error checking if slot can be extended:', error);
    return false;
  }
};

/**
 * Generate possible extension options in increments
 */
export const generateExtensionOptions = (
  currentEndTime: string,
  incrementMinutes: number = 15,
  maxExtensions: number = 4
): string[] => {
  const options: string[] = [];
  const [hours, minutes] = currentEndTime.split(':').map(Number);
  
  const currentTimeObj = new Date();
  currentTimeObj.setHours(hours, minutes, 0, 0);
  
  for (let i = 1; i <= maxExtensions; i++) {
    const newTimeObj = new Date(currentTimeObj);
    newTimeObj.setMinutes(newTimeObj.getMinutes() + (incrementMinutes * i));
    
    // Format as HH:MM
    const newHours = newTimeObj.getHours().toString().padStart(2, '0');
    const newMinutes = newTimeObj.getMinutes().toString().padStart(2, '0');
    const newTimeStr = `${newHours}:${newMinutes}`;
    
    options.push(newTimeStr);
  }
  
  return options;
};
