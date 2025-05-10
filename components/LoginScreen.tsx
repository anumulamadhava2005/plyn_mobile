
import React, { useState } from 'react';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useToast } from '../components/ui/use-toast';
import { useAuth } from '../Context/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  isMerchant: z.boolean().default(false),
});

const merchantSchema = z.object({
  businessName: z.string().min(3, 'Business name must be at least 3 characters'),
  businessAddress: z.string().min(3, 'Address must be at least 3 characters'),
  businessPhone: z.string().min(5, 'Phone number must be at least 5 characters'),
  businessEmail: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type MerchantLoginFormValues = z.infer<typeof merchantSchema>;

const Login = () => {
  const [showMerchantFields, setShowMerchantFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    //@ts-ignore
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      isMerchant: false,
    },
  });

  const merchantLoginForm = useForm<MerchantLoginFormValues>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      businessName: '',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      password: '',
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      await signIn(values.email, values.password);
      
      if (values.isMerchant) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_merchant')
          .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
          .single();
          
        if (profileError) {
          console.error("Error fetching profile data:", profileError);
          toast({
            title: "Error",
            description: "Could not verify merchant status. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
          
        if (!profileData?.is_merchant) {
          await supabase.auth.signOut();
          toast({
            title: "Access denied",
            description: "This account is not registered as a merchant.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        try {
          const { data: merchantData, error: merchantError } = await supabase
            .from('merchants')
            .select('*')
            .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
            .single();
            
          if (merchantError) {
            console.log("Merchant profile not found, redirecting to setup:", merchantError);
            //navigate('/merchant-signup');
            return;
          }
          
          console.log("Merchant data found, redirecting to dashboard:", merchantData);
          //navigate('/merchant-dashboard');
        } catch (error) {
          console.error("Error checking merchant data:", error);
          //navigate('/merchant-signup');
        }
      } else {
        //navigate('/');
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onMerchantLoginSubmit = async (values: MerchantLoginFormValues) => {
    setIsLoading(true);
    try {
      console.log("Attempting merchant login with:", values);
      
      const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select('*, profiles(email)')
        .eq('business_name', values.businessName)
        .eq('business_email', values.businessEmail)
        .eq('business_phone', values.businessPhone);
        
      if (merchantError) {
        console.error("Error fetching merchant data:", merchantError);
        throw new Error("Error verifying merchant details");
      }
      
      if (!merchants || merchants.length === 0) {
        toast({
          title: "Merchant login failed",
          description: "No matching merchant account found. Please check your business details.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const merchant = merchants[0];
      console.log("Merchant found:", merchant);
      const userEmail = merchant.business_email;
      
      try {
        await signIn(userEmail, values.password);
        
        console.log("Sign in successful, redirecting to merchant dashboard");
        //navigate('/merchant-dashboard');
      } catch (signInError: any) {
        console.error("Sign in error:", signInError);
        toast({
          title: "Authentication failed",
          description: "Invalid credentials. Please check your password.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Merchant login error:", error);
      toast({
        title: "Merchant login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!showMerchantFields ? (
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <FormField
            //@ts-ignore
              control={loginForm.control}
              name="email"
              render={({ field }:any) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="your@email.com"
                        {...field}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
            //@ts-ignore
              control={loginForm.control}
              name="password"
              render={({ field }:any) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
            //@ts-ignore
              control={loginForm.control}
              name="isMerchant"
              render={({ field }:any) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Sign in as a merchant
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <div className="flex flex-col space-y-3 mt-6">
              <AnimatedButton
                variant="gradient"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </AnimatedButton>
              
              <button
                type="button"
                onClick={() => setShowMerchantFields(true)}
                className="text-sm text-primary underline text-center"
              >
                Sign in with business details instead
              </button>
            </div>
          </form>
        </Form>
      ) : (
        <Form {...merchantLoginForm}>
          <form onSubmit={merchantLoginForm.handleSubmit(onMerchantLoginSubmit)} className="space-y-4">
            <FormField
              control={merchantLoginForm.control}
              name="businessName"
              render={({ field }:any) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="Your business name"
                        {...field}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={merchantLoginForm.control}
              name="businessEmail"
              render={({ field }:any) => (
                <FormItem>
                  <FormLabel>Business Email</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="business@example.com"
                        {...field}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={merchantLoginForm.control}
              name="businessPhone"
              render={({ field }:any) => (
                <FormItem>
                  <FormLabel>Business Phone</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="(123) 456-7890"
                        {...field}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={merchantLoginForm.control}
              name="password"
              render={({ field }:any) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col space-y-3 mt-6">
              <AnimatedButton
                variant="gradient"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In as Merchant'}
              </AnimatedButton>
              
              <button
                type="button"
                onClick={() => setShowMerchantFields(false)}
                className="text-sm text-primary underline text-center"
              >
                Go back to regular login
              </button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
};

export default Login;
