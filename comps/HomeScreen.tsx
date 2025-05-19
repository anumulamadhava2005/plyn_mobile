import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../integrations/supabase/client';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from 'expo-router';

export default function HomeScreen({ navigation }: any) {
    const [location, setLocation] = useState<string>('Fetching...');
    const [services, setServices] = useState<string[]>([]);
    const [allServicesData, setAllServicesData] = useState<any[]>([]);
    const [salons, setSalons] = useState<any[]>([]);
    const [selectedService, setSelectedService] = useState<string | null>(null);


    useEffect(() => {
        fetchLocation();
        fetchAllServicesAndSalons();
    }, []);

    const fetchLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setLocation('Permission Denied');
            return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const place = await Location.reverseGeocodeAsync(loc.coords);
        if (place.length > 0) {
            setLocation(`${place[0].city}, ${place[0].region}`);
        }
    };

    const fetchAllServicesAndSalons = async () => {
        // Get all services
        const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('id, name, merchant_id');

        if (servicesError || !servicesData) return;

        setAllServicesData(servicesData);

        // Extract unique service names
        const uniqueNames = Array.from(new Set(servicesData.map((s: any) => s.name)));
        setServices(uniqueNames);

        // Get all merchants
        const { data: merchantsData, error: merchantsError } = await supabase
            .from('merchants')
            .select('*');

        if (!merchantsError && merchantsData) {
            setSalons(merchantsData);
        }
    };

    const getSalonServices = (merchantId: string) => {
        return allServicesData
            .filter((s) => s.merchant_id === merchantId)
            .map((s) => s.name);
    };

    const handleServicePress = (serviceName: string) => {
        if (selectedService === serviceName) {
            setSelectedService(null); // Toggle off
        } else {
            setSelectedService(serviceName); // Toggle on
        }
    };

    const filteredSalons = selectedService
        ? salons.filter((salon) =>
            allServicesData.some(
                (s) => s.merchant_id === salon.id && s.name === selectedService
            )
        )
        : salons;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80, marginTop: 10 }}>
            <StatusBar style='dark' />

            <View style={{ margin: 20, marginHorizontal: 0 }}>
                <Text style={{ fontSize: 30, fontWeight: 'bold' }}>PLYN</Text>
            </View>
            <View style={styles.header}>
                <Ionicons name="location-outline" size={20} color="#555" />
                <Text style={styles.locationText}>{location}</Text>
                <Ionicons name="notifications-outline" size={24} color="#000" style={styles.bell} />
            </View>

            <TextInput
                style={styles.searchInput}
                placeholder="Enter address or city name"
                placeholderTextColor="#aaa"
            />

            {/* Promo Banner */}
            <View style={styles.banner}>
                <Image
                    source={{
                        uri: 'https://cdn.dribbble.com/userupload/3234723/file/original-81dba49d0ac2c9cfb1b1cfe9052dec26.png?resize=1024x768&vertical=center',
                    }}
                    style={styles.bannerImage}
                />
                <View style={styles.bannerTextWrapper}>
                    <Text style={styles.bannerTitle}>Morning Special!</Text>
                    <Text style={styles.bannerSubtitle}>Get 20% Off</Text>
                    <Text style={styles.bannerDescription}>on All Haircuts Between 9–10 AM</Text>
                    <TouchableOpacity style={styles.bookNowButton}>
                        <Text style={styles.bookNowText}>Book Now</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Services */}
            <Text style={styles.sectionTitle}>Services</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesContainer}>
                {services.map((service, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.servicePill,
                            selectedService === service && { backgroundColor: '#dbeafe' },
                        ]}
                        onPress={() => handleServicePress(service)}
                    >
                        <Text style={styles.serviceText}>{service}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Nearby Salons */}
            <View style={styles.salonHeader}>
                <Text style={styles.sectionTitle}>Nearby Salons</Text>
                <TouchableOpacity onPress={() => navigation.navigate('MapScreen', { salons: filteredSalons })}>
                    <Text style={styles.mapLink}>View on Map</Text>
                </TouchableOpacity>

            </View>

            {filteredSalons.map((salon, index) => (
                <TouchableOpacity
                    key={index}
                    style={styles.salonCard}
                    onPress={() => navigation.navigate('SalonDetailsScreen', { salonId: salon.id })}
                >
                    <Image
                        source={{
                            uri: salon.image_url || 'https://i.pinimg.com/736x/ca/51/8e/ca518e95fe8db4986ea7a51d9af85a0e.jpg',
                        }}
                        style={styles.salonImage}
                    />
                    <View style={styles.salonInfo}>
                        <Text style={styles.salonName}>{salon.business_name}</Text>
                        <Text style={styles.salonLocation}>{salon.business_address}</Text>
                        <Text style={styles.rating}>⭐ {salon.rating || '4.5'}</Text>
                        <Text style={styles.servicesOffered}>
                            Services: {getSalonServices(salon.id).join(', ')}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 16 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    locationText: {
        marginLeft: 6,
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        flex: 1,
    },
    bell: {
        marginLeft: 'auto',
    },
    searchInput: {
        backgroundColor: '#f1f1f1',
        borderRadius: 12,
        padding: 12,
        paddingHorizontal: 16,
        fontSize: 14,
        marginBottom: 16,
    },
    banner: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    bannerImage: {
        width: '100%',
        height: 150,
        position: 'absolute',
    },
    bannerTextWrapper: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 16,
        height: 150,
        justifyContent: 'center',
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    bannerSubtitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    bannerDescription: {
        color: '#fff',
        fontSize: 12,
        marginBottom: 10,
    },
    bookNowButton: {
        backgroundColor: '#fff',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    bookNowText: {
        fontWeight: 'bold',
        color: '#000',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    servicesContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    servicePill: {
        backgroundColor: '#f1f5f9',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
    },
    serviceText: {
        color: '#000',
        fontWeight: '500',
    },
    salonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    mapLink: {
        color: '#60a5fa',
        fontWeight: 'bold',
    },
    salonCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        flexDirection: 'row',
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    salonImage: {
        width: 64,
        height: 64,
        borderRadius: 10,
        marginRight: 12,
    },
    salonInfo: {
        flex: 1,
    },
    salonName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    salonLocation: {
        color: '#6b7280',
        fontSize: 13,
        marginBottom: 4,
    },
    rating: {
        color: '#f59e0b',
        fontSize: 13,
        marginBottom: 2,
    },
    servicesOffered: {
        color: '#6b7280',
        fontSize: 12,
    },
});
