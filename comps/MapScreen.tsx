import React, { useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Modalize } from 'react-native-modalize';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function MapScreen({ route, navigation }: any) {
  const { salons } = route.params;
  const modalizeRef = useRef<Modalize>(null);

  const openFilters = () => {
    modalizeRef.current?.open();
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 33.853,
          longitude: -118.133,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {salons.map((salon:any, index:any) => (
          <Marker
            key={index}
            coordinate={{
              latitude: salon.latitude || 33.853,
              longitude: salon.longitude || -118.133,
            }}
            title={salon.business_name}
            onPress={() => navigation.navigate('SalonDetailsScreen', { salonId: salon.id })}
          />
        ))}
      </MapView>

      {/* Filter Button */}
      <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
        <Text style={styles.filterButtonText}>Filters</Text>
      </TouchableOpacity>

      {/* Bottom Card List */}
      <View style={styles.bottomList}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={salons}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SalonDetailsScreen', { salonId: item.id })}
            >
              <Image source={{ uri: item.image_url }} style={styles.cardImage} />
              <Text style={styles.cardTitle}>{item.business_name}</Text>
              <Text style={styles.cardSubtitle}>{item.rating || '4.5'} ⭐</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Modalize Filter Sheet */}
      <Modalize
        ref={modalizeRef}
        adjustToContentHeight
        modalStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sort By</Text>
          {['Nearest', 'Popular', 'Rating', 'Price'].map((label, idx) => (
            <TouchableOpacity key={idx} style={styles.optionButton}>
              <Text style={styles.optionText}>{label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.modalTitle, { marginTop: 20 }]}>Services Available</Text>
          {['Haircut', 'Spa', 'Coloring'].map((service, idx) => (
            <TouchableOpacity key={idx} style={styles.optionButton}>
              <Text style={styles.optionText}>{service}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modalize>
    </View>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 1,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomList: {
    position: 'absolute',
    bottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 8,
    borderRadius: 12,
    padding: 10,
    width: width * 0.6,
    elevation: 4,
  },
  cardImage: {
    height: 80,
    borderRadius: 10,
    width: '100%',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
  },
  cardSubtitle: {
    color: 'gray',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  optionButton: {
    paddingVertical: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
});
