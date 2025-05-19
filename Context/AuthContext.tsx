/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, phoneNumber?: string, age?: number, gender?: string, isMerchant?: boolean) => Promise<{ user: User | null; session: Session | null; } | undefined>;
  signOut: () => Promise<void>;
  userProfile: { 
    username: string; 
    phoneNumber?: string; 
    age?: number; 
    gender?: string;
    isMerchant?: boolean;
  } | null;
  isMerchant: boolean;
  merchantLogin: (email: string, password: string) => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ 
    username: string; 
    phoneNumber?: string; 
    age?: number; 
    gender?: string;
    isMerchant?: boolean;
  } | null>(null);
  const [isMerchant, setIsMerchant] = useState(false);


  useEffect(() => {
    console.log("AuthContext mounted, setting up auth state change listener");
    
    const fetchUserAndMerchantData = async (userId: string) => {
      console.log("Fetching user profile for ID:", userId);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, phone_number, age, gender, is_merchant')
          .eq('id', userId)
          .maybeSingle();
  
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
  
        if (!data) {
          console.error('No profile found for user:', userId);
          return;
        }
  
        console.log("User profile data:", data);
        const isMerchantStatus = data.is_merchant || false;
        
        setUserProfile({
          username: data.username,
          phoneNumber: data.phone_number ?? undefined,
          age: data.age ?? undefined,
          gender: data.gender ?? undefined,
          isMerchant: isMerchantStatus
        });
        
        setIsMerchant(isMerchantStatus);
        console.log("Set isMerchant state to:", isMerchantStatus);
        
        if (isMerchantStatus) {
          try {
            const { data: merchantData, error: merchantError } = await supabase
              .from('merchants')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (!merchantError && merchantData) {
              console.log('Merchant data found:', merchantData);
              window.localStorage.setItem('merchant_status', merchantData.status || 'pending');
            } else {
              console.log('No merchant data found or error:', merchantError);
            }
          } catch (merchantFetchError) {
            console.error('Error fetching merchant data:', merchantFetchError);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserAndMerchantData:', error);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(async () => {
            await fetchUserAndMerchantData(currentSession.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setIsMerchant(false);
        }

      }
    );

    (async () => {
      try {
        console.log("Initial session check");
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        console.log("Initial session check result:", currentSession ? "Session found" : "No session");
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchUserAndMerchantData(currentSession.user.id);
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      console.log("Cleaning up auth state change listener");
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting sign in for:", email);
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      console.log("Sign in successful:", data.user?.id);
    } catch (error: any) {
      console.error("Sign in error details:", error);
      
      throw error;
    }
  };

  const merchantLogin = async (email: string, password: string) => {
    try {
      console.log("Attempting merchant login for:", email);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Merchant login error:", error);
        throw error;
      }
      
      console.log("Sign in successful, checking merchant status for ID:", data.user?.id);
      
      if (!data.user) {
        throw new Error("Login failed. User data not available.");
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_merchant, username, phone_number, age, gender')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (profileError) {
        console.error("Error fetching profile data:", profileError);
        throw new Error("Could not verify merchant status. Please try again.");
      }
      
      if (!profileData) {
        console.error("No profile found for user:", data.user.id);
        throw new Error("User profile not found. Please contact support.");
      }
      
      if (!profileData.is_merchant) {
        console.error("Non-merchant attempted to log in as merchant");
        await supabase.auth.signOut();
        throw new Error("This account is not registered as a merchant. Please sign up as a merchant or use the regular login.");
      }
      
      console.log("Setting merchant status to true for user:", data.user.id);
      setUserProfile({
        username: profileData.username,
        phoneNumber: profileData.phone_number ?? undefined,
        age: profileData.age ?? undefined,
        gender: profileData.gender ?? undefined,
        isMerchant: true
      });
      
      setIsMerchant(true);
      
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (merchantError) {
        console.error("Error fetching merchant profile:", merchantError);
      } else if (!merchantData) {
        console.error("No merchant data found for user:", data.user.id);
      } else {
        console.log("Merchant data successfully fetched:", merchantData);
        window.localStorage.setItem('merchant_status', merchantData.status || 'pending');
      }
      
      
      return data;
      
    } catch (error: any) {
      console.error("Merchant login error details:", error);
      
      throw error;
    }
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
      
      
      return data;
    } catch (error: any) {
      console.error("Sign up error details:", error);
      
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log("Attempting to sign out...");
      
      window.localStorage.removeItem('merchant_status');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Supabase sign out error:", error);
        throw error;
      }
      
      console.log("Sign out successful");
      
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsMerchant(false);
      
      window.localStorage.removeItem('supabase.auth.token');
      
    } catch (error: any) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      userProfile, 
      isMerchant,
      merchantLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
