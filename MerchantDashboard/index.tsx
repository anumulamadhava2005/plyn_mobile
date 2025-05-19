import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DashboardMetrics from './components/DashboardMetrics';
import AppointmentsList from './components/AppointmentsList';
import { supabase } from '@/integrations/supabase/client';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/Context/AuthContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SlotManager from './components/SlotManager';
import MerchantServices from './components/MerchantServices';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import WorkerSchedule from './components/WorkerSchedule';
// import WorkerManager from './components/WorkerManager';
// import MerchantSettingsManager from './components/MerchantSettingsManager';

const Tab = createBottomTabNavigator()

interface MerchantDashboardProps {
  merchantData: {
    business_address: string;
    business_email: string;
    business_name: string;
    business_phone: string;
    created_at: string;
    id: string;
    latitude: number;
    longitude: number;
    razorpay_id: string;
    service_category: string;
    status: string;
    updated_at: string;
  };
  merchantId: string;
  loading: boolean;
}

const MerchantDashboard = ({ route, navigation }: any) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { merchantData, merchantId, loading } = route.params as MerchantDashboardProps;
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  useEffect(() => {
    const fetchTotalEarnings = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('service_price')
          .eq('merchant_id', merchantId)
          .eq('status', 'completed');

        if (error) throw error;

        const earnings = data.reduce((sum: number, item: any) => sum + (item.service_price - 2 || 0), 0);
        setTotalEarnings(earnings);
      } catch (error: any) {
        console.error("Error fetching earnings:", error);
      }
    };

    fetchTotalEarnings();
  })

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading merchant dashboard...</Text>
      </View>
    );
  }
  const { user, userProfile, signOut, isMerchant } = useAuth();

  return (
    <View style={{ flex: 1, paddingTop: 40, backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="chevron-back" size={20} />
          <Text style={{ fontSize: 12, fontWeight: '500', marginLeft: 8 }}>Return to Site</Text>
        </TouchableOpacity>
      </View>

      {merchantData?.status !== 'approved' && (
        <View style={{ backgroundColor: '#FEF3C7', padding: 16, margin: 16, borderRadius: 8 }}>
          <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: '500' }}>
            Your merchant account is not active. Please confirm your details.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 16 }}>
            <TouchableOpacity style={{ backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: 'white' }}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#dc2626', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: 'white' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ flex: 1, padding: 16, backgroundColor: '#fff', borderRadius: 8, marginBottom: 16 }}>

        <Tab.Navigator
          screenOptions={{
            tabBarShowLabel: false,
            tabBarIconStyle: {
              justifyContent: 'center',
              alignItems: 'center',
            },
            tabBarStyle: {
              backgroundColor: 'yellow',
              elevation: 10,
              borderTopWidth: 0,
              position: 'absolute',
              borderRadius: 50,
              height: 56, // 50–60 is ideal for icon-only bars
              marginHorizontal: 16,
            },

          }}
        >
          <Tab.Screen
            name="Dashboard"
            options={{
              headerShown: false,
              tabBarIcon: ({ color }) => (
                <View style={{ justifyContent: 'flex-end', alignItems: 'center', height: '150%' }}>
                  <Image source={require('./components/house.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
              ),
            }}
          >
            {() => (
              <ScrollView contentContainerStyle={{ flex: 1, padding: 16, rowGap: 16, backgroundColor: '#fff' }}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', marginBottom: 8 }]}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                      {userProfile?.username?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={{ color: "grey" }}>Hello, Good morning</Text>
                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{userProfile?.username}</Text>
                  </View>
                </View>
                <View style={{ padding: 16, alignItems: 'center', flexDirection: 'column' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'grey' }}>Total Earnings</Text>
                  <Text style={{ fontSize: 80, fontWeight: 'bold', color: 'black' }}>₹{totalEarnings}.00</Text>
                </View>
                <View style={{flex:1}}>
                  <DashboardMetrics merchantId={merchantId} />
                </View>
              </ScrollView>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Appointments"
            options={{
              tabBarIcon: ({ color, size }) => (
                <View style={{ justifyContent: 'flex-end', alignItems: 'center', height: '150%' }}>
                  <Icon name="calendar-outline" size={24} color={color || 'white'} />
                </View>
              ), headerShown: false,
            }}
          >
            {() => (
              <View style={{ backgroundColor: '#fff', flex: 1 }}>
                <AppointmentsList merchantId={merchantId} />
              </View>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="SlotManager"
            options={{
              tabBarIcon: ({ color, size }) => (
                <View style={{ justifyContent: 'flex-end', alignItems: 'center', height: '150%' }}>
                  <Icon name="time-outline" size={24} color={color || 'white'} />
                </View>
              ), headerShown: false,
            }}
          >
            {() => (
              <View style={{ backgroundColor: '#fff', flex: 1 }}>
                <SlotManager
                  merchantId={merchantId}
                  selectedDate={selectedDate}
                  onSlotsUpdated={() => {}}
                />
              </View>
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Serives"
            options={{
              tabBarIcon: ({ color, size }) => (
                <View style={{ justifyContent: 'flex-end', alignItems: 'center', height: '150%' }}>
                  <MaterialIcons name="design-services" size={24} color={color || 'white'} />
                </View>
              ), headerShown: false,
            }}
          >
            {() => (
              <View style={{ backgroundColor: '#fff', flex: 1 }}>
                <MerchantServices merchantId={merchantId} />
              </View>
            )}
          </Tab.Screen>
          {/* <Tab.Screen
            name="Workers"
            options={{
              tabBarIcon: ({ color, size }) => (
                <View style={{ justifyContent: 'flex-end', alignItems: 'center', height: '150%' }}>
                  <FontAwesome5 name="user-tie" size={24} color={color || 'white'} />
                </View>
              ), headerShown: false,
            }}
          >
            {() => (
              <View style={{ backgroundColor: '#fff', flex: 1 }}>
                <WorkerSchedule merchantId={merchantId} />
              </View>
            )}
          </Tab.Screen> */}
        </Tab.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 40,
    backgroundColor: 'skyblue',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default MerchantDashboard;
