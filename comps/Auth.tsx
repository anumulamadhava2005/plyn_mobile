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

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handlePhoneLogin = async () => {
    if (!phone) {
      Alert.alert('Missing Phone', 'Please enter your phone number.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      Alert.alert('OTP Error', error.message);
    } else {
      navigation.navigate('Verify', { phone });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80' }}
        style={styles.background}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={60}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={styles.overlay}>
              <Text style={styles.title}>Book Your Perfect Look in Minutes!</Text>

              {/* Email Field */}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Password Field */}
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {/* Email Login Button */}
              <TouchableOpacity style={styles.button} onPress={handleEmailLogin} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Login with Email'}</Text>
              </TouchableOpacity>


              <Text style={styles.loginText}>
                Don't have an account?{' '}
                <Text onPress={() => navigation.navigate('Signup')} style={styles.loginLink}>
                  SignUp
                </Text>
              </Text>

              {/* Optional: Add Google/Apple login buttons here */}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  background: {
    width: '100%',
    height: '110%',
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563eb',
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
  },
  loginLink: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
});
