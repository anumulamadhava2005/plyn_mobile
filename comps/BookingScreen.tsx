import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Button,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createRazorpayOrder, loadRazorpayScript, updateBookingAfterPayment, verifyRazorpayPayment } from '@/utils/razorpayUtils';
import RazorpayCheckout from 'react-native-razorpay';
import { supabase } from '@/integrations/supabase/client';
import { getUserCoins } from '@/utils/userUtils';
import { useAuth } from '@/Context/AuthContext';
import { bookSlot, createBooking } from '@/utils/bookingUtils';
import { clearAvailabilityCache } from '@/utils/workerSchedulingUtils';

type PaymentOption = 'online' | 'salon';


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

const BookingScreen = ({ route, navigation }: any) => {
  const {
    salonId,
    salonName,
    services,
    date,
    timeSlot,
    email,
    phone,
    address,
    notes,
    totalPrice,
    totalDuration,
    slotId,
    workerId,
    workerName,
    merchantRazorpayId,
  } = route.params as any;

  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>('online');
  console.log(address)

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
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.headerText}>Booking summary</Text>
      </View>

      {/* Salon Card */}
      <View style={styles.card}>
        <Image
          source={{ uri: 'https://i.pinimg.com/736x/ca/51/8e/ca518e95fe8db4986ea7a51d9af85a0e.jpg' }} // Replace with actual salon image
          style={styles.image}
        />
        <View style={{ flex: 1, marginLeft: 10,flexDirection: 'column', justifyContent: 'space-between' }}>
          <Text style={styles.salonName}>{salonName}</Text>
          <Text style={styles.location}>{address}</Text>
          <Text style={styles.rating}>⭐ 4.7 (312)</Text>
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking details</Text>
        <Text style={[styles.valueText, {marginBottom: 6}] }>Date</Text>
        <Text style={styles. detailText}>{date} at {timeSlot}</Text>

        <Text style={[styles.valueText, { marginTop: 12, marginBottom: 6 }]}>Stylist</Text>
        <Text style={styles.detailText}>{workerName || 'Any stylist'} - {totalDuration} Mins</Text>
      </View>

      {/* Payment Options */}
      <View style={[styles.section, {marginTop: 40}]}>
        <Text style={styles.sectionTitle}>Payment</Text>

        {[
          {
            value: 'online',
            title: 'Pay Online Now',
            subtitle: 'Secure your booking instantly',
          },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.paymentOption}
            onPress={() => setSelectedPayment(option.value as PaymentOption)}
          >
            <View>
              <Text style={styles.radioTitle}>{option.title}</Text>
              <Text style={styles.radioSubtitle}>{option.subtitle}</Text>
            </View>
            <View style={styles.radioCircle}>
              {selectedPayment === option.value && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing Details</Text>
        {services.map((service: any, idx: number) => (
          <View key={idx} style={styles.priceRow}>
            <Text style={styles.priceLabel}>{service.name}</Text>
            <Text style={styles.priceValue}>₹{service.price.toFixed(2)}</Text>
          </View>
        ))}
        {notes ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Notes</Text>
            <Text style={styles.priceValue}>{notes}</Text>
          </View>
        ) : null}

        <View style={[styles.priceRow, { marginTop: 8 }]}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalText}>₹{totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Proceed Button */}
      <TouchableOpacity
        style={styles.proceedBtn}
        
        onPress={handleProcessPayment}
        disabled={paymentProcessing}
      >
        <Text style={styles.proceedText}>{paymentProcessing ? 'Processing...' : 'Complete Payment'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default BookingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    paddingTop: 40
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  salonName: {
    fontSize: 19,
    fontWeight: 'bold',
    padding: 4
  },
  location: {
    color: '#666',
    fontSize: 13,
    padding: 4
  },
  rating: {
    fontSize: 13,
    marginTop: 2,
    padding: 4,
  },
  distance: {
    fontSize: 12,
    color: '#888',
  },
  section: {
    marginBottom: 20,
    marginTop: 40
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#888',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
    justifyContent: 'space-between'
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  radioTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  radioSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
  },
  proceedBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 24,
  },
  proceedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
