export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      booking_requests: {
        Row: {
          assigned_hub_id: string | null
          booking_ref: string
          consignee_address_line1: string | null
          consignee_address_line2: string | null
          consignee_name: string | null
          consignee_phone: string | null
          consignee_pin_code: string | null
          consignor_address_line1: string | null
          consignor_address_line2: string | null
          consignor_pin_code: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          destination_city: string
          goods_description: string
          id: string
          lr_id: string | null
          notes: string | null
          num_packages: number | null
          origin_city: string
          processed_at: string | null
          processed_by: string | null
          quantity: number
          rejection_reason: string | null
          status: string
          tenant_id: string
          tenant_slug: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          assigned_hub_id?: string | null
          booking_ref: string
          consignee_address_line1?: string | null
          consignee_address_line2?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          consignee_pin_code?: string | null
          consignor_address_line1?: string | null
          consignor_address_line2?: string | null
          consignor_pin_code?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          destination_city: string
          goods_description: string
          id?: string
          lr_id?: string | null
          notes?: string | null
          num_packages?: number | null
          origin_city: string
          processed_at?: string | null
          processed_by?: string | null
          quantity?: number
          rejection_reason?: string | null
          status?: string
          tenant_id: string
          tenant_slug: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          assigned_hub_id?: string | null
          booking_ref?: string
          consignee_address_line1?: string | null
          consignee_address_line2?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          consignee_pin_code?: string | null
          consignor_address_line1?: string | null
          consignor_address_line2?: string | null
          consignor_pin_code?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          destination_city?: string
          goods_description?: string
          id?: string
          lr_id?: string | null
          notes?: string | null
          num_packages?: number | null
          origin_city?: string
          processed_at?: string | null
          processed_by?: string | null
          quantity?: number
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          tenant_slug?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_assigned_hub_id_fkey"
            columns: ["assigned_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_booking_request_lr"
            columns: ["lr_id"]
            isOneToOne: false
            referencedRelation: "lorry_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          license_number: string | null
          phone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          phone: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          phone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hubs: {
        Row: {
          address_line1: string | null
          city: string | null
          contact_phone: string | null
          created_at: string
          hub_code: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          pin_code: string | null
          state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          hub_code: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          pin_code?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          hub_code?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          pin_code?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hubs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lorry_receipts: {
        Row: {
          booking_date: string
          booking_request_id: string | null
          consignee_address_line1: string | null
          consignee_address_line2: string | null
          consignee_gstin: string | null
          consignee_name: string
          consignee_phone: string
          consignee_pin_code: string | null
          consignor_address_line1: string | null
          consignor_address_line2: string | null
          consignor_gstin: string | null
          consignor_name: string
          consignor_phone: string
          consignor_pin_code: string | null
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          freight_amount: number
          from_hub_id: string
          goods_description: string
          id: string
          lr_number: string | null
          num_packages: number
          payment_mode: string
          quantity: number
          source: string
          status: string
          tenant_id: string
          to_hub_id: string
          trip_id: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          booking_date?: string
          booking_request_id?: string | null
          consignee_address_line1?: string | null
          consignee_address_line2?: string | null
          consignee_gstin?: string | null
          consignee_name: string
          consignee_phone: string
          consignee_pin_code?: string | null
          consignor_address_line1?: string | null
          consignor_address_line2?: string | null
          consignor_gstin?: string | null
          consignor_name: string
          consignor_phone: string
          consignor_pin_code?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          freight_amount?: number
          from_hub_id: string
          goods_description: string
          id?: string
          lr_number?: string | null
          num_packages?: number
          payment_mode?: string
          quantity?: number
          source?: string
          status?: string
          tenant_id: string
          to_hub_id: string
          trip_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          booking_date?: string
          booking_request_id?: string | null
          consignee_address_line1?: string | null
          consignee_address_line2?: string | null
          consignee_gstin?: string | null
          consignee_name?: string
          consignee_phone?: string
          consignee_pin_code?: string | null
          consignor_address_line1?: string | null
          consignor_address_line2?: string | null
          consignor_gstin?: string | null
          consignor_name?: string
          consignor_phone?: string
          consignor_pin_code?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          freight_amount?: number
          from_hub_id?: string
          goods_description?: string
          id?: string
          lr_number?: string | null
          num_packages?: number
          payment_mode?: string
          quantity?: number
          source?: string
          status?: string
          tenant_id?: string
          to_hub_id?: string
          trip_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lorry_receipts_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lorry_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lorry_receipts_from_hub_id_fkey"
            columns: ["from_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lorry_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lorry_receipts_to_hub_id_fkey"
            columns: ["to_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lorry_receipts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_sequences: {
        Row: {
          hub_id: string
          last_seq: number
          year: number
        }
        Insert: {
          hub_id: string
          last_seq?: number
          year: number
        }
        Update: {
          hub_id?: string
          last_seq?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "lr_sequences_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          lr_id: string
          notes: string | null
          tenant_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          lr_id: string
          notes?: string | null
          tenant_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          lr_id?: string
          notes?: string | null
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lr_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lr_status_history_lr_id_fkey"
            columns: ["lr_id"]
            isOneToOne: false
            referencedRelation: "lorry_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lr_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_of_deliveries: {
        Row: {
          created_at: string
          delivered_at: string
          id: string
          lr_id: string
          notes: string | null
          photo_url: string | null
          receiver_name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          id?: string
          lr_id: string
          notes?: string | null
          photo_url?: string | null
          receiver_name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          id?: string
          lr_id?: string
          notes?: string | null
          photo_url?: string | null
          receiver_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_deliveries_lr_id_fkey"
            columns: ["lr_id"]
            isOneToOne: false
            referencedRelation: "lorry_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_of_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address_line1: string | null
          city: string | null
          contact_phone: string | null
          created_at: string
          gstin: string | null
          id: string
          name: string
          pin_code: string | null
          slug: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name: string
          pin_code?: string | null
          slug: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name?: string
          pin_code?: string | null
          slug?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      to_pay_collections: {
        Row: {
          amount_collected: number
          collected: boolean
          collected_at: string | null
          collected_by: string | null
          created_at: string
          id: string
          lr_id: string
          notes: string | null
          payment_mode: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_collected?: number
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          id?: string
          lr_id: string
          notes?: string | null
          payment_mode?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_collected?: number
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          id?: string
          lr_id?: string
          notes?: string | null
          payment_mode?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "to_pay_collections_lr_id_fkey"
            columns: ["lr_id"]
            isOneToOne: false
            referencedRelation: "lorry_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "to_pay_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_schedules: {
        Row: {
          created_at: string
          days_of_week: number[]
          departure_time: string | null
          driver_id: string | null
          from_hub_id: string
          id: string
          is_active: boolean
          tenant_id: string
          to_hub_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          departure_time?: string | null
          driver_id?: string | null
          from_hub_id: string
          id?: string
          is_active?: boolean
          tenant_id: string
          to_hub_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          departure_time?: string | null
          driver_id?: string | null
          from_hub_id?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          to_hub_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_schedules_from_hub_id_fkey"
            columns: ["from_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_schedules_to_hub_id_fkey"
            columns: ["to_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          dispatched_at: string | null
          driver_id: string | null
          from_hub_id: string
          id: string
          notes: string | null
          schedule_id: string | null
          scheduled_departure: string | null
          status: string
          tenant_id: string
          to_hub_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_at?: string | null
          driver_id?: string | null
          from_hub_id: string
          id?: string
          notes?: string | null
          schedule_id?: string | null
          scheduled_departure?: string | null
          status?: string
          tenant_id: string
          to_hub_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_at?: string | null
          driver_id?: string | null
          from_hub_id?: string
          id?: string
          notes?: string | null
          schedule_id?: string | null
          scheduled_departure?: string | null
          status?: string
          tenant_id?: string
          to_hub_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_from_hub_id_fkey"
            columns: ["from_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "trip_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_to_hub_id_fkey"
            columns: ["to_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hub_assignments: {
        Row: {
          created_at: string
          hub_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hub_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hub_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_hub_assignments_hub"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hub_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hub_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          tenant_id: string
          updated_at: string
          user_role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_role: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity_tonnes: number | null
          created_at: string
          default_driver_id: string | null
          id: string
          is_active: boolean
          registration_number: string
          status: string
          tenant_id: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          capacity_tonnes?: number | null
          created_at?: string
          default_driver_id?: string | null
          id?: string
          is_active?: boolean
          registration_number: string
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          capacity_tonnes?: number | null
          created_at?: string
          default_driver_id?: string | null
          id?: string
          is_active?: boolean
          registration_number?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_default_driver_id_fkey"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      current_user_hub_ids: { Args: never; Returns: string[] }
      current_user_role: { Args: never; Returns: string }
      generate_booking_ref: { Args: never; Returns: string }
      generate_lr_number: { Args: { p_hub_id: string }; Returns: string }
      set_user_claims: { Args: { event: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

