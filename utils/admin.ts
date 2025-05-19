/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TimeSlot {
  id: string;
  merchant_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  service_duration: number;
  worker_id?: string;
}

export interface SlotAvailability {
  date: string;
  slots: {
    available: number;
    booked: number;
  };
}

export interface DisplaySlot {
  id: string;
  day: string;
  time: string;
  status: 'available' | 'booked' | 'unavailable';
}

export interface SlotFormData {
  startTime: string;
  endTime: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  status: 'confirmed' | 'cancelled' | 'pending';
  worker?: string;
}

export interface DashboardStats {
  totalMerchants: number;
  totalUsers: number;
  totalBookings: number;
  totalCustomers: number;
  totalRevenue: number;
  completedBookings: number;
  pendingBookings: number;
  pendingApplications: number;
}

export interface MerchantApplication {
  id: string;
  business_name: string;
  status: string;
  created_at: string;
  business_email: string;
  business_phone: string;
  business_address?: string;
  service_category?: string;
}

export interface MerchantData {
  id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  service_category: string;
  status: string;
  created_at: string;
}

export interface Service {
  id: string;
  merchant_id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  merchant_id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  specialty?: string;
  notes?: string;
}

export interface WorkerData {
  id: string;
  merchant_id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  specialty?: string;
  notes?: string;
}

export interface MerchantSettings {
  merchant_id: string;
  total_workers: number;
  working_hours_start: string;
  working_hours_end: string;
  break_start?: string;
  break_end?: string;
  worker_assignment_strategy: string;
  razorpay_id: string;

  // Razorpay onboarding fields
  legal_business_name: string;
  contact_name: string;
  business_type: string; // e.g. individual, partnership, etc.
  business_email: string;
  business_phone: string;
  pan: string;
  gst?: string;

  // Registered business address
  registered_address: {
    street1: string;
    street2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };

  // Bank details
  ifsc_code: string;
  bank_name: string;
  branch: string;
  account_number: string;
  confirm_account_number: string;
  account_holder_name: string;
}


export interface WorkerAvailability {
  workerId: string;
  name: string;
  nextAvailableTime: string;
  specialty?: string;
}

export interface PaymentDetails {
  paymentMethod: string;
  amount: number;
  currency?: string;
  booking?: any;
  orderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  account_id?: string;
}
