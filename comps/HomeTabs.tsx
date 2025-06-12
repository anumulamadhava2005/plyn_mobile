import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, Button } from 'react-native'
import { supabase } from '@/integrations/supabase/client'
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import HomeScreen from './HomeScreen';
import MyBookings from './BookingsSxreen';
import ProfileScreen from './Profle';
import FavoritesScreen from './FavouritesScreen';

const Tab = createBottomTabNavigator()

// const HomeScreen = () => <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Home</Text></View>
const BookingsScreen = () => <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Bookings</Text></View>


export default function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} options={{tabBarIcon: () => {
        return (
            <FontAwesome6 name="pushed" size={24} color="black" />
        )
      }, headerShown: false}} />
      <Tab.Screen name="Bookings" component={MyBookings} options={{tabBarIcon: () => {
        return (
            <Feather name="calendar" size={24} color="black" />
        )
      }, headerShown: false}}/>
      <Tab.Screen name="Favourites" component={FavoritesScreen} options={{tabBarIcon: () => {
        return (
            <MaterialIcons name="favorite-border" size={24} color="black" />
        )
      }, headerShown: false}}/>
      <Tab.Screen name="Profile" component={ProfileScreen} options={{tabBarIcon: () => {
        return (
            <AntDesign name="user" size={24} color="black" />
        )
      }, headerShown: false}}/>
    </Tab.Navigator>
  )
}
