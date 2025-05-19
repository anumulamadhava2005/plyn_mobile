// components/appointments/AppointmentsList.tsx

import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
    Table, TableBody, TableCaption, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectGroup,
    SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pressable, ScrollView, Text, Touchable, TouchableOpacity, View, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

interface AppointmentsListProps {
    merchantId: string;
}

type Booking = {
    id: string;
    created_at: string;
    salon_name: string;
    booking_date: string;
    time_slot: string;
    service_name: string;
    service_price: number;
    status: string;
    customer_email: string;
    customer_phone: string;
    additional_notes?: string;
    user_id?: string;
    customer_name?: string;
    worker_id?: string;
    worker_name?: string;
};

const AppointmentsList: React.FC<AppointmentsListProps> = ({ merchantId }) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [monthName, setMonthName] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const scrollViewRef = React.useRef<ScrollView>(null);
    const [scrollViewWidth, setScrollViewWidth] = useState(0);
    const [dateButtonLayouts, setDateButtonLayouts] = useState<{ [date: string]: { x: number; width: number } }>({});


    useEffect(() => {
        if (merchantId) fetchBookings();
        getMonthName();
    }, [merchantId, filter]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('bookings')
                .select(`id, created_at, salon_name, booking_date, time_slot, service_name, service_price, status, customer_email, customer_phone, additional_notes, user_id, worker_id`)
                .eq('merchant_id', merchantId)
                .order('booking_date', { ascending: false });

            if (filter !== 'all') query = query.eq('status', filter);

            const { data, error } = await query;
            if (error) throw error;

            const enriched = await Promise.all((data || []).map(async (booking) => {
                let customerName = 'Anonymous';
                if (booking.user_id) {
                    const { data: user } = await supabase.from('profiles').select('username').eq('id', booking.user_id).single();
                    if (user) customerName = user.username;
                }

                let workerName = 'Not assigned';
                if (booking.worker_id) {
                    const { data: worker } = await supabase.from('workers').select('name').eq('id', booking.worker_id).single();
                    if (worker) workerName = worker.name;
                }

                return {
                    ...booking,
                    salon_name: booking.salon_name ?? '',
                    booking_date: booking.booking_date ?? '',
                    time_slot: booking.time_slot ?? '',
                    service_price: booking.service_price ?? 0,
                    customer_email: booking.customer_email ?? '',
                    customer_phone: booking.customer_phone ?? '',
                    additional_notes: booking.additional_notes ?? '',
                    user_id: booking.user_id ?? '',
                    worker_id: booking.worker_id ?? '',
                    customer_name: customerName,
                    worker_name: workerName,
                };
            }));

            setBookings(enriched);
            if (enriched.length) setSelectedDate(enriched[0].booking_date);
        } catch (err) {
            console.error("Error fetching bookings:", err);
        } finally {
            setLoading(false);
        }
    };

    const getMonthName = () => {
        const date = new Date();
        setMonthName(format(date, 'MMMM'));
    };

    const StatusBadge = (status: string) => {
        const badgeStyles: Record<'pending' | 'confirmed' | 'completed' | 'cancelled', string> = {
            pending: 'bg-yellow-500',
            confirmed: 'bg-green-500',
            completed: 'bg-blue-500',
            cancelled: 'bg-red-500',
        };
        const style =
            (badgeStyles as Record<string, string>)[status] || 'bg-muted';
        return <Badge className={style}>{status}</Badge>;
    };

    const dates = Array.from(new Set(
        bookings.map((b) => b.booking_date).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    ));

    const filteredBookings = bookings.filter(b => b.booking_date === selectedDate);

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.datesScroll}
                onContentSizeChange={() => {
                    if (selectedDate && dateButtonLayouts[selectedDate]) {
                        const { x, width } = dateButtonLayouts[selectedDate];
                        scrollViewRef.current?.scrollTo({
                            x: x - (scrollViewWidth / 2) + (width / 2),
                            animated: true,
                        });
                    }
                }}
                onLayout={e => setScrollViewWidth(e.nativeEvent.layout.width)}
            >
                {dates.map(date => (
                    <TouchableOpacity
                        key={date}
                        onPress={() => setSelectedDate(date)}
                        style={[
                            styles.dateButton,
                            selectedDate === date ? styles.dateButtonSelected : styles.dateButtonUnselected
                        ]}
                    >
                        <Text style={[selectedDate !== date ?styles.dateDay : {color: 'white',fontWeight: 'bold',fontSize: 18,}]}>{format(new Date(date), 'd')}</Text>
                        <Text style={[selectedDate !== date ? styles.dateWeek: {color: 'white',fontSize: 14,}]}>{format(new Date(date), 'EEE')}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'flex-start',backgroundColor: 'white' }}>
                    <ActivityIndicator size="large" color="#000" />
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(item: Booking) => item.id}
                    renderItem={({ item }: { item: Booking }) => (
                        <View style={styles.bookingCard}>
                            <Text style={styles.timeSlot}>{item.time_slot}</Text>
                            <View style={styles.bookingHeader}>
                                <View>
                                    <Text style={styles.customerName}>{item.customer_name}</Text>
                                    <Text style={styles.serviceName}>{item.service_name}</Text>
                                </View>
                                <View style={{flexDirection: 'column', alignItems: 'center'}}>
                                {StatusBadge(item.status)}
                                </View>
                            </View>
                            <Text style={styles.timeSlotSub}>{item.time_slot}</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // light gray background
        padding: 16,
    },
    datesScroll: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        alignSelf: 'flex-start'
    },
    dateButton: {
        marginHorizontal: 6,
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb', // gray-200
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    dateButtonSelected: {
        backgroundColor: '#6366f1', // indigo-500
        borderColor: '#6366f1',
    },
    dateButtonUnselected: {
        backgroundColor: '#fff',
        borderColor: '#e5e7eb', // gray-200
    },
    dateDay: {
        color: '#111827', // gray-900
        fontWeight: 'bold',
        fontSize: 18,
    },
    dateWeek: {
        color: '#6b7280', // gray-500
        fontSize: 14,
    },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb', // gray-200
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    timeSlot: {
        color: '#6366f1', // indigo-500
        fontSize: 14,
        marginBottom: 4,
        fontWeight: '600',
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    customerName: {
        color: '#111827', // gray-900
        fontSize: 18,
        fontWeight: '700',
    },
    serviceName: {
        color: '#6b7280', // gray-500
        fontSize: 14,
        marginTop: 2,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#22c55e', // green-500
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d1d5db', // gray-300
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeSlotSub: {
        color: '#9ca3af', // gray-400
        fontSize: 12,
        marginTop: 4,
    },
});

export default AppointmentsList;
