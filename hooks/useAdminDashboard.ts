import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats, MerchantApplication } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useAdminDashboard = () => {
  const [pendingApplications, setPendingApplications] = useState<MerchantApplication[]>([]);
  const [approvedApplications, setApprovedApplications] = useState<MerchantApplication[]>([]);
  const [rejectedApplications, setRejectedApplications] = useState<MerchantApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalMerchants: 0,
    totalUsers: 0,
    totalBookings: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    completedBookings: 0,
    pendingBookings: 0,
    pendingApplications: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [
        merchantsResult,
        usersResult,
        bookingsResult
      ] = await Promise.all([
        supabase.from('merchants').select('*'),
        supabase.from('profiles').select('count'),
        supabase.from('bookings').select('count')
      ]);
      
      if (merchantsResult.error) throw merchantsResult.error;
      if (usersResult.error) throw usersResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      
      const merchantsData = merchantsResult.data || [];
      const totalUsers = usersResult.count || 0;
      const totalBookings = bookingsResult.count || 0;
      
      // Process applications by status
      const pending = merchantsData.filter(m => m.status === 'pending');
      const approved = merchantsData.filter(m => m.status === 'approved');
      const rejected = merchantsData.filter(m => m.status === 'rejected');
      
      // Fetch merchant data and user profiles separately
      const merchantIdsToFetch = merchantsData.map(merchant => merchant.id);
      
      // Fetch user profiles for the merchants
      let profilesData: any[] = [];
      let profilesError = null;
      
      try {
        const profilesResponse = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', merchantIdsToFetch);
          
        profilesData = profilesResponse.data || [];
        profilesError = profilesResponse.error;
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
      
      if (profilesError) throw profilesError;
      
      // Create a map of profiles by ID for easy lookup
      const profilesMap = (profilesData || []).reduce((acc: {[key: string]: any}, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      
      // Merge merchant data with profile data
      const enhancedApplications = merchantsData.map(merchant => {
        const profile = profilesMap[merchant.id];
        return {
          ...merchant,
          user_profile: profile || null
        };
      });
      
      // Sort and filter applications by status
      const pendingApps = enhancedApplications.filter(app => app.status === 'pending');
      const approvedApps = enhancedApplications.filter(app => app.status === 'approved');
      const rejectedApps = enhancedApplications.filter(app => app.status === 'rejected');
      
      setPendingApplications(pendingApps);
      setApprovedApplications(approvedApps);
      setRejectedApplications(rejectedApps);
      
      // Update stats
      setStats({
        totalMerchants: merchantsData.length,
        totalUsers,
        totalBookings,
        totalCustomers: totalUsers,
        totalRevenue: 0, // This would need a calculation based on payments
        completedBookings: 0, // This would need to be calculated based on booking status
        pendingBookings: 0, // This would need to be calculated based on booking status
        pendingApplications: pending.length
      });
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error Loading Dashboard",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (merchantId: string) => {
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ status: 'approved' })
        .eq('id', merchantId);
        
      if (error) throw error;
      
      toast({
        title: "Application Approved",
        description: "The merchant application has been approved.",
      });
      
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error approving application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (merchantId: string) => {
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ status: 'rejected' })
        .eq('id', merchantId);
        
      if (error) throw error;
      
      toast({
        title: "Application Rejected",
        description: "The merchant application has been rejected.",
      });
      
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error rejecting application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject application",
        variant: "destructive"
      });
    }
  };

  return {
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    isLoading,
    stats,
    handleApprove,
    handleReject
  };
};
