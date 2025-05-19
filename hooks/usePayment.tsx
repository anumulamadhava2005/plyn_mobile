/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserCoins } from '@/utils/userUtils';
import { PaymentDetails } from '@/types/admin';
import { 
  loadRazorpayScript, 
  openRazorpayCheckout, 
  verifyRazorpayPayment,
  createRazorpayOrder,
  updateBookingAfterPayment
} from '@/utils/razorpayUtils';

interface PaymentHookReturn {
  processPayment: (details: PaymentDetails) => Promise<void>;
  isProcessing: boolean;
  paymentError: string | null;
  handleRazorpayPayment: (orderId: string, keyId: string, paymentDetails: any) => Promise<void>;
}

export const usePayment = (): PaymentHookReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
      console.log(`Processing Razorpay payment for order: ${orderId}, key: ${keyId}`);
      
      // Make sure Razorpay script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      // Open Razorpay checkout modal
      openRazorpayCheckout(
        orderId,
        paymentDetails.amount,
        keyId,
        {
          customerName: paymentDetails.booking?.customerName,
          email: paymentDetails.booking?.email,
          phone: paymentDetails.booking?.phone,
          currency: paymentDetails.currency || 'INR'
        },
        // Success handler
        async (response) => {
          console.log('Payment successful:', response);
          
          try {
            // Verify the payment with our backend
            const verifyResult = await verifyRazorpayPayment(
              orderId,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            
            if (!verifyResult.success || !verifyResult.verified) {
              throw new Error('Payment verification failed');
            }
            
            // If there's a booking ID, update the booking status
            if (paymentDetails.booking?.id) {
              await updateBookingAfterPayment(
                paymentDetails.booking.id,
                orderId
              );
            }
            
            // Navigate to confirmation page
            navigate('/booking-confirmation', {
              state: {
                bookingId: paymentDetails.booking?.id || '',
                salonName: paymentDetails.booking?.salonName || '',
                services: paymentDetails.booking?.services || [],
                date: paymentDetails.booking?.date || '',
                timeSlot: paymentDetails.booking?.timeSlot || '',
                totalPrice: paymentDetails.amount || 0,
                totalDuration: paymentDetails.booking?.totalDuration || 0,
                paymentDetails: {
                  paymentMethod: 'razorpay',
                  paymentId: orderId,
                  razorpayPaymentId: response.razorpay_payment_id
                },
                paymentStatus: 'completed'
              }
            });
            
            toast({
              title: 'Payment Successful',
              description: 'Your payment was processed successfully.',
              variant: 'default',
            });
          } catch (error: any) {
            console.error('Error after payment:', error);
            setPaymentError(error.message || 'Error processing payment confirmation');
            toast({
              title: 'Payment Error',
              description: error.message || 'There was an error confirming your payment',
              variant: 'destructive',
            });
          } finally {
            setIsProcessing(false);
          }
        },
        // Error handler
        (error) => {
          console.error('Razorpay error:', error);
          setPaymentError(error.message || 'Payment processing failed');
          toast({
            title: 'Payment Failed',
            description: error.message || 'There was an error processing your payment',
            variant: 'destructive',
          });
          setIsProcessing(false);
        },
        // Modal close handler
        () => {
          console.log('Razorpay modal closed');
          setIsProcessing(false);
        }
      );
    } catch (error: any) {
      console.error('Razorpay payment error:', error);
      setPaymentError(error.message || 'Payment processing failed');
      toast({
        title: 'Payment Failed',
        description: error.message || 'There was an error processing your Razorpay payment',
        variant: 'destructive',
      });
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
        navigate('/booking-confirmation', {
          state: {
            bookingId: booking?.id || '',
            salonName: booking?.salonName || '',
            services: booking?.services || [],
            date: booking?.date || '',
            timeSlot: booking?.timeSlot || '',
            totalPrice: booking?.totalPrice || 0,
            totalDuration: booking?.totalDuration || 0,
            paymentDetails: {
              paymentMethod: 'plyn_coins',
              paymentId: paymentData.payment.paymentId
            },
            paymentStatus: 'completed',
            coinsUsed: coinsRequired
          }
        });
        
        toast({
          title: 'Payment Successful',
          description: `Your payment using ${coinsRequired} PLYN coins was processed successfully.`,
          variant: 'default',
        });
        
        return;
      }
      
      // For any other payment methods
      throw new Error(`Payment method ${paymentMethod} is not supported yet`);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      setPaymentError(error.message || 'Payment processing failed');
      toast({
        title: 'Payment Failed',
        description: error.message || 'There was an error processing your payment',
        variant: 'destructive',
      });
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
