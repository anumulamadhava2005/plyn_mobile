import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { supabase } from '@/integrations/supabase/client';

interface DashboardMetricsProps {
  merchantId?: string;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ merchantId }) => {
  const [metrics, setMetrics] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    totalClients: 0,
    availableSlots: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (merchantId) {
      fetchMetrics();
    }
  }, [merchantId]);

  const fetchMetrics = async () => {
    if (!merchantId) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const statuses = ['completed', 'confirmed'];

      const { data: appointmentsData } = await supabase
        .from('bookings')
        .select('id')
        .eq('merchant_id', merchantId)
        .in('status', statuses);

      const { data: todayAppointmentsData } = await supabase
        .from('bookings')
        .select('id')
        .eq('merchant_id', merchantId)
        .eq('booking_date', today);

      const { data: clientsData } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('merchant_id', merchantId);

      const uniqueUserIds = new Set(clientsData?.map((b) => b.user_id));

      const { data: availableSlotsData } = await supabase
        .from('slots')
        .select('id')
        .eq('merchant_id', merchantId)
        .eq('is_booked', false)
        .gte('date', today);

      setMetrics({
        totalAppointments: appointmentsData?.length || 0,
        todayAppointments: todayAppointmentsData?.length || 0,
        totalClients: uniqueUserIds.size || 0,
        availableSlots: availableSlotsData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = (value: number) => [0, value / 2, value];

  const METRIC_CARDS = [
    {
      label: 'Total Appointments',
      value: metrics.totalAppointments,
      icon: 'calendar',
      color: '#60A5FA',
    },
    {
      label: "Today's Appointments",
      value: metrics.todayAppointments,
      icon: 'clock',
      color: '#FBBF24',
    },
    {
      label: 'Total Clients',
      value: metrics.totalClients,
      icon: 'users',
      color: '#34D399',
    },
    {
      label: 'Available Slots',
      value: metrics.availableSlots,
      icon: 'credit-card',
      color: '#F472B6',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading metrics...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.metricsWrapper} showsVerticalScrollIndicator={false}>
      {METRIC_CARDS.map((card, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{card.label}</Text>
              <Text style={styles.value}>{card.value}</Text>
            </View>
            <View style={[styles.iconWrapper, { backgroundColor: `${card.color}20` }]}>
              <Icon name={card.icon as any} size={20} color={card.color} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  metricsWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#111827',
  },
  iconWrapper: {
    padding: 10,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chart: {
    height: 80,
    borderRadius: 8,
  },
});

export default DashboardMetrics;
