
import { supabase } from '@/integrations/supabase/client';

// Get user coins
export const getUserCoins = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user coins:", error);
      return 0;
    }
    
    return data?.coins || 0;
  } catch (error) {
    console.error("Error in getUserCoins:", error);
    return 0;
  }
};

// Update user coins
export const updateUserCoins = async (userId: string, coins: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ coins })
      .eq('id', userId);
    
    if (error) {
      console.error("Error updating user coins:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateUserCoins:", error);
    return false;
  }
};

// Get user profile
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
};
