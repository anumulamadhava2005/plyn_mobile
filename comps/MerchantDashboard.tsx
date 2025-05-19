import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client'; // adjust path
import { useAuth } from '@/Context/AuthContext';

import { Button } from '@/components/ui/button';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/booking/BookingCard';
import { ScrollView, Text, View } from 'react-native';

interface MerchantData {
  id: string;
  business_name: string;
  business_address: string;
  business_email: string;
  business_phone: string;
  service_category: string;
  status: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

const MerchantDashboard = ({navigation}: any) => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);


  const fetchTotalEarnings = async (merchantId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('service_price')
        .eq('merchant_id', merchantId)
        .eq('status', 'completed');

      if (error) throw error;

      const earnings = data.reduce(
        (sum: number, item: any) => sum + (item.service_price - 2 || 0),
        0
      );
      setTotalEarnings(earnings);
    } catch (error: any) {
      console.error("Error fetching earnings:", error);
    }
  };

  const fetchMerchantData = async () => {
    setLoading(true);
    try {
      if (!user?.id) throw new Error("User ID is undefined");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile && profile.is_merchant) {
        setMerchantId(user?.id || null);
        fetchTotalEarnings(user?.id);
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', user.id)
          .single();

        if (merchantError) throw merchantError;

        setMerchantData({
          ...merchant,
          is_active: merchant.status === 'approved',
        });
      } else {
        navigation.navigate('/merchant-onboarding');
      }
    } catch (error: any) {
      console.error("Error fetching merchant data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      if (!merchantId) throw new Error("Merchant ID is undefined");
      const { error } = await supabase
        .from('merchants')
        .update({ status: 'approved' })
        .eq('id', merchantId);

      if (error) throw error;

      if (merchantData) {
        setMerchantData({
          ...merchantData,
          status: 'approved',
          is_active: true,
        });
      }
    } catch (error: any) {
      console.error("Error confirming merchant:", error);
    }
  };

  const handleCancel = async () => {
    try {
      if (!merchantId) throw new Error("Merchant ID is undefined");
      const { error } = await supabase
        .from('merchants')
        .update({ status: 'inactive' })
        .eq('id', merchantId);

      if (error) throw error;

      if (merchantData) {
        setMerchantData({
          ...merchantData,
          status: 'inactive',
          is_active: false,
        });
      }

    } catch (error: any) {
      console.error("Error cancelling merchant:", error);
    }
  };


  useEffect(() => {
      fetchMerchantData();
  }, []);

  if (loading) return <Text style={{padding: 4}}>Loading dashboard...</Text>;


    function handleTabChange(value: string): void {
        setActiveTab(value);
    }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
      <View style={{ maxWidth: 896, alignSelf: 'center' }}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: 20, fontWeight: '600' }}>
                  Welcome, {merchantData?.business_name}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginTop: 16,
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#f3f4f6',
                      padding: 16,
                      borderRadius: 8,
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: '#4b5563' }}>Total Earnings</Text>
                    <Text style={{ fontSize: 28, fontWeight: '700' }}>₹{totalEarnings}</Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: '#f3f4f6',
                      padding: 16,
                      borderRadius: 8,
                      flex: 1,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: '#4b5563' }}>Account Status</Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                    >
                      {merchantData?.status}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      {merchantData?.status !== 'approved' ? (
                        <Button size="sm" onPress={handleConfirm}>
                          Confirm
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onPress={handleCancel}>
                          Deactivate
                        </Button>
                      )}
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Business Profile</CardTitle>
              </CardHeader>
              <CardContent style={{ flexDirection: 'column', gap: 8 }}>
                <Text>
                  <Text style={{ fontWeight: 'bold' }}>Email: </Text>
                  {merchantData?.business_email}
                </Text>
                <Text>
                  <Text style={{ fontWeight: 'bold' }}>Phone: </Text>
                  {merchantData?.business_phone}
                </Text>
                <Text>
                  <Text style={{ fontWeight: 'bold' }}>Address: </Text>
                  {merchantData?.business_address}
                </Text>
                <Text>
                  <Text style={{ fontWeight: 'bold' }}>Service Category: </Text>
                  {merchantData?.service_category}
                </Text>
                <Text>
                  <Text style={{ fontWeight: 'bold' }}>Created: </Text>
                  {merchantData?.created_at
                    ? new Date(merchantData.created_at).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </View>
    </ScrollView>
  );
};

export default MerchantDashboard;
