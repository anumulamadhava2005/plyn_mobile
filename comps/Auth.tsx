import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../integrations/supabase/client'; // your configured Supabase client
import { set } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import GradientText from './GradientText';
import { useFonts } from 'expo-font';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<any>('');
  const [otp, setOtp] = useState('');

  const handleEmailLogin = async () => {
    setLoading(true);
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      Alert.alert('Login Error', error.message);
      setLoading(false);
    } else {
      setLoading(false);
      // You can navigate to Home or a different screen here
    }
  };

  const onPhoneSubmit = async (values: any) => {
    setLoading(true)
    try {
      // Format phone number to international format
      const formattedPhone = values?.startsWith('+') ? values : `+91${values}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        throw error;
      }

      setPhoneNumber(formattedPhone);
      navigation.navigate('Verify', { phoneNumber: phoneNumber })

    } catch (error: any) {
      console.log("Failed to send otp", error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <LinearGradient
        // pink-violet gradient
        colors={['black', '#8A2BE2']}
        style={{ flex: 1, backgroundColor: 'transparent', marginTop: 60 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0)' }}
        >
          <View style={styles.overlay}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <GradientText text='PLYN' />
            </View>
            <Text style={styles.title}>Book Your Perfect Look in Minutes!</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#d9d9d9"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            {/* Phone Login Button */}
            <TouchableOpacity style={styles.button} onPress={() => onPhoneSubmit(phoneNumber)} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Continue'}</Text>
            </TouchableOpacity>
            <Text style={styles.orText}>OR</Text>

            {/* Email Login Button */}
            <TouchableOpacity style={[styles.button, { backgroundColor: '#b289d9' }]} onPress={() => navigation.navigate('EmailLogin')} disabled={loading}>
              <Text style={[styles.buttonText]}>{loading ? 'Loading...' : 'Continue with Email'}</Text>
            </TouchableOpacity>

            {/* Google Login Button */}
            <Text style={styles.loginText}>
              Don't have an account?{' '}
              <Text style={styles.loginLink} onPress={() => navigation.navigate('Signup')}>
                Sign Up
              </Text>
            </Text>

            {/* Optional: Add Google/Apple login buttons here */}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,1)',
    paddingTop: 60,
  },
  background: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#8A2BE2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  orText: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: 'bold',
  },
  loginText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loginLink: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
});
