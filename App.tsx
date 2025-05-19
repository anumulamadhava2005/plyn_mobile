import 'react-native-url-polyfill/auto'
import { Buffer } from 'buffer'

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}
import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { supabase } from './integrations/supabase/client'
import { Session } from '@supabase/supabase-js'
import { StatusBar } from 'expo-status-bar'
import { View, Text, Button } from 'react-native'

// Screens
import LoginScreen from './comps/Auth'
import SignupScreen from './comps/SignupScreen'
import HomeTabs from './comps/HomeTabs' // bottom tab navigator with Home, Bookings, etc.
import VerifyScreen from './comps/VerifyScreen'
import SalonDetailsScreen from './comps/SalonDetailsScreen'
import ChooseSlotScreen from './comps/ChooseSlotScreen'
import { AuthProvider } from './Context/AuthContext'
import BookingScreen from './comps/BookingScreen'
import PaymentScreen from './comps/Payment'
import MapScreen from './comps/MapScreen'
import ProfileScreen from './comps/Profle'
import MerchantDashboard from './MerchantDashboard/index'

const Stack = createNativeStackNavigator()

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session && session.user ? (
            <>
              <Stack.Screen name="Main" component={HomeTabs} />
              <Stack.Screen name="SalonDetailsScreen" component={SalonDetailsScreen} />
              <Stack.Screen name="ChooseSlotScreen" component={ChooseSlotScreen} />
              <Stack.Screen name="BookingScreen" component={BookingScreen} />
              <Stack.Screen name="Pay" component={PaymentScreen} />
              <Stack.Screen name="MapScreen" component={MapScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="MerchantDashboard" component={MerchantDashboard} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Verify" component={VerifyScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  )
}
