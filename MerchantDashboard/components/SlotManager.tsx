import { Card, CardContent, CardHeader, CardTitle } from "@/components/booking/BookingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { createSlot, deleteSlot } from "@/utils/slotUtils";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ActivityIndicator } from "react-native";
import { Calendar } from "react-native-calendars";
import { Screen } from "react-native-screens";

interface SlotManagerProps {
    merchantId: string;
    selectedDate?: Date;
    onDateChange?: React.Dispatch<React.SetStateAction<Date>>;
    onSlotsUpdated?: () => void;
}

const SlotManager: React.FC<SlotManagerProps> = ({
    merchantId,
    selectedDate = new Date(),
    onDateChange = () => { },
    onSlotsUpdated = () => { }
}) => {
    const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(selectedDate);
    const [slots, setSlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("calendar");

    // If the component receives a new selected date prop, update the internal state
    useEffect(() => {
        setInternalSelectedDate(selectedDate);
    }, [selectedDate]);

    // Fetch slots for the selected date
    const fetchSlots = async () => {
        setLoading(true);
        setError(null);
        try {
            const dateStr = format(internalSelectedDate, 'yyyy-MM-dd');
            console.log(`Fetching slots for date: ${dateStr} and merchant: ${merchantId}`);

            // Direct Supabase query rather than using the helper function
            const { data, error } = await supabase
                .from('slots')
                .select('*')
                .eq('merchant_id', merchantId)
                .eq('date', dateStr)
                .order('start_time');

            if (error) {
                console.error('Supabase error fetching slots:', error);
                throw error;
            }

            console.log(`Retrieved ${data?.length || 0} slots`);
            setSlots(data || []);

        } catch (error: any) {
            console.error('Error fetching slots:', error);
            setError('Failed to load time slots. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch slots when the selected date changes
    useEffect(() => {
        if (merchantId) {
            fetchSlots();
        }
    }, [internalSelectedDate, merchantId]);

    // Handle date selection
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setInternalSelectedDate(date);
            onDateChange(date);
        }
    };

    // Add a new slot
    const handleAddSlot = async (startTime: string, endTime: string) => {
        try {
            const dateStr = format(internalSelectedDate, 'yyyy-MM-dd');
            await createSlot(merchantId, dateStr, startTime, endTime);
            fetchSlots();
            onSlotsUpdated();
        } catch (error: any) {
            console.error('Error adding slot:', error);
        }
    };

    // Delete a slot
    const handleDeleteSlot = async (slotId: string) => {
        try {
            await deleteSlot(slotId);
            fetchSlots();
            onSlotsUpdated();
        } catch (error: any) {
            console.error('Error deleting slot:', error);
        }
    };

    // Handle slot extension
    const handleSlotExtended = () => {
        fetchSlots();
        onSlotsUpdated();
    };

    // Generate time slots for quick add
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = 9; hour < 21; hour++) {
            for (let minute = 0; minute < 60; minute += 10) { // Changed from 30 to 10-minute intervals
                const startHour = hour;
                const startMinute = minute;
                const endHour = minute === 50 ? hour + 1 : hour; // Adjusted for 10-minute intervals
                const endMinute = minute === 50 ? 0 : minute + 10; // Adjusted for 10-minute intervals

                const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

                slots.push({ startTime, endTime });
            }
        }
        return slots;
    };

    return (
        <Card style={{ flex: 1 }}>
            <CardHeader>
                <CardTitle>Manage Availability</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList style={{ flexDirection: "row", marginBottom: 16 }}>
                        <TabsTrigger value="calendar">Calendar</TabsTrigger>
                        <TabsTrigger value="quickAdd">Quick Add</TabsTrigger>
                    </TabsList>

                    <TabsContent value="calendar">
                        <Calendar
                            current={format(internalSelectedDate, "yyyy-MM-dd")}
                            onDayPress={day => handleDateSelect(new Date(day.dateString))}
                            markedDates={{
                                [format(internalSelectedDate, "yyyy-MM-dd")]: { selected: true }
                            }}
                            style={{ marginBottom: 16 }}
                        />

                        <CardTitle style={{ fontSize: 16, marginBottom: 8 }}>
                            Slots for {format(internalSelectedDate, 'PPPP')}
                        </CardTitle>

                        {loading ? (
                            <ActivityIndicator size="small" color="#000" style={{ marginVertical: 16 }} />
                        ) : error ? (
                            <CardTitle style={{ color: "red", textAlign: "center", marginVertical: 16 }}>{error}</CardTitle>
                        ) : slots.length > 0 ? (
                            <ScrollView style={{ maxHeight: 550 }}>
                            {slots.map((slot) => (
                                <Badge
                                    key={slot.id}
                                    variant={slot.is_booked ? "secondary" : "outline"}
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingTop: 8,
                                        paddingBottom: 8,
                                        paddingLeft: 12,
                                        paddingRight: 12,
                                        marginBottom: 8,
                                    }}
                                    >
                                        {slot.start_time} - {slot.end_time}
                                </Badge>
                            ))}
                            </ScrollView>
                        ) : (
                            <CardTitle style={{ fontSize: 14, color: "#888", textAlign: "center", marginVertical: 8 }}>
                                No slots available for this date.
                            </CardTitle>
                        )}
                    </TabsContent>

                    <TabsContent value="quickAdd">
                        <CardTitle style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>
                            Quick add slots for {format(internalSelectedDate, 'PPPP')}:
                        </CardTitle>
                        <ScrollView style={{ maxHeight: 550 }}>
                            {generateTimeSlots().map((slot, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    style={{ marginBottom: 8 }}
                                    onPress={() => handleAddSlot(slot.startTime, slot.endTime)}
                                >
                                    {slot.startTime} - {slot.endTime}
                                </Button>
                            ))}
                        </ScrollView>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default SlotManager;