// screens/SalonDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import AntDesign from '@expo/vector-icons/AntDesign';

const SalonDetailsScreen = ({ route, navigation }: any) => {
  const { salonId } = route.params;

  const [salon, setSalon] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);

  useEffect(() => {
    fetchSalonData();
  }, []);

  const fetchSalonData = async () => {
    const { data: salonDetails } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', salonId)
      .single();

    const { data: serviceList } = await supabase
      .from('services')
      .select('*')
      .eq('merchant_id', salonId);

    setSalon(salonDetails);
    setServices(serviceList || []);
  };

  const toggleServiceSelection = (service: any) => {
    if (selectedServices.find((s) => s.id === service.id)) {
      setSelectedServices((prev) => prev.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices((prev) => [...prev, service]);
    }
  };

  const goToSlotScreen = () => {
    navigation.navigate('ChooseSlotScreen', {
      salonId,
      selectedServices,
    });
  };

  const handleAddToFavourite = async () => {
    try {
        const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('favorites')
        .insert([{ user_id: userData?.user?.id as string, salon_id: salonId as string, created_at: new Date().toISOString() }]);

      if (error) {
        console.error('Error adding to favourites:', error.message);
        return;
      }

      console.log('Salon added to favourites:', data);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {salon && (
        <View style={{ marginTop: 30 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <AntDesign name="left" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleAddToFavourite()}>
              <AntDesign name="hearto" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <Image
            source={{
              uri:
                salon.image_url ||
                'https://i.pinimg.com/736x/ca/51/8e/ca518e95fe8db4986ea7a51d9af85a0e.jpg',
            }}
            style={styles.image}
          />
          <Text style={styles.title}>{salon.business_name}</Text>
          <Text style={styles.address}>{salon.business_address}</Text>
          <Text style={styles.rating}>{salon.business_phone}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Select Services</Text>
      {services.map((service) => {
        const isSelected = selectedServices.find((s) => s.id === service.id);
        return (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              isSelected && styles.serviceSelected,
            ]}
            onPress={() => toggleServiceSelection(service)}
          >
            <View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.servicePrice}>
                {service.description}
              </Text>
            </View>
            <View>
              <Text style={styles.serviceName}>₹ {service.price}</Text>
              <Text style={styles.servicePrice}>
                {service.duration} mins
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {selectedServices.length > 0 && (
        <TouchableOpacity style={styles.bookButton} onPress={goToSlotScreen}>
          <Text style={styles.bookButtonText}>Continue</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default SalonDetailsScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 30,
  },
  header: {
    marginVertical: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  address: {
    color: 'black',
    fontSize: 14,
    marginBottom: 4,
  },
  rating: {
    color: 'grey',
    fontSize: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 10,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  serviceSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 14,
    marginTop: 4,
  },
  bookButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
