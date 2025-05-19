import React, { use, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Button } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createRazorpayOrder, loadRazorpayScript, openRazorpayCheckout, updateBookingAfterPayment, verifyRazorpayPayment } from '@/utils/razorpayUtils';
import { supabase } from '@/integrations/supabase/client';
import { getUserCoins } from '@/utils/userUtils';
import { useAuth } from '@/Context/AuthContext';
import { bookSlot, createBooking } from '@/utils/bookingUtils';
import { clearAvailabilityCache } from '@/utils/workerSchedulingUtils';
import { format } from 'date-fns';

interface PaymentDetails {
  paymentMethod: string;
  amount: number;
  currency?: string;
  booking?: any;
  orderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  account_id?: string;
}

interface PaymentHookReturn {
  processPayment: (details: PaymentDetails) => Promise<void>;
  isProcessing: boolean;
  paymentError: string | null;
  handleRazorpayPayment: (orderId: string, keyId: string, paymentDetails: any) => Promise<void>;
}


const usePayment = (): PaymentHookReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const navigation = useNavigation();

  // Ensure Razorpay script is loaded
  useEffect(() => {
    loadRazorpayScript().then(loaded => {
      console.log(`Razorpay script loaded: ${loaded}`);
    });
  }, []);

  // Handle Razorpay payment process
  const handleRazorpayPayment = async (orderId: string, keyId: string, paymentDetails: any) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const options = {
        description: 'Booking Payment',
        image: 'https://your-logo-url.com/logo.png', // optional
        currency: paymentDetails.currency || 'INR',
        key: keyId,
        amount: paymentDetails.amount * 100, // Razorpay needs amount in paise
        name: paymentDetails.booking?.salonName || 'Salon Booking',
        order_id: orderId, // Include the required order_id property
        prefill: {
          email: paymentDetails.booking?.email,
          contact: paymentDetails.booking?.phone,
          name: paymentDetails.booking?.customerName,
        },
        theme: { color: '#53a20e' },
      };

      const response = await RazorpayCheckout.open(options);
      console.log('Payment successful:', response);

      const verifyResult: any = await verifyRazorpayPayment(
        orderId,
        response.razorpay_payment_id,
        response.razorpay_signature
      );

      if (!verifyResult.success || !verifyResult.verified) {
        throw new Error('Payment verification failed');
      }

      if (paymentDetails.booking?.id) {
        await updateBookingAfterPayment(paymentDetails.booking.id, orderId);
      }

      Alert.alert('Payment Successful', 'Your payment was successful!')
    } catch (error: any) {
      console.error('Razorpay error:', error);
      setPaymentError(error.description || error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };


  // Main payment processing function
  const processPayment = async (details: PaymentDetails) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { paymentMethod, amount, booking } = details;

      console.log('Processing payment with method:', paymentMethod);
      console.log('Payment details:', details);

      // Handle Razorpay payments
      if (paymentMethod === 'razorpay') {
        // Create a Razorpay order
        const paymentData = await createRazorpayOrder('razorpay', amount, booking);

        if (paymentData.success && paymentData.payment.paymentId) {
          // Open Razorpay checkout
          await handleRazorpayPayment(
            paymentData.payment.paymentId,
            paymentData.payment.keyId || 'rzp_test_CABuOHaSHHGey2', // Use test key as fallback
            {
              amount,
              booking
            }
          );
        } else {
          throw new Error('Failed to create Razorpay order');
        }

        return;
      }

      // Handle PLYN Coins payments
      if (paymentMethod === 'plyn_coins') {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('User not authenticated');
        }

        const userId = userData.user.id;
        console.log('Processing PLYN coins payment for user:', userId);

        // Get user's coin balance
        const userCoins = await getUserCoins(userId);
        const coinsRequired = amount * 2;

        console.log(`User has ${userCoins} coins, requires ${coinsRequired} coins`);

        if (userCoins < coinsRequired) {
          throw new Error(`Insufficient PLYN coins. You need ${coinsRequired} coins, but you have ${userCoins}.`);
        }

        // Create payment via the edge function
        const paymentData = await createRazorpayOrder('plyn_coins', amount, booking);

        if (!paymentData.success) {
          throw new Error('Failed to process PLYN coins payment');
        }

        // If there's a booking ID, update the booking status
        if (booking?.id) {
          await updateBookingAfterPayment(
            booking.id,
            paymentData.payment.paymentId
          );
        }

        // Navigate to confirmation
        // navigation.navigate('/booking-confirmation', {
        //   state: {
        //     bookingId: booking?.id || '',
        //     salonName: booking?.salonName || '',
        //     services: booking?.services || [],
        //     date: booking?.date || '',
        //     timeSlot: booking?.timeSlot || '',
        //     totalPrice: booking?.totalPrice || 0,
        //     totalDuration: booking?.totalDuration || 0,
        //     paymentDetails: {
        //       paymentMethod: 'plyn_coins',
        //       paymentId: paymentData.payment.paymentId
        //     },
        //     paymentStatus: 'completed',
        //     coinsUsed: coinsRequired
        //   }
        // });

        return;
      }

      // For any other payment methods
      throw new Error(`Payment method ${paymentMethod} is not supported yet`);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      setPaymentError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processPayment,
    isProcessing,
    paymentError,
    handleRazorpayPayment
  };
};
const PaymentScreen = ({ navigation, route }: any) => {
  const {
    salonId, salonName, services, date, timeSlot, email, phone, notes, totalPrice, totalDuration, slotId, workerId, workerName, merchantRazorpayId,
  } = route.params;
  console.log(route.params)
  const state = route.params;
  console.log("State in PaymentScreen:", state);
  const [paymentMethod, setPaymentMethod] = useState<string>('razorpay'); // Default to Razorpay

  const [isBookingCreated, setIsBookingCreated] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const { user } = useAuth();
  const [userCoins, setUserCoins] = React.useState(0);



  // Ensure Razorpay script is loaded
  useEffect(() => {
    loadRazorpayScript().then(loaded => {
      console.log(`Razorpay script loaded: ${loaded}`);
    });
  }, []);

  const { processPayment, isProcessing: paymentProcessing } = usePayment();
  // Load Razorpay script and fetch user coins
  useEffect(() => {
    loadRazorpayScript();

    const fetchUserCoins = async () => {
      if (user) {
        const coins = await getUserCoins(user?.id);
        setUserCoins(coins);
      }
    };

    if (state) {
      console.log("Payment state:", {
        salonId: state.salonId,
        date: state.date,
        timeSlot: state.timeSlot,
        slotId: state.slotId
      });
    }

    fetchUserCoins();
  }, [user, state]);


  // Create booking record
  const createBookingRecord = async () => {

    try {
      // Verify slot availability
      const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('is_booked, worker_id')
        .eq('id', state.slotId)
        .maybeSingle();

      if (slotError) {
        console.error("Error checking slot availability:", slotError);
        throw new Error(`Error checking slot availability: ${slotError.message}`);
      }

      if (!slot) {
        console.error("Slot not found:", state.slotId);
        throw new Error('Slot not found. Please go back and select another time.');
      }

      if (slot.is_booked) {
        console.error("Slot is already booked:", state.slotId);
        throw new Error('This time slot has already been booked. Please select another time.');
      }

      // Book the slot (mark as booked)
      try {
        await bookSlot(
          state.slotId,
          state.services.map((service: any) => service.name).join(", "),
          state.totalDuration,
          state.totalPrice
        );

        clearAvailabilityCache(state.salonId, state.date);
      } catch (bookError: any) {
        console.error("Error booking slot:", bookError);
        throw new Error(`Failed to book slot: ${bookError.message}`);
      }

      // Create booking record, but status remains 'pending' until payment is confirmed
      const bookingData = {
        user_id: user?.id,
        merchant_id: state.salonId,
        salon_name: state.salonName,
        service_name: state.services.map((service: any) => service.name).join(", "),
        service_price: state.totalPrice,
        service_duration: state.totalDuration,
        booking_date: state.date,
        time_slot: state.timeSlot,
        customer_email: state.email,
        customer_phone: state.phone || '',
        additional_notes: state.notes || '',
        status: 'pending', // Will be updated to 'confirmed' after payment
        slot_id: state.slotId,
        worker_id: state.workerId || slot.worker_id || null
      };

      const bookingResponse = await createBooking(bookingData);
      return bookingResponse;
    } catch (error: any) {
      console.error("Error creating booking:", error);
      return null;
    }
  };
  const handleProcessPayment = async () => {

    try {
      // Create booking if not already created
      let currentBookingId = bookingId;
      if (!isBookingCreated) {
        const bookingResult = await createBookingRecord();
        if (!bookingResult) {
          return; // Error already handled in createBookingRecord
        }
        setIsBookingCreated(true);
        setBookingId(bookingResult.id);
        currentBookingId = bookingResult.id;
      }

      // Process payment based on selected method
      const bookingDetails = {
        id: currentBookingId,
        user_id: user?.id,
        merchant_id: state.salonId,
        salonName: state.salonName,
        services: state.services,
        date: state.date,
        timeSlot: state.timeSlot,
        totalPrice: state.totalPrice,
        totalDuration: state.totalDuration,
        email: state.email,
        phone: state.phone,
        merchantRazorpayId: state.merchantRazorpayId,
      };

      await processPayment({
        paymentMethod,
        amount: state.totalPrice,
        currency: 'INR',
        booking: bookingDetails
      });

    } catch (error: any) {
      console.error("Payment processing error:", error);
    }
  };

  const formattedDate = state.date
    ? format(new Date(state.date), "EEEE, MMMM d, yyyy")
    : "Unknown date";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Booking</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{salonName}</Text>
        <Text style={styles.item}>📅 {date}</Text>
        <Text style={styles.item}>⏰ {timeSlot} - Duration: {totalDuration} min</Text>
        <Text style={styles.section}>Selected Services</Text>
        {services.map((s: any, i: any) => (
          <Text key={i} style={styles.item}>✔️ {s.name} — ₹{s.price}</Text>
        ))}
        <Text style={styles.total}>Total: ₹{totalPrice}</Text>
      </View>
      <Button
        onPress={handleProcessPayment}
        disabled={paymentProcessing}
        title={paymentProcessing ? 'Processing...' : 'Complete Payment'}
      />
    </View>
  );
}

export default PaymentScreen;
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f0f0f0', flex: 1, marginTop: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 24 },
  label: { fontSize: 18, fontWeight: '600', color: '#fff' },
  item: { fontSize: 14, color: '#ccc', marginTop: 6 },
  section: { marginTop: 12, fontWeight: 'bold', color: '#fff' },
  total: { marginTop: 10, fontSize: 16, fontWeight: '600', color: 'white' },
  payButton: {
    backgroundColor: '#7B3EF2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  payText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
