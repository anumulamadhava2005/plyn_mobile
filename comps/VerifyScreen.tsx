// screens/VerifyScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../integrations/supabase/client';

export default function VerifyScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert('Missing OTP', 'Please enter the OTP.');
      return;
    }

    const { error, data } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      Alert.alert('Verification Failed', error.message);
    } else {
      Alert.alert('Success', 'Phone verified and logged in!');
      // navigation.navigate('Home'); // Replace with your main screen
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Enter the OTP sent to {phone}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
