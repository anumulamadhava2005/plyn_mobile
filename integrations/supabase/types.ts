export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          additional_notes: string | null
          booking_date: string | null
          coins_earned: number
          coins_used: number
          created_at: string
          customer_email: string | null
          customer_phone: string | null
          id: string
          merchant_id: string
          payment_id: string | null
          salon_id: string | null
          salon_name: string | null
          service_duration: number | null
          service_name: string
          service_price: number | null
          slot_id: string
          status: string
          time_slot: string | null
          updated_at: string
          user_id: string
          worker_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          booking_date?: string | null
          coins_earned?: number
          coins_used?: number
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          merchant_id: string
          payment_id?: string | null
          salon_id?: string | null
          salon_name?: string | null
          service_duration?: number | null
          service_name: string
          service_price?: number | null
          slot_id: string
          status?: string
          time_slot?: string | null
          updated_at?: string
          user_id: string
          worker_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          booking_date?: string | null
          coins_earned?: number
          coins_used?: number
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          merchant_id?: string
          payment_id?: string | null
          salon_id?: string | null
          salon_name?: string | null
          service_duration?: number | null
          service_name?: string
          service_price?: number | null
          slot_id?: string
          status?: string
          time_slot?: string | null
          updated_at?: string
          user_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_settings: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          branch: string | null
          branch_name: string | null
          break_end: string | null
          break_start: string | null
          business_email: string | null
          business_phone: string | null
          business_type: string | null
          confirm_account_number: number | null
          contact_name: string | null
          created_at: string
          gst: string | null
          ifsc_code: string | null
          legal_business_name: string | null
          merchant_id: string
          pan: string | null
          razorpay_id: string | null
          registered_address: Json | null
          total_workers: number
          updated_at: string
          worker_assignment_strategy: string
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch?: string | null
          branch_name?: string | null
          break_end?: string | null
          break_start?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_type?: string | null
          confirm_account_number?: number | null
          contact_name?: string | null
          created_at?: string
          gst?: string | null
          ifsc_code?: string | null
          legal_business_name?: string | null
          merchant_id: string
          pan?: string | null
          razorpay_id?: string | null
          registered_address?: Json | null
          total_workers?: number
          updated_at?: string
          worker_assignment_strategy?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch?: string | null
          branch_name?: string | null
          break_end?: string | null
          break_start?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_type?: string | null
          confirm_account_number?: number | null
          contact_name?: string | null
          created_at?: string
          gst?: string | null
          ifsc_code?: string | null
          legal_business_name?: string | null
          merchant_id?: string
          pan?: string | null
          razorpay_id?: string | null
          registered_address?: Json | null
          total_workers?: number
          updated_at?: string
          worker_assignment_strategy?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          business_address: string
          business_email: string
          business_name: string
          business_phone: string
          created_at: string
          id: string
          service_category: string
          status: string
          updated_at: string
          razorpay_id: string | null  // 👈 New field
        }
        Insert: {
          business_address: string
          business_email: string
          business_name: string
          business_phone: string
          created_at?: string
          id?: string
          service_category: string
          status?: string
          updated_at?: string
          razorpay_id?: string | null  // 👈 New field
        }
        Update: {
          business_address?: string
          business_email?: string
          business_name?: string
          business_phone?: string
          created_at?: string
          id?: string
          service_category?: string
          status?: string
          updated_at?: string
          razorpay_id?: string | null  // 👈 New field
        }
        Relationships: []
      }
      
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          coins_earned: number
          coins_used: number
          created_at: string | null
          id: string
          payment_method: string
          payment_status: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          coins_earned?: number
          coins_used?: number
          created_at?: string | null
          id?: string
          payment_method: string
          payment_status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          coins_earned?: number
          coins_used?: number
          created_at?: string | null
          id?: string
          payment_method?: string
          payment_status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          coins: number | null
          created_at: string
          gender: string | null
          id: string
          is_admin: boolean | null
          is_merchant: boolean | null
          phone_number: string | null
          updated_at: string
          username: string
        }
        Insert: {
          age?: number | null
          coins?: number | null
          created_at?: string
          gender?: string | null
          id: string
          is_admin?: boolean | null
          is_merchant?: boolean | null
          phone_number?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          age?: number | null
          coins?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          is_admin?: boolean | null
          is_merchant?: boolean | null
          phone_number?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string
          duration: number
          id: string
          merchant_id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          duration?: number
          id?: string
          merchant_id: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration?: number
          id?: string
          merchant_id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          is_booked: boolean
          merchant_id: string
          salon_id: string | null
          service_duration: number | null
          service_id: string | null
          service_name: string | null
          service_price: number | null
          start_time: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_booked?: boolean
          merchant_id: string
          salon_id?: string | null
          service_duration?: number | null
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          start_time: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_booked?: boolean
          merchant_id?: string
          salon_id?: string | null
          service_duration?: number | null
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          start_time?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slots_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_unavailability: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_unavailability_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          name: string
          notes: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id: string
          name: string
          notes?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          name?: string
          notes?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_merchant_record: {
        Args:
        | {
            user_id: string
            b_name: string
            b_address: string
            b_email: string
            b_phone: string
            s_category: string
            merchant_status?: string
          }
        | {
            user_id: string
            business_name: string
            business_email: string
            business_phone: string
            business_address: string
            service_category: string
          }
      Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
