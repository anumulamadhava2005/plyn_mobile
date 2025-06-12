import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/Context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/booking/BookingCard';
import { getUserCoins } from '@/utils/userUtils';
import { getMerchantSettings, upsertMerchantSettings } from '@/utils/workerUtils';
import { ScrollView } from 'react-native';

export default function ProfileScreen({ navigation }: any) {
  const { user, userProfile, signOut, isMerchant } = useAuth();
  const [userCoins, setUserCoins] = useState(0);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [merchantAddress, setMerchantAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);


  useEffect(() => {
    const fetchCoins = async () => {
      if (user) {
        try {
          const coins = await getUserCoins(user.id);
          setUserCoins(coins);
        } catch (error) {
          console.error('Error fetching user coins:', error);
        }
      }
    };

    fetchCoins();
    fetchMerchantData();
    if (isMerchant) {
      loadSettings();
      loadMerchantAddress();
    }
    setLoading(false);
  }, [user]);
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
  };
  const fetchMerchantData = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching merchant data:', error);
    } else {
      console.log('Merchant data:', data);
      setMerchantData(data);
    }
  };

  const [settings, setSettings] = useState<any>({
    merchant_id: user?.id,
    total_workers: 1,
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    break_start: '',
    break_end: '',
    worker_assignment_strategy: 'next-available',
    location_lat: '',
    location_lng: '',
    razorpay_id: '',
    legal_business_name: '',
    contact_name: '',
    business_type: 'partnership',
    business_email: '',
    business_phone: '',
    pan: '',
    gst: '',
    registered_address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'IN',
    },
    ifsc_code: '',
    bank_name: '',
    branch: '',
    account_number: '',
    confirm_account_number: '',
    account_holder_name: ''
  });

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) return;
      const data = await getMerchantSettings(user.id);
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching merchant settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMerchantAddress = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('business_address')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setMerchantAddress(data.business_address);
      }
    } catch (error) {
      console.error('Error fetching merchant address:', error);
    }
  };
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await upsertMerchantSettings(user?.id ?? '', {
        ...settings,
        break_start: settings.break_start || null,
        break_end: settings.break_end || null,
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setSettings((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationSelected = (lat: string, lng: string) => {
    setSettings((prev: any) => ({
      ...prev,
      location_lat: lat,
      location_lng: lng,
    }));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ width: '100%', paddingHorizontal: 16, marginTop: 20 }}>
        <Card className="col-span-1">
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 8 }}>
              <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', marginRight: 12 }]}>
                <Text style={{ color: '#fff', fontSize: 40, fontWeight: 'bold' }}>
                  {userProfile?.username?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{userProfile?.username}</Text>
                <Text style={{ fontSize: 12, color: 'grey' }}>{user?.email}</Text>
                <Text style={{ fontSize: 12, color: 'grey' }}>{userProfile?.phoneNumber}</Text>
                {isMerchant && (
                  <View style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    marginTop: 8,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#FF6384' }}>
                      Merchant Account
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </CardHeader>

          <CardContent className="flex flex-col items-center space-y-4">
            {/*<View style={{
              width: '100%',
              backgroundColor: 'rgba(0,122,255,0.1)',
              borderRadius: 12,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: '500', fontSize: 16 }}>PLYN Coins</Text>
              </View>
              <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{userCoins}</Text>
            </View>*/}
            <View style={{ width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around' }}>
              {isMerchant && (
                <TouchableOpacity
                  style={[styles.button, styles.logoutButton, { backgroundColor: 'purple' }]}
                  onPress={() => {
                    navigation.navigate('MerchantDashboard', {
                      merchantData,
                      merchantId: user?.id,
                      loading,
                    });
                  }}>
                  <Text style={styles.buttonText}>Merchant Dashboard</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
                <Text style={styles.buttonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
        {isMerchant && (
          <View>

            <Text style={styles.sectionTitle}>Merchant Details</Text>

            <Text style={styles.input}>{settings.razorpay_id}</Text>
            <TextInput
              style={styles.input}
              placeholder="Legal Business Name"
              value={settings.legal_business_name}
              onChangeText={text => handleChange('legal_business_name', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Contact Name"
              value={settings.contact_name}
              onChangeText={text => handleChange('contact_name', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Business Type"
              value={settings.business_type}
              onChangeText={text => handleChange('business_type', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Business Email"
              keyboardType="email-address"
              value={settings.business_email}
              onChangeText={text => handleChange('business_email', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Business Phone"
              keyboardType="phone-pad"
              value={settings.business_phone}
              onChangeText={text => handleChange('business_phone', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="PAN"
              value={settings.pan}
              onChangeText={text => handleChange('pan', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="GST"
              value={settings.gst}
              onChangeText={text => handleChange('gst', text)}
            />

            <Text style={styles.sectionTitle}>Bank Details</Text>
            <TextInput
              style={styles.input}
              placeholder="IFSC Code"
              value={settings.ifsc_code}
              onChangeText={text => handleChange('ifsc_code', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Bank Name"
              value={settings.bank_name}
              onChangeText={text => handleChange('bank_name', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Branch"
              value={settings.branch}
              onChangeText={text => handleChange('branch', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Account Number"
              secureTextEntry
              value={settings.account_number}
              onChangeText={text => handleChange('account_number', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Account Number"
              secureTextEntry
              value={settings.confirm_account_number}
              onChangeText={text => handleChange('confirm_account_number', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Account Holder Name"
              value={settings.account_holder_name}
              onChangeText={text => handleChange('account_holder_name', text)}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#28a745' }]}
              onPress={handleSaveSettings}
              disabled={isSaving}>
              <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save Settings'}</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  email: {
    color: 'gray',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: '#d9534f',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },

});
