import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    ImageBackground,
    Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../integrations/supabase/client';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import GradientText from './GradientText';

export default function HomeScreen({ navigation }: any) {
    const [location, setLocation] = useState<string>('Fetching...');
    const [services, setServices] = useState<any[]>([]);
    const [allServicesData, setAllServicesData] = useState<any[]>([]);
    const [salons, setSalons] = useState<any[]>([]);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');
    const [loading, setLoading] = useState<boolean|false>(false);

    useEffect(() => {
        checkUserProfile();
        fetchLocation();
        fetchAllServicesAndSalons();
    }, []);
    
    const checkUserProfile = async () => {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
    
      if (userError || !user) {
        setLoading(false);
        Alert.alert('Error', 'Unable to fetch user information.');
        return;
      }
    
      const { data, error } = await supabase
        .from('profiles')
        .select('*, phone_number')
        .eq('id', user.id)
        .single();
    
      setLoading(false);
    
      if (error || !data || data.phone_number === null) {
        navigation.navigate('AddDetails', { userId: user.id,phoneNumber: user.phone });
      } else {
        navigation.navigate('Home');
      }
    };

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
        const staticCategories = [
            {
                name: "Hair & styling",
                gender: "unisex",
                backgroundImage: require('../assets/images/hairstyle.png'),
            },
            {
                name: "Nails",
                gender: "female",
                backgroundImage: require('../assets/images/nails.png'),
            },
            {
                name: "Eyebrows & eyelashes",
                gender: "female",
                backgroundImage: require('../assets/images/eyebrows.png'),
            },
            {
                name: "Massage",
                gender: "unisex",
                backgroundImage: require('../assets/images/massage.png'),
            },
            {
                name: "Barbering",
                gender: "male",
                backgroundImage: require('../assets/images/haircut.png'),
            },
            {
                name: "Hair removal",
                gender: "female",
                backgroundImage: require('../assets/images/remove.png'),
            },
            {
                name: "Facials & skincare",
                gender: "unisex",
                backgroundImage: require('../assets/images/facial.png'),
            },
            {
                name: "Injectables & fillers",
                gender: "unisex",
                backgroundImage: require('../assets/images/inject.png'),
            },
            {
                name: "Body",
                gender: "unisex",
                backgroundImage: require('../assets/images/body.png'),
            },
            {
                name: "Tattoo & piercing",
                gender: "unisex",
                backgroundImage: require('../assets/images/tatoo.png'),
            },
            {
                name: "Makeup",
                gender: "female",
                backgroundImage: require('../assets/images/makeup.png'),
            },
            {
                name: "Medical & dental",
                gender: "unisex",
                backgroundImage: require('../assets/images/dental.png'),
            },
        ];

        // Set categories (services)
        setServices(staticCategories);

        // Get all merchants
        const { data: merchantsData, error: merchantsError } = await supabase
            .from('merchants')
            .select('*');

        if (!merchantsError && merchantsData) {
            setSalons(merchantsData);
        }
    };

    const genderOptions = ['all','male', 'female'];

    const filteredServices = services.filter(service =>
        selectedGender === 'all' || service.gender === selectedGender || service.gender === 'unisex'
    );

    const getSalonServices = (merchantId: string) => {
        return allServicesData
            .filter((s) => s.merchant_id === merchantId)
            .map((s) => s.name);
    };

    const handleServicePress = (serviceName: string) => {
        console.log('pressed',serviceName)
        if (selectedService === serviceName) {
            setSelectedService(null); // Toggle off
        } else {
            setSelectedService(serviceName); // Toggle on
            console.log('set',selectedService);
        }
    };
    console.log(' ',selectedService)

    const filteredSalons = selectedService
        ? salons.filter((salon) =>
            allServicesData.some(
                (s) => s.merchant_id === salon.id && s.name === selectedService
            )
        )
        : salons;

    return (
    <LinearGradient
        colors={['#fbc2eb', '#a6c1ee']} // pink-violet gradient
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
    >
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80, marginTop: 10 }}>
            <StatusBar style='dark' />

            <View style={{ margin: 20, marginHorizontal: 0 }}>
                  <GradientText text='PLYN' fontSize={30} />
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

            {/* Gender Tabs */}
            <View style={styles.genderTabs}>
                {genderOptions.map((gender: any) => (
                    <TouchableOpacity
                        key={gender}
                        onPress={() => setSelectedGender(gender)}
                        style={[
                            styles.genderTab,
                            selectedGender === gender && styles.genderTabActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.genderTabText,
                                selectedGender === gender && styles.genderTabTextActive,
                            ]}
                        >
                            {gender.charAt(0).toUpperCase() + gender.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {/* Services */}
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.rowsWrapper}>
                {[0, 1].map((row) => (
                    <View key={row} style={styles.row}>
                        {filteredServices
                            .filter((_, index) => index % 2 === row)
                            .map((service, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.servicePill,
                                        selectedService === service.name && { backgroundColor: '#dbeafe' },
                                    ]}
                                    onPress={() => handleServicePress(service.name)}
                                >
                                    <View style={styles.banner}>
                                        <Image
                                            source={service.backgroundImage}
                                            style={[styles.bannerImage, { height: 80, marginLeft: 60 }]}
                                            resizeMode="contain"
                                        />
                                        <View style={[styles.bannerTextWrapper, { height: 80, backgroundColor: 'rgba(0,0,0,0)' }]}>
                                            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14, maxWidth: '70%' }}>
                                                {service.name}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                    </View>
                ))}
            </View>


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
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', padding: 16 },
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
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        borderRadius: 20,
        marginRight: 10,
        height: 80,
        marginBottom: 10,
        maxWidth: '100%'
    },
    serviceText: {
        color: '#000',
        fontWeight: '500',
        maxWidth: '80%'
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
    rowsWrapper: {
        flexDirection: 'row',
    },
    row: {
        flexDirection: 'column',
        width: '52%'
    },
    genderTabs: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 10,
    },
    genderTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 5,
    },
    genderTabActive: {
        backgroundColor: '#3b82f6',
    },
    genderTabText: {
        fontSize: 14,
        color: '#555',
    },
    genderTabTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
