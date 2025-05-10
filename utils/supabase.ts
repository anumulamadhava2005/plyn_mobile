import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = "https://nwisboqodsjdbnsiywax.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53aXNib3FvZHNqZGJuc2l5d2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0OTYxODMsImV4cCI6MjA1ODA3MjE4M30.DxKUaz91941e0RnaeEKPEy2w0VuH3rtAxbyZI6izaG0"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
