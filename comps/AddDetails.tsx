import { Button, TextInput, View } from "react-native"
import { supabase } from "@/integrations/supabase/client"; // Ensure you have a configured Supabase client
import React, { useState } from "react";

const AddDetails: React.FC = ({ navigation, route }: any) => {
    const { userId, phoneNumber } = route.params;
    const [username, setUsername] = useState<any>();
    const [age, setAge] = useState<any>();
    const [gender, setGender] = useState<any>();

    const createProfile = async () => {
        const { error } = await supabase.from("profiles").update({
            username: username, // Replace with actual username
            updated_at: new Date().toISOString(),
            phone_number: phoneNumber, // Replace with actual phone number if available
            age: age, // Replace with actual age if available
            gender: gender, // Replace with actual gender if available
        }).eq('id', userId);

        if (error) {
            console.error("Error creating profile:", error.message);
        } else {
            navigation.navigate('Main');
            console.log("Profile created successfully");
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <TextInput
                placeholder="Username"
                style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
                onChangeText={(text) => setUsername(text)}
            />
            <TextInput
                placeholder="Age"
                style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
                keyboardType="numeric"
                onChangeText={(text) => setAge(text)}
            />
            <TextInput
                placeholder="Gender"
                style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
                onChangeText={(text) => setGender(text)}
            />
            <Button title="Submit" onPress={()=>createProfile()} />
        </View>
    )
};

export default AddDetails;