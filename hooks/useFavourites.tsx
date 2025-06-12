
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/Context/AuthContext'; 
import { useToast } from '@/hooks/use-toast';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('salon_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(fav => fav.salon_id) || []);
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load favorites',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (salonId: string) => {
    if (!user) {
      toast({
        title: 'Please login',
        description: 'You need to be logged in to save favorites',
        variant: 'destructive',
      });
      return;
    }

    const isFavorite = favorites.includes(salonId);

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('salon_id', salonId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== salonId));
        toast({
          title: 'Removed from favorites',
          description: 'Salon removed from your favorites',
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            salon_id: salonId,
          });

        if (error) throw error;

        setFavorites(prev => [...prev, salonId]);
        toast({
          title: 'Added to favorites',
          description: 'Salon added to your favorites',
        });
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorites',
        variant: 'destructive',
      });
    }
  };

  const isFavorite = (salonId: string) => favorites.includes(salonId);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
  };
};
