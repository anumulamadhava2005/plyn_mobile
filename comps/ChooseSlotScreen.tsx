import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Button,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from '@/integrations/supabase/client';
import AntDesign from '@expo/vector-icons/AntDesign';
import { clearAvailabilityCache, getAvailableSlotsWithWorkers } from '@/utils/workerSchedulingUtils';
import { formatToISODate } from '@/lib/date-utils';
import { isPast } from 'date-fns';
import Skeleton from './Skeleton';
import { useAuth } from '@/Context/AuthContext';
import { checkSlotAvailability } from '@/utils/bookingUtils';
import DateTimePickerBottomSheet from '@/comps/DateTimePickerBottomSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Modalize } from 'react-native-modalize';
import { Calendar } from 'react-native-calendars';


const ChooseSlotScreen = ({ route, navigation }: any) => {
  const { salonId, selectedServices } = route.params;
  const totalPrice = selectedServices.reduce((sum: any, service: any) => sum + (service.price || 0), 0);
  console.log('Total Price:', totalPrice);
  const getDateOffset = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };
  const [salon, setSalon] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getDateOffset(0));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasExistingSlots, setHasExistingSlots] = useState<{ [key: string]: { id: string, workerId: string | null, isBooked: boolean } }>({});

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<any[]>([]);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedWorkerName, setSelectedWorkerName] = useState<string | null>(null);
  const getTotalDuration = () =>
    selectedServices.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

  const formattedDate = useMemo(() => {
    return formatToISODate(new Date(selectedDate));
  }, [selectedDate]);
  useEffect(() => {
    fetchSalon();
  }, []);

  useEffect(() => {
    if (salonId && selectedDate) {
      const controller = new AbortController();
      const signal = controller.signal;

      fetchAvailableSlots(signal);

      return () => {
        controller.abort();
      };
    }
  }, [salonId, formattedDate, getTotalDuration()]);

  const fetchSalon = async () => {
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', salonId)
      .single();
    setSalon(data);
  };
  const fetchAvailableSlots = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      console.log(`Fetching slots for date: ${formattedDate}`);

      // Fetch both available slots and existing slots in parallel
      const [availableSlotsPromise, existingSlotsPromise] = await Promise.all([
        // Get available time slots with workers for this date and service duration
        getAvailableSlotsWithWorkers(
          salonId,
          formattedDate,
          getTotalDuration()
        ),

        // Check if we have any existing slots in the database
        supabase
          .from('slots')
          .select('id, start_time, worker_id, is_booked')
          .eq('merchant_id', salonId)
          .eq('date', formattedDate)
      ]);

      // If request was aborted, don't update state
      if (signal?.aborted) return;

      const slots = availableSlotsPromise;
      const { data: existingSlots } = existingSlotsPromise;

      console.log(`Found ${slots.length} available slots for ${formattedDate}`);

      // Filter out slots that are in the past (completed)
      const currentTime = new Date();
      const filteredSlots = slots.filter(slot => {
        // Create a date object from the date and time
        const [hours, minutes] = slot.time.split(':').map(Number);
        const slotDateTime = new Date(new Date(selectedDate));
        slotDateTime.setHours(hours, minutes, 0, 0);

        // If the date is today, filter out past times
        if (formattedDate === formatToISODate(currentTime)) {
          return !isPast(slotDateTime);
        }

        return true;
      });

      setAvailableTimeSlots(filteredSlots);

      // Create a map of existing slots
      const existingSlotsMap: { [key: string]: { id: string, workerId: string | null, isBooked: boolean } } = {};

      if (existingSlots && existingSlots.length > 0) {
        existingSlots.forEach(slot => {
          // Only add to map if not booked or if it's not already in the map
          // Also check if the slot is in the past (completed)
          const [hours, minutes] = slot.start_time.split(':').map(Number);
          const slotDateTime = new Date(selectedDate);
          slotDateTime.setHours(hours, minutes, 0, 0);

          // Skip slots that are in the past
          if (isPast(slotDateTime) && formattedDate === formatToISODate(new Date(currentTime))) {
            return;
          }

          if (!existingSlotsMap[slot.start_time] || !slot.is_booked) {
            existingSlotsMap[slot.start_time] = {
              id: slot.id,
              workerId: slot.worker_id,
              isBooked: slot.is_booked
            };
          }
        });

        console.log(`Found ${Object.keys(existingSlotsMap).length} eligible existing slots in database`);
      } else {
        console.log("No existing slots found in database");
      }

      // Update the state with existing slots
      setHasExistingSlots(existingSlotsMap);
    } catch (error) {
      console.error("Error fetching available slots:", error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const durationText = `${getTotalDuration()} mins`;

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  };

  const dateTabs = [
    {
      label: new Date(getDateOffset(0)).getDate().toString(),
      date: getDateOffset(0),
      day: getDayName(getDateOffset(0))
    },
    {
      label: new Date(getDateOffset(1)).getDate().toString(),
      date: getDateOffset(1),
      day: getDayName(getDateOffset(1))
    },
    {
      label: new Date(getDateOffset(2)).getDate().toString(),
      date: getDateOffset(2),
      day: getDayName(getDateOffset(2))
    },
  ];


  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {

    setIsSubmitting(true);
    console.log("Submitting booking...");

    try {
      const formattedDate = formatToISODate(new Date(selectedDate));
      console.log(`Proceeding with date: ${formattedDate} and time: ${selectedTime}`);

      let slotIdToUse = selectedSlotId;
      let workerIdToUse = selectedWorkerId;
      let workerNameToUse = selectedWorkerName;

      if (!slotIdToUse || slotIdToUse === '') {
        console.log("No valid slot ID, checking availability...");
        const { available, slotId, workerId, workerName } = await checkSlotAvailability(
          salonId,
          formattedDate,
          selectedTime || '',
          getTotalDuration()
        );

        if (!available || !slotId) {
          setSelectedTime(null);
          setSelectedSlotId('');
          setSelectedWorkerId(null);
          setSelectedWorkerName(null);
          setIsSubmitting(false);
          return;
        }

        slotIdToUse = slotId;
        console.log(`Created new slot with ID: ${slotId}`);

        if (workerId) workerIdToUse = workerId;
        if (workerName) workerNameToUse = workerName;
      }

      if (!slotIdToUse || slotIdToUse === '') {
        setIsSubmitting(false);
        return;
      }

      console.log(`Using slot ID: ${slotIdToUse}`);

      clearAvailabilityCache(salonId, formattedDate);

      console.log(salon.business_address)

      navigation.navigate('BookingScreen', {
        salonId,
        salonName: salon.business_name,
        services: selectedServices,
        date: formattedDate,
        timeSlot: selectedTime,
        email: user?.user_metadata?.email,
        phone: user?.user_metadata?.phone,
        address: salon.business_address,
        notes,
        totalPrice,
        totalDuration: getTotalDuration(),
        slotId: slotIdToUse,
        workerId: workerIdToUse,
        workerName: workerNameToUse,
        merchantRazorpayId: salon.razorpay_id,
      });
    } catch (error: any) {
      console.error("Error proceeding to payment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onTimeSelect = (time: string, slotId: string, workerId?: string, workerName?: string) => {
    console.log(`Time selected: ${time}, SlotId: ${slotId || 'new'}, WorkerId: ${workerId || 'none'}`);
    setSelectedTime(time);
    setSelectedSlotId(slotId);
    setSelectedWorkerId(workerId || null);
    setSelectedWorkerName(workerName || null);

    const formattedDate = formatToISODate(new Date(selectedDate));
    clearAvailabilityCache(salonId, formattedDate);
  };
  const renderTimeSlots = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.slotGrid}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} style={styles.skeletonSlot} />
          ))}
        </View>
      );
    }

    if (availableTimeSlots.length === 0) {
      return (
        <View style={styles.noSlotsContainer}>
          <Text style={styles.noSlotsText}>No available slots for this date.</Text>
        </View>
      );
    }

    return (
      <View style={styles.slotGrid}>
        {availableTimeSlots.map(({ time, availableWorkers }) => {
          const isSelected = time === selectedTime;
          const slotInfo = hasExistingSlots[time];

          if (slotInfo?.isBooked || availableWorkers.length === 0) {
            return null;
          }

          const slotId = slotInfo ? slotInfo.id : '';
          const firstWorker = availableWorkers[0];
          const availableWorkerCount = availableWorkers.length;

          return (
            <TouchableOpacity
              key={time}
              style={[styles.slot, isSelected && styles.selectedSlot]}
              onPress={() => {
                console.log(`Selected time ${time} with slot ID: ${slotId}`);
                onTimeSelect(time, slotId, firstWorker.workerId, firstWorker.name);
              }}
            >
              <Text style={isSelected ? styles.selectedSlotText : styles.slotText}>
                {time}
              </Text>
              {availableWorkerCount > 0 && (
                <Text style={isSelected ? styles.selectedWorkerText : styles.workerCountText}>({availableWorkerCount})</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [loading, availableTimeSlots, selectedTime, hasExistingSlots, onTimeSelect]);

  const modalizeRef = useRef<Modalize>(null);
  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString); // e.g., '2024-09-10'
    modalizeRef.current?.close();
  };
  const openCalendar = () => {
    modalizeRef.current?.open();
  };

  return (
    <GestureHandlerRootView>
      <View style={{ flex: 1, backgroundColor: '#f0f0f0' }}>
        <ScrollView style={{ padding: 16, backgroundColor: '#f0f0f0' }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AntDesign name="left" size={24} color="black" />
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Date and Time</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Select Date</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateTabs}>
            {dateTabs.map((tab) => (
              <View>{(selectedDate === dateTabs[0].date && selectedDate === tab.date) ? (
                <Text style={[styles.durationText, { color: '#10b981', alignSelf: 'center', paddingRight: 12 }]}>
                  Today
                </Text>
              ) : (
                <Text style={[styles.durationText, { color: '#10b981' }]}>
                </Text>
              )}
                <TouchableOpacity
                  key={tab.label}
                  style={[
                    styles.dateTab,
                    selectedDate === tab.date && styles.selectedDateTab,
                  ]}
                  onPress={() => setSelectedDate(tab.date)}
                >
                  <Text style={[styles.dateLabel, selectedDate === tab.date && { color: '#10b981' }]}>{tab.label}</Text>
                  <Text style={[styles.durationText, selectedDate === tab.date && { color: '#10b981' }]}>{tab.day.slice(0, 3)}</Text>
                  <Text style={[styles.durationText, selectedDate === tab.date && { color: '#10b981' }]}>{durationText}</Text>
                </TouchableOpacity></View>
            ))}

            <TouchableOpacity style={styles.moreTab} onPress={() => openCalendar()}>
              <AntDesign name="calendar" size={24} color="#3b82f6" />
              <Text style={styles.moreText}>More</Text>
              <Text style={styles.moreText}>dates</Text>
            </TouchableOpacity>
          </ScrollView>

          <Text style={styles.title}>Select Time</Text>

          <View style={styles.slotContainer}>
            {/* {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slot,
                selectedSlot?.id === slot.id && styles.selectedSlot,
              ]}
              onPress={() => setSelectedSlot(slot)}
            >
              <Text
                style={
                  selectedSlot?.id === slot.id
                    ? styles.selectedSlotText
                    : styles.slotText
                }
              >
                {formatTime(slot.start_time)}
              </Text>
            </TouchableOpacity>
          ))} */}

            {renderTimeSlots}
          </View>

        </ScrollView>
        <TouchableOpacity style={[styles.bookButton, !selectedTime && { backgroundColor: 'grey' }]} onPress={() => handleSubmit()}>
          <Text style={styles.bookButtonText}>Confirm Booking</Text>
        </TouchableOpacity>
      </View>

      <Modalize
        ref={modalizeRef}
        adjustToContentHeight
        modalStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      >
        <View style={{ padding: 16 }}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={
              selectedDate
                ? {
                  [selectedDate]: { selected: true, marked: true, selectedColor: '#000' },
                }
                : {}
            }
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              selectedDayBackgroundColor: '#000',
              todayTextColor: '#000',
              arrowColor: '#000',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textMonthFontSize: 16,
              textDayHeaderFontWeight: '600',
            }}
          />
        </View>
      </Modalize>
    </GestureHandlerRootView>
  );
};

export default ChooseSlotScreen;

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  header: {
    marginVertical: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateTab: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  selectedDateTab: {
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  dateLabel: {
    fontWeight: 'bold',
    color: '#111827',
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  moreTab: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  moreText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  slotContainer: {
    flexDirection: 'column',
  },
  bookButton: {
    backgroundColor: 'blue',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
    position: 'relative',
    bottom: 20,
    width: '90%',
    alignSelf: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8, // You can polyfill this with margin if using an older RN version
  },
  slot: {
    width: '30%', // Approximate 3-column layout
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedSlot: {
    backgroundColor: '#4F46E5', // example primary color
  },
  slotText: {
    color: '#000',
    fontSize: 16,
  },
  selectedSlotText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workerCountText: {
    fontSize: 12,
    color: '#666',
  },
  selectedWorkerText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  noSlotsContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noSlotsText: {
    color: '#888',
    fontSize: 14,
  },
  skeletonSlot: {
    width: '30%',
    height: 40,
    borderRadius: 8,
    marginBottom: 12,
  },
});
