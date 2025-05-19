
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  booking_date: string;
  time_slot: string;
  end_time: string;
  service_name: string;
  service_duration: number;
  customer_name: string;
  status: string;
}

interface UseWorkerScheduleProps {
  workerId: string;
  date: Date;
  merchantId: string;
}

const useWorkerSchedule = ({ workerId, date, merchantId }: UseWorkerScheduleProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isReallocateDialogOpen, setIsReallocateDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [targetWorkerId, setTargetWorkerId] = useState<string | null>(null);
  const [reallocateLoading, setReallocateLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch worker appointments when active worker or date changes
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        
        const formattedDate = format(date, 'yyyy-MM-dd');
        
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
          .eq('date', formattedDate)
          .eq('is_booked', true);
          
        if (bookedSlotsError) throw bookedSlotsError;
        
        // Get booking info for more details
        const appointmentsData: Appointment[] = [];
        
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
            
            appointmentsData.push({
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
        
        setAppointments(appointmentsData);
      } catch (error: any) {
        console.error('Error fetching appointments:', error);
        toast({
          title: 'Error',
          description: 'Failed to load appointments',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppointments();
  }, [workerId, date, toast]);

  const handleReallocate = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsReallocateDialogOpen(true);
  };

  const confirmReallocate = (workerId: string) => {
    setTargetWorkerId(workerId);
    setConfirmDialogOpen(true);
  };
  
  const executeReallocate = async () => {
    if (!selectedAppointment || !targetWorkerId) return;
    
    try {
      setReallocateLoading(true);
      
      // Get the slot to update
      const { data: slotData, error: slotError } = await supabase
        .from('slots')
        .select('*')
        .eq('id', selectedAppointment.id)
        .single();
      
      if (slotError) throw slotError;
      
      // Update the slot with new worker
      const { error: updateError } = await supabase
        .from('slots')
        .update({ worker_id: targetWorkerId })
        .eq('id', selectedAppointment.id);
        
      if (updateError) throw updateError;
      
      toast({
        title: 'Appointment reallocated',
        description: 'The appointment has been successfully reassigned to another worker.',
        variant: 'default',
      });
      
      // Refresh appointments data to reflect changes
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Fetch updated appointments for current worker
      const { data: updatedAppts } = await supabase
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
        .eq('date', formattedDate)
        .eq('is_booked', true);
      
      // Process updated data for display
      const processAppointmentsData = async (slots: any[] | null) => {
        const appointmentsData: Appointment[] = [];
        
        if (slots && slots.length > 0) {
          for (const slot of slots) {
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
            
            appointmentsData.push({
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
        
        return appointmentsData;
      };
      
      const updatedAppointments = await processAppointmentsData(updatedAppts);
      setAppointments(updatedAppointments);
      
    } catch (error: any) {
      console.error('Error reallocating slot:', error);
      toast({
        title: 'Error',
        description: 'Failed to reallocate appointment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setReallocateLoading(false);
      setConfirmDialogOpen(false);
      setIsReallocateDialogOpen(false);
      setSelectedAppointment(null);
      setTargetWorkerId(null);
    }
  };

  return {
    appointments,
    loading,
    isReallocateDialogOpen,
    selectedAppointment,
    confirmDialogOpen,
    reallocateLoading,
    handleReallocate,
    confirmReallocate,
    executeReallocate,
    setIsReallocateDialogOpen,
    setConfirmDialogOpen
  };
};

export default useWorkerSchedule;
