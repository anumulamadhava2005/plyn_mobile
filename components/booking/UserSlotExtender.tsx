/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import Button from '@/components/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Text, View } from 'react-native';

interface UserSlotExtenderProps {
    bookingId: string;
    currentEndTime: string;
    date: string;
    onExtensionComplete?: () => void;
}

interface Service {
    id: string;
    name: string;
    price: number;
    duration: number;
}

const UserSlotExtender: React.FC<UserSlotExtenderProps> = ({
    bookingId,
    currentEndTime,
    date,
    onExtensionComplete
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [extensionOptions, setExtensionOptions] = useState<string[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [slotId, setSlotId] = useState<string | null>(null);

    // Fetch booking details when opened
    useEffect(() => {
        if (isOpen) {
            fetchBookingDetails();
            generateExtensionOptions();
        }
    }, [isOpen]);

    // Fetch available services when merchant ID is available
    useEffect(() => {
        if (merchantId) {
            fetchServices();
        }
    }, [merchantId]);

    const fetchBookingDetails = async () => {
        try {
            setIsLoading(true);

            // Get booking info
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .select('merchant_id, worker_id, slot_id')
                .eq('id', bookingId)
                .single();

            if (bookingError) throw bookingError;

            if (booking) {
                setMerchantId(booking.merchant_id);
                setWorkerId(booking.worker_id);
                setSlotId(booking.slot_id);
            }
        } catch (error: any) {
            console.error('Error fetching booking details:', error);

        } finally {
            setIsLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            if (!merchantId) {
                setServices([]);
                return;
            }
            const { data: serviceData, error } = await supabase
                .from('services')
                .select('id, name, price, duration')
                .eq('merchant_id', merchantId);

            if (error) throw error;

            if (serviceData) {
                setServices(serviceData);
            }
        } catch (error: any) {
            console.error('Error fetching services:', error);
        }
    };

    const generateExtensionOptions = () => {
        const options: string[] = [];
        const [hours, minutes] = currentEndTime.split(':').map(Number);

        const currentTimeObj = new Date();
        currentTimeObj.setHours(hours, minutes, 0, 0);

        // Generate 4 options in 15 minute increments
        for (let i = 1; i <= 4; i++) {
            const newTimeObj = new Date(currentTimeObj);
            newTimeObj.setMinutes(newTimeObj.getMinutes() + (15 * i));

            // Format as HH:MM
            const newHours = newTimeObj.getHours().toString().padStart(2, '0');
            const newMinutes = newTimeObj.getMinutes().toString().padStart(2, '0');
            const newTimeStr = `${newHours}:${newMinutes}`;

            options.push(newTimeStr);
        }

        setExtensionOptions(options);
    };

    const handleTimeSelection = async (time: string) => {
        setSelectedTime(time);
        setIsChecking(true);
        setIsAvailable(null);

        try {
            // Check if there are any conflicts for worker's schedule
            if (workerId && slotId) {
                const { data: conflictingSlots, error } = await supabase
                    .from('slots')
                    .select('id')
                    .eq('worker_id', workerId)
                    .eq('date', date)
                    .neq('id', slotId)
                    .gt('start_time', currentEndTime)
                    .lt('start_time', time);

                if (error) throw error;

                setIsAvailable(conflictingSlots.length === 0);
            } else {
                setIsAvailable(true);
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            setIsAvailable(false);
        } finally {
            setIsChecking(false);
        }
    };

    const handleServiceSelection = (serviceId: string) => {
        setSelectedService(serviceId);
    };

    const handleExtend = async () => {
        if (!selectedTime || !isAvailable || !slotId) return;

        setIsLoading(true);

        try {
            // 1. Get current slot details
            const { data: currentSlot, error: slotError } = await supabase
                .from('slots')
                .select('start_time, service_name, service_price, service_duration')
                .eq('id', slotId)
                .single();

            if (slotError) throw slotError;

            // 2. Calculate the new duration in minutes
            const startParts = currentSlot.start_time.split(':').map(Number);
            const endParts = selectedTime.split(':').map(Number);
            const startMinutes = startParts[0] * 60 + startParts[1];
            const endMinutes = endParts[0] * 60 + endParts[1];
            const durationMinutes = endMinutes - startMinutes;

            // 3. Prepare service information for the extension
            let serviceName = currentSlot.service_name;
            let servicePrice = currentSlot.service_price;

            // If a new service is selected, get its details
            if (selectedService) {
                const selectedServiceDetails = services.find(s => s.id === selectedService);
                if (selectedServiceDetails) {
                    serviceName = `${currentSlot.service_name} + ${selectedServiceDetails.name}`;
                    servicePrice = Number(currentSlot.service_price) + Number(selectedServiceDetails.price);
                }
            }

            // 4. Update the slot with the new end time and duration
            const { error: updateError } = await supabase
                .from('slots')
                .update({
                    end_time: selectedTime,
                    service_duration: durationMinutes,
                    service_name: serviceName ?? undefined,
                    service_price: servicePrice,
                    updated_at: new Date().toISOString()
                })
                .eq('id', slotId);

            if (updateError) throw updateError;

            // 5. Update the booking's service details
            const { error: bookingUpdateError } = await supabase
                .from('bookings')
                .update({
                    service_duration: durationMinutes,
                    service_name: serviceName ?? undefined,
                    service_price: servicePrice,
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (bookingUpdateError) throw bookingUpdateError;


            setIsOpen(false);

            if (onExtensionComplete) {
                onExtensionComplete();
            }
        } catch (error: any) {
            console.error('Error extending slot:', error);

        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    size="sm"
                    className="flex items-center gap-1"
                    onPress={() => setIsOpen(true)}
                >
                    Extend Booking
                </Button>
            </DialogTrigger>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>

                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extend Your Appointment</DialogTitle>
                        <DialogDescription>
                            Choose how much longer you need and add additional services if desired.
                        </DialogDescription>
                    </DialogHeader>

                    <>
                        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>Current End Time:</Text>
                        <Badge variant="outline" style={{ fontSize: 16, alignSelf: 'flex-start', marginBottom: 16 }}>
                            {currentEndTime}
                        </Badge>

                        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>Select New End Time:</Text>
                        <>
                            {extensionOptions.map((time) => (
                                <Button
                                    key={time}
                                    variant={selectedTime === time ? "default" : "outline"}
                                    size="sm"
                                    style={{ marginBottom: 8, alignSelf: 'flex-start' }}
                                    onPress={() => handleTimeSelection(time)}
                                >
                                    {time}
                                </Button>
                            ))}
                        </>

                        {isChecking && (
                            <Text style={{ marginTop: 12, fontSize: 14, textAlign: 'center' }}>
                                Checking availability...
                            </Text>
                        )}

                        {isAvailable === false && selectedTime && (
                            <Text style={{ color: 'red', fontSize: 14, marginTop: 8 }}>
                                This time conflicts with another appointment.
                            </Text>
                        )}

                        {isAvailable && selectedTime && (
                            <Text style={{ color: 'green', fontSize: 14, marginTop: 8 }}>
                                This time is available for extension.
                            </Text>
                        )}

                        <Text style={{ fontSize: 14, fontWeight: '500', marginTop: 16, marginBottom: 8 }}>
                            Add a service for the extended time (optional):
                        </Text>
                        {services.length > 0 ? (
                            // Replace Select with a simple Picker for React Native
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    style={{ marginBottom: 8, alignSelf: 'flex-start' }}
                                    onPress={() => {
                                        // You may want to show a modal or action sheet for service selection in real app
                                        // For demo, just pick the first service
                                        if (services.length > 0) handleServiceSelection(services[0].id);
                                    }}
                                >
                                    {selectedService
                                        ? services.find(s => s.id === selectedService)?.name
                                        : "Select a service"}
                                </Button>
                                {selectedService && (
                                    <Text style={{ fontSize: 12, color: '#888' }}>
                                        {services.find(s => s.id === selectedService)?.name} - $
                                        {services.find(s => s.id === selectedService)?.price} (
                                        {services.find(s => s.id === selectedService)?.duration} min)
                                    </Text>
                                )}
                            </>
                        ) : (
                            <Text style={{ fontSize: 14, color: '#888' }}>Loading available services...</Text>
                        )}
                    </>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onPress={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onPress={handleExtend}
                            isDisabled={!selectedTime || isLoading || !isAvailable}
                        >
                            {isLoading ? (
                                <>
                                    Extending...
                                </>
                            ) : (
                                'Extend Booking'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </View>
    );
};

export default UserSlotExtender;
