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
import { LinearGradient } from 'expo-linear-gradient';

export default function SignupScreen({ navigation }: any) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phno, setPhno] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSignup = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill all fields.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        await signUp(
            email,
            password,
            username,
            phno,
            18,
            'male',
            false // Never create merchants from regular signup
        );
    };

    const signUp = async (
        email: string,
        password: string,
        username: string,
        phoneNumber?: string,
        age?: number,
        gender?: string,
        isMerchant: boolean = false
    ) => {
        try {
            console.log("Starting signup process");
            console.log("Checking if username exists:", username);
            const { data: existingUsers, error: checkError } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username);

            if (checkError) {
                console.error("Error checking username:", checkError);
                throw checkError;
            }

            if (existingUsers && existingUsers.length > 0) {
                console.error("Username already exists");
                throw new Error("Username already exists. Please choose a different username.");
            }

            const uniqueUsername = username;

            console.log("Signing up user with email:", email);
            console.log("Is merchant flag:", isMerchant);

            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: uniqueUsername,
                        phone_number: phoneNumber,
                        age,
                        gender,
                        is_merchant: isMerchant,
                    },
                },
            });

            if (error) {
                console.error("Sign up error:", error);
                throw error;
            }

            console.log("Sign up successful:", data);
            await supabase.auth.signInWithPassword({ email, password })

            return data;
        } catch (error: any) {
            console.error("Sign up error details:", error);
            throw error;
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
                        <Text style={styles.title}>Create a New Account</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#aaa"
                            value={username}
                            onChangeText={setUsername}
                            keyboardType="default"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#aaa"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone number"
                            placeholderTextColor="#aaa"
                            value={phno}
                            onChangeText={setPhno}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#aaa"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#aaa"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />

                        <TouchableOpacity style={[styles.button, { backgroundColor: '#b289d9' }]} onPress={handleSignup}>
                            <Text style={styles.buttonText}>Sign Up</Text>
                        </TouchableOpacity>

                        <Text style={styles.loginText}>
                            Already have an account?{' '}
                            <Text onPress={() => navigation.goBack()} style={styles.loginLink}>
                                Log In
                            </Text>
                        </Text>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1,
    backgroundColor: 'rgba(0,0,0,1)',
    paddingTop: 60, },
    background: {
        width: '100%',
        height: '110%',
        position: 'absolute',
    },
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 20,
        paddingBottom: 80,
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
        backgroundColor: '#10b981',
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
