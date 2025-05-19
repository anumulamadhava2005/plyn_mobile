import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useAuth } from '@/Context/AuthContext';
import { fetchUserBookings, cancelBookingAndRefund } from '@/utils/bookingUtils';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/booking/BookingCard';
import UserSlotExtender from '@/components/booking/UserSlotExtender';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/Button';
import { DialogTrigger } from '@/components/ui/dialog';

const MyBookings = () => {
    const { user, loading } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

    useEffect(() => {
        loadBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loading]);

    const loadBookings = async () => {
        if (loading) return;
        if (!user) {
            Alert.alert('Error', 'User not found. Please log in again.');
            return;
        }

        try {
            setIsLoading(true);
            const userBookings = await fetchUserBookings(user.id);
            setBookings(userBookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            Alert.alert('Error', 'Failed to load bookings. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
            { text: 'No' },
            {
                text: 'Yes',
                onPress: async () => {
                    try {
                        await cancelBookingAndRefund(bookingId);
                        if (!user) {
                            Alert.alert('Error', 'User not found. Please log in again.');
                            return;
                        }
                        const updatedBookings = await fetchUserBookings(user.id);
                        setBookings(updatedBookings);

                    } catch (error) {
                        console.error('Error cancelling booking:', error);
                        Alert.alert('Error', 'Failed to cancel booking. Please try again later.');
                    }
                },
            },
        ]);
    };

    const handleExtensionComplete = async () => {
        if (!user) return;
        const updatedBookings = await fetchUserBookings(user.id);
        setBookings(updatedBookings);
        Alert.alert('Success', 'Booking extension completed successfully.');
    };

    const getBookingTab = (status: string) => {
        if (status === 'completed') return 'completed';
        if (['cancelled', 'missed'].includes(status)) return 'cancelled';
        return 'upcoming';
    };


    // Helper function to get badge styling based on status
    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400';
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400';
            case 'missed':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-400';
            case 'pending':
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400';
        }
    };

    const filteredBookings = bookings.filter((booking) => getBookingTab(booking.status) === selectedTab);

    return (
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 50 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                My Bookings
            </Text>
            <Tabs
                value={selectedTab}
                onValueChange={(val: 'upcoming' | 'completed' | 'cancelled') => setSelectedTab(val)}
            >
                <TabsList>
                <TabsTrigger value="upcoming" label="Upcoming" />
                <TabsTrigger value="completed" label="Completed" />
                <TabsTrigger value="cancelled" label="Cancelled" />
                </TabsList>
            </Tabs>

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    {filteredBookings.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: '#6B7280' }}>No {selectedTab} bookings found.</Text>
                    ) : (
                        filteredBookings.map((booking) => (
                            <Card key={booking.id} style={{ marginBottom: 16, overflow: 'hidden' }}>
                                <CardContent style={{ padding: 0 }}>
                                    <View style={{ padding: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <View>
                                                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{booking.salon_name}</Text>
                                                <Text style={{ color: '#6B7280' }}>{booking.service_name}</Text>
                                            </View>
                                            <Badge
                                                style={{ marginTop: 0 }}
                                                className={getStatusBadgeStyle(booking.status)}
                                                variant={(booking.status === 'confirmed') ? 'default' : ((booking.status === 'upcoming') ? 'secondary' : (booking.status === 'completed' ? 'completed' : 'destructive'))}
                                            >
                                                <Text>
                                                    {(booking.status === "upcoming") ? "pending" : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </Text>
                                            </Badge>
                                        </View>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'column', marginBottom: 0 }}>
                                                <Text style={{ fontWeight: '500' }}>{booking.booking_date}</Text>
                                                <Text style={{ fontSize: 12, color: '#6B7280' }}>{booking.time_slot}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280' }}>Price</Text>
                                                <Text style={{ fontWeight: '500' }}>${booking.service_price}</Text>
                                            </View>
                                        </View>

                                        {(['upcoming', 'confirmed'].includes(booking.status)) && (
                                            <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
                                                <UserSlotExtender
                                                    bookingId={booking.id}
                                                    currentEndTime={booking.end_time || "18:00"}
                                                    date={booking.booking_date}
                                                    onExtensionComplete={handleExtensionComplete}
                                                />
                                                <View style={{ marginLeft: 8 }}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                                        onPress={() => handleCancelBooking(booking.id)}
                                                    >
                                                        Cancel Booking
                                                    </Button>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
};

export default MyBookings;
