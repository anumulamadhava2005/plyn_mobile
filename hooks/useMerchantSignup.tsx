
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface MerchantFormData {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  salonType: string;
  description: string;
}

const initialFormData: MerchantFormData = {
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  salonType: 'men',
  description: '',
};

export const useMerchantSignup = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<MerchantFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSalonTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      salonType: value
    }));
  };

  const nextStep = () => {
    setStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const checkMerchantProfile = async () => {
    if (!user) return;

    try {
      console.log("Checking if merchant profile exists for user:", user.id);
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      console.log("Merchant profile check result:", { data, error });

      if (!error && data) {
        toast({
          title: "Profile Already Complete",
          description: "Your merchant profile is already set up.",
        });
        navigate('/merchant-dashboard');
      }
    } catch (error) {
      console.error("Error checking merchant profile:", error);
    }
  };

  // Check profile on mount
  useEffect(() => {
    if (user && userProfile?.isMerchant) {
      checkMerchantProfile();
    }
  }, [user, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete your merchant profile.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Submitting merchant profile with data:", {
        id: user.id,
        business_name: formData.businessName,
        business_address: formData.address,
        business_phone: formData.phone,
        business_email: formData.email || user.email,
        service_category: formData.salonType
      });
      
      // First, check if a merchant entry already exists
      const { data: existingMerchant, error: checkError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking existing merchant:", checkError);
        throw checkError;
      }
      
      let result;
      
      if (existingMerchant) {
        console.log("Merchant exists, updating profile:", existingMerchant);
        // Update existing merchant
        result = await supabase
          .from('merchants')
          .update({
            business_name: formData.businessName,
            business_address: formData.address,
            business_phone: formData.phone,
            business_email: formData.email || user.email,
            service_category: formData.salonType
          })
          .eq('id', user.id)
          .select();
      } else {
        console.log("Creating new merchant profile");
        // Insert new merchant
        result = await supabase
          .from('merchants')
          .insert({
            id: user.id,
            business_name: formData.businessName,
            business_address: formData.address,
            business_phone: formData.phone,
            business_email: formData.email || user.email,
            service_category: formData.salonType
          })
          .select();
      }
      
      if (result.error) {
        console.error("Error during merchant profile creation/update:", result.error);
        throw result.error;
      }
      
      console.log("Merchant profile created/updated successfully:", result.data);
      
      // Update the user's profile to ensure isMerchant is true
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_merchant: true })
        .eq('id', user.id);
        
      if (profileError) {
        console.error("Error updating profile merchant status:", profileError);
      }
      
      setStep(4);
      window.scrollTo(0, 0);
      
      toast({
        title: "Merchant Profile Created",
        description: "Your merchant profile has been successfully created!",
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error creating your merchant profile.",
        variant: "destructive",
      });
      console.error('Merchant profile creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    formData,
    isSubmitting,
    handleChange,
    handleSalonTypeChange,
    nextStep,
    prevStep,
    checkMerchantProfile,
    handleSubmit,
  };
};
