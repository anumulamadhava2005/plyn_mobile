import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Card, Icon } from 'react-native-paper';
import useWorkerScheduleData from '@/hooks/useWorkerScheduleData';

interface WorkerScheduleProps {
    merchantId: string;
}

const WorkerSchedule: React.FC<WorkerScheduleProps> = ({ merchantId }) => {
    const [date, setDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { workers, loading, activeWorker, setActiveWorker } = useWorkerScheduleData({ merchantId });

    const layout = Dimensions.get('window');

    const [index, setIndex] = useState(0);
    const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);

    React.useEffect(() => {
        if (workers.length) {
            setRoutes(workers.map((w) => ({ key: w.id, title: w.name })));
            setActiveWorker(workers[0].id);
        }
    }, [workers]);

    const renderScene = ({ route }: any) => {
        const worker = workers.find(w => w.id === route.key);
        if (!worker) return null;

        return (
            <ScrollView style={{ padding: 16 }}>
                <View></View>
            </ScrollView>
        );
    };

    return (
        <Card style={{ margin: 16, backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <Card.Title
                title="Worker Schedule"
                left={(props) => (
                    <Icon {...props} source="calendar" size={24} color="white" />
                )}
                titleStyle={{ color: 'white' }}
            />
            <Card.Content>
                <View style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 10,
                            backgroundColor: '#1f1f1f',
                            borderRadius: 8,
                            alignSelf: 'flex-start'
                        }}
                    >
                        <Icon source="calendar" size={24} color="white" />
                        <Text style={{ marginLeft: 8, color: 'white' }}>
                            {format(date, 'MMM d, yyyy')}
                        </Text>
                    </TouchableOpacity>

                    <DateTimePickerModal
                        isVisible={showDatePicker}
                        mode="date"
                        date={date}
                        onConfirm={(selectedDate) => {
                            setDate(selectedDate);
                            setShowDatePicker(false);
                        }}
                        onCancel={() => setShowDatePicker(false)}
                    />
                </View>

                {workers.length > 0 && (
                    <TabView
                        navigationState={{ index, routes }}
                        renderScene={renderScene}
                        onIndexChange={(i) => {
                            setIndex(i);
                            setActiveWorker(routes[i].key);
                        }}
                        initialLayout={{ width: layout.width }}
                        renderTabBar={(props) => (
                            <TabBar
                                {...props}
                                scrollEnabled
                                indicatorStyle={{ backgroundColor: 'white' }}
                                style={{ backgroundColor: '#333' }}
                            />
                        )}
                    />
                )}

                {workers.length === 0 && !loading && (
                    <Text style={{ textAlign: 'center', color: '#aaa', paddingVertical: 20 }}>
                        No workers found. Add workers to view their schedules.
                    </Text>
                )}
            </Card.Content>
        </Card>
    );
};

export default WorkerSchedule;
