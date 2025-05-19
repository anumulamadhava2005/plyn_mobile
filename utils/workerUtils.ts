
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addMinutes, isBefore } from "date-fns";
import { WorkerAvailability, WorkerData, MerchantSettings } from "@/types/admin";

/**
 * Get all workers for a merchant
 */
export const fetchMerchantWorkers = async (merchantId: string): Promise<WorkerData[]> => {
  try {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("is_active", true);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching merchant workers:", error);
    throw error;
  }
};

/**
 * Create default workers for a merchant
 */
export const createDefaultWorkers = async (merchantId: string, count: number = 1) => {
  try {
    const workers = [];
    for (let i = 1; i <= count; i++) {
      workers.push({
        merchant_id: merchantId,
        name: `Worker ${i}`,
        is_active: true
      });
    }
    
    const { data, error } = await supabase
      .from("workers")
      .insert(workers)
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating default workers:", error);
    throw error;
  }
};

/**
 * Create or update merchant settings
 */
export const upsertMerchantSettings = async (
  merchantId: string, 
  settings: {
    total_workers?: number;
    working_hours_start?: string;
    working_hours_end?: string;
    break_start?: string | null;
    break_end?: string | null;
    worker_assignment_strategy?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from("merchant_settings")
      .upsert({
        merchant_id: merchantId,
        ...settings
      })
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating merchant settings:", error);
    throw error;
  }
};

/**
 * Get merchant settings
 */
export const getMerchantSettings = async (merchantId: string): Promise<MerchantSettings | null> => {
  try {
    const { data, error } = await supabase
      .from("merchant_settings")
      .select("*")
      .eq("merchant_id", merchantId)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        // No settings found, create default
        const defaultSettings = {
          merchant_id: merchantId,
          total_workers: 1,
          working_hours_start: "09:00",
          working_hours_end: "17:00",
          worker_assignment_strategy: "next-available"
        };
        
        const { data: newData, error: insertError } = await supabase
          .from("merchant_settings")
          .insert(defaultSettings)
          .select()
          .single();
          
        if (insertError) throw insertError;
        return newData;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching merchant settings:", error);
    throw error;
  }
};

/**
 * Find the next available worker for a given time slot
 */
export const findAvailableWorker = async (
  merchantId: string, 
  date: string, 
  startTime: string, 
  duration: number
): Promise<WorkerAvailability | null> => {
  try {
    // Get all workers for this merchant
    const { data: workers, error: workersError } = await supabase
      .from("workers")
      .select("id, name, specialty")
      .eq("merchant_id", merchantId)
      .eq("is_active", true);
      
    if (workersError) throw workersError;
    
    if (!workers || workers.length === 0) {
      console.log("No workers found for this merchant");
      return null;
    }
    
    // Calculate end time
    const startDateTime = new Date(`${date}T${startTime}`);
    const endTime = format(addMinutes(startDateTime, duration), "HH:mm");
    
    // Get all booked slots for this date and these workers
    const { data: bookedSlots, error: slotsError } = await supabase
      .from("slots")
      .select("*")
      .eq("date", date)
      .eq("merchant_id", merchantId)
      .eq("is_booked", true)
      .in("worker_id", workers.map(w => w.id));
      
    if (slotsError) throw slotsError;
    
    // Get worker unavailability periods
    const { data: unavailablePeriods, error: unavailabilityError } = await supabase
      .from("worker_unavailability")
      .select("*")
      .eq("date", date)
      .in("worker_id", workers.map(w => w.id));
      
    if (unavailabilityError) throw unavailabilityError;
    
    // For each worker, check if they're available during the requested time
    for (const worker of workers) {
      // Check booked slots
      const workerBookings = bookedSlots?.filter(slot => slot.worker_id === worker.id) || [];
      
      // Check unavailability
      const workerUnavailability = unavailablePeriods?.filter(period => period.worker_id === worker.id) || [];
      
      // Check if worker is busy at requested time
      const isWorkerBusy = workerBookings.some(booking => {
        const bookingStart = booking.start_time;
        const bookingEnd = booking.end_time;
        
        // Check for overlapping
        return (startTime < bookingEnd && endTime > bookingStart);
      });
      
      // Check if worker is unavailable at requested time
      const isWorkerUnavailable = workerUnavailability.some(period => {
        // Check for overlapping with unavailability periods
        return (startTime < period.end_time && endTime > period.start_time);
      });
      
      if (!isWorkerBusy && !isWorkerUnavailable) {
        // Worker is available
        return {
          workerId: worker.id,
          name: worker.name,
          nextAvailableTime: endTime,
          specialty: worker.specialty || undefined
        };
      }
    }
    
    // No available workers found
    return null;
  } catch (error) {
    console.error("Error finding available worker:", error);
    throw error;
  }
};

