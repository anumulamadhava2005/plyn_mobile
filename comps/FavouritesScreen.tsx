import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFavorites } from '@/hooks/useFavourites';
import { supabase } from '@/integrations/supabase/client';
import { StatusBar } from 'expo-status-bar';

const FavoritesScreen = ({ navigation }: any) => {
  const { favorites, isLoading, toggleFavorite } = useFavorites();
  const [salonDetails, setSalonDetails] = useState<any[]>([]);
  const [loadingSalons, setLoadingSalons] = useState(true);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchSalonDetails();
    } else {
      setSalonDetails([]);
      setLoadingSalons(false);
    }
  }, [favorites]);

  const fetchSalonDetails = async () => {
    try {
      setLoadingSalons(true);
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .in('id', favorites);

      if (error) throw error;

      setSalonDetails(data || []);
    } catch (error) {
      console.error('Error fetching salon details:', error);
    } finally {
      setLoadingSalons(false);
    }
  };

  const renderItem = ({ item, index }: { item: any, index: any }) => (

    <TouchableOpacity
      key={index}
      style={styles.card}
      onPress={() => navigation.navigate('SalonDetailsScreen', { salonId: item.id })}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.salonName}>{item.business_name}</Text>
        <Text style={styles.salonLocation}>
          {item.location || 'No location available'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => toggleFavorite(item.id)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading || loadingSalons) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyFavoritesContainer}>
        <Image
          source={require('@/assets/images/empty-heart.png')} // optional: your own empty state image
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyFavoritesText}>
          You haven’t added any salons to your favorites yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 50 }}>
      <StatusBar style='dark' />
      <View style={{ padding: 16, alignSelf: 'center' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 20 }}>Favourites</Text>
      </View>
      <FlatList
        data={salonDetails}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loadingSalons} onRefresh={fetchSalonDetails} />
        }
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    flex: 1,
  },
  salonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  salonLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyFavoritesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyFavoritesText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  emptyImage: {
    width: 150,
    height: 150,
    tintColor: '#E5E7EB',
  },
});

export default FavoritesScreen;
