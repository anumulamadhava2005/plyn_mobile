
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Worker } from '@/types/admin';

interface UseWorkerScheduleDataProps {
  merchantId: string;
}

const useWorkerScheduleData = ({ merchantId }: UseWorkerScheduleDataProps) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorker, setActiveWorker] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch workers
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('id, name, specialty, merchant_id, is_active')
          .eq('merchant_id', merchantId)
          .eq('is_active', true);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setWorkers(data as Worker[]);
          setActiveWorker(data[0].id);
        }
      } catch (error: any) {
        console.error('Error fetching workers:', error);
        toast({
          title: 'Error',
          description: 'Failed to load workers',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkers();
  }, [merchantId, toast]);

  return {
    workers,
    loading,
    activeWorker,
    setActiveWorker
  };
};

export default useWorkerScheduleData;