/**
 * Find all available time slots with workers for a given date
 */
export const findAvailableTimeSlots = async (
  merchantId: string, 
  date: string,
  serviceDuration: number
): Promise<Array<{ time: string, availableWorkers: WorkerAvailability[] }>> => {
  try {
    // Get merchant settings for working hours
    const settings = await getMerchantSettings(merchantId);
    
    const startHour = settings?.working_hours_start || "09:00";
    const endHour = settings?.working_hours_end || "17:00";
    
    // Get all workers for this merchant
    const workers = await fetchMerchantWorkers(merchantId);
    
    // Get all bookings for this date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from("slots")
      .select("*")
      .eq("date", date)
      .eq("merchant_id", merchantId)
      .eq("is_booked", true);
      
    if (bookingsError) throw bookingsError;
    
    // Get worker unavailability periods
    const { data: unavailablePeriods, error: unavailabilityError } = await supabase
      .from("worker_unavailability")
      .select("*")
      .eq("date", date)
      .in("worker_id", workers.map(w => w.id));
      
    if (unavailabilityError) throw unavailabilityError;
    
    // Generate time slots every 15 minutes from start to end
    const timeSlots: Array<{ time: string, availableWorkers: WorkerAvailability[] }> = [];
    const startTime = new Date(`${date}T${startHour}`);
    const endTime = new Date(`${date}T${endHour}`);
    const now = new Date();
    const currentDate = new Date(`${date}`);
    const isPastDate = isBefore(currentDate, now);

    // For past dates, no slots are available
    if (isPastDate) {
      return [];
    }
    
    // Current time for filtering past slots on current date
    const currentTime = format(now, "HH:mm");
    const isToday = format(now, "yyyy-MM-dd") === date;
    
    // Go through each 15-minute slot
    for (
      let slotTime = new Date(startTime); 
      slotTime < endTime; 
      slotTime = addMinutes(slotTime, 15)
    ) {
      const slotTimeStr = format(slotTime, "HH:mm");
      
      // Skip slots in the past for today
      if (isToday && slotTimeStr < currentTime) {
        continue;
      }
      
      // For each time slot, find available workers
      const availableWorkersForSlot: WorkerAvailability[] = [];
      
      for (const worker of workers) {
        // Calculate end time for this slot and worker
        const slotEndTime = format(addMinutes(slotTime, serviceDuration), "HH:mm");
        
        // Check if worker has bookings overlapping with this slot
        const isWorkerBooked = (existingBookings || []).some(booking => {
          if (booking.worker_id !== worker.id) return false;
          
          return (slotTimeStr < booking.end_time && slotEndTime > booking.start_time);
        });
        
        // Check if worker is unavailable during this slot
        const isWorkerUnavailable = (unavailablePeriods || []).some(period => {
          if (period.worker_id !== worker.id) return false;
          
          return (slotTimeStr < period.end_time && slotEndTime > period.start_time);
        });
        
        // If worker is available, add to the list
        if (!isWorkerBooked && !isWorkerUnavailable) {
          availableWorkersForSlot.push({
            workerId: worker.id,
            name: worker.name,
            nextAvailableTime: slotEndTime,
            specialty: worker.specialty || undefined
          });
        }
      }
      
      // Only add slots that have available workers
      if (availableWorkersForSlot.length > 0) {
        timeSlots.push({
          time: slotTimeStr,
          availableWorkers: availableWorkersForSlot
        });
      }
    }
    
    return timeSlots;
  } catch (error) {
    console.error("Error finding available time slots:", error);
    throw error;
  }
};

/**
 * Mark a worker as unavailable for a specific period
 */
export const markWorkerUnavailable = async (
  workerId: string,
  date: string,
  startTime: string,
  endTime: string,
  reason?: string
) => {
  try {
    const { data, error } = await supabase
      .from("worker_unavailability")
      .insert({
        worker_id: workerId,
        date,
        start_time: startTime,
        end_time: endTime,
        reason
      })
      .select();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error marking worker as unavailable:", error);
    throw error;
  }
};
