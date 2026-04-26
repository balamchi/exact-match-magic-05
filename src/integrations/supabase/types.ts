export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string | null
          clinic_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          price_cents: number
          service_id: string | null
          staff_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          clinic_id: string
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          price_cents?: number
          service_id?: string | null
          staff_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          clinic_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          price_cents?: number
          service_id?: string | null
          staff_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_type: string
          active: boolean
          clinic_id: string
          created_at: string
          id: string
          name: string
          run_count: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          active?: boolean
          clinic_id: string
          created_at?: string
          id?: string
          name: string
          run_count?: number
          trigger_event?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
          run_count?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          clinic_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["clinic_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["clinic_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["clinic_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_forms: {
        Row: {
          active: boolean
          body: string | null
          clinic_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_forms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          clinic_id: string
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          clinic_id: string
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          clinic_id?: string
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          active: boolean
          balance_cents: number
          clinic_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          initial_value_cents: number
          purchaser_name: string | null
          recipient_email: string | null
          recipient_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          balance_cents?: number
          clinic_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_value_cents?: number
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          balance_cents?: number
          clinic_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_value_cents?: number
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          expires_at: string | null
          id: string
          name: string
          reorder_threshold: number
          sku: string | null
          stock_quantity: number
          supplier: string | null
          unit_cost_cents: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name: string
          reorder_threshold?: number
          sku?: string | null
          stock_quantity?: number
          supplier?: string | null
          unit_cost_cents?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string
          reorder_threshold?: number
          sku?: string | null
          stock_quantity?: number
          supplier?: string | null
          unit_cost_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          estimated_value_cents: number
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          estimated_value_cents?: number
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          estimated_value_cents?: number
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience: string | null
          channel: string
          click_count: number
          clinic_id: string
          created_at: string
          id: string
          name: string
          open_count: number
          scheduled_at: string | null
          sent_count: number
          status: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          channel?: string
          click_count?: number
          clinic_id: string
          created_at?: string
          id?: string
          name: string
          open_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          channel?: string
          click_count?: number
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
          open_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          description: string | null
          expires_after_days: number | null
          id: string
          name: string
          price_cents: number
          sessions: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          description?: string | null
          expires_after_days?: number | null
          id?: string
          name: string
          price_cents?: number
          sessions?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          description?: string | null
          expires_after_days?: number | null
          id?: string
          name?: string
          price_cents?: number
          sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          billed_at: string | null
          clinic_id: string
          created_at: string
          currency: string
          environment: string
          error_reason: string | null
          id: string
          invoice_number: string | null
          invoice_pdf_url: string | null
          origin: string | null
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          paddle_transaction_id: string
          plan_code: string | null
          price_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          billed_at?: string | null
          clinic_id: string
          created_at?: string
          currency?: string
          environment?: string
          error_reason?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          origin?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          paddle_transaction_id: string
          plan_code?: string | null
          price_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billed_at?: string | null
          clinic_id?: string
          created_at?: string
          currency?: string
          environment?: string
          error_reason?: string | null
          id?: string
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          origin?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          paddle_transaction_id?: string
          plan_code?: string | null
          price_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string | null
          clinic_id: string
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          clinic_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          clinic_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          clinic_id: string
          color: string | null
          created_at: string
          display_name: string
          id: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          clinic_id: string
          color?: string | null
          created_at?: string
          display_name: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          clinic_id?: string
          color?: string | null
          created_at?: string
          display_name?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active_clients_limit: number | null
          ai_calls_included: number
          annual_price_id: string | null
          card_processing_rate: number
          code: string
          created_at: string
          display_order: number
          editions_included: number
          email_included: number
          features: Json
          id: string
          is_popular: boolean
          is_public: boolean
          locations_included: number | null
          monthly_price_id: string | null
          name: string
          price_annual_cents: number
          price_monthly_cents: number
          sms_included: number
          staff_seats_included: number | null
          tagline: string | null
          updated_at: string
          whatsapp_included: number
        }
        Insert: {
          active_clients_limit?: number | null
          ai_calls_included?: number
          annual_price_id?: string | null
          card_processing_rate?: number
          code: string
          created_at?: string
          display_order?: number
          editions_included?: number
          email_included?: number
          features?: Json
          id?: string
          is_popular?: boolean
          is_public?: boolean
          locations_included?: number | null
          monthly_price_id?: string | null
          name: string
          price_annual_cents?: number
          price_monthly_cents?: number
          sms_included?: number
          staff_seats_included?: number | null
          tagline?: string | null
          updated_at?: string
          whatsapp_included?: number
        }
        Update: {
          active_clients_limit?: number | null
          ai_calls_included?: number
          annual_price_id?: string | null
          card_processing_rate?: number
          code?: string
          created_at?: string
          display_order?: number
          editions_included?: number
          email_included?: number
          features?: Json
          id?: string
          is_popular?: boolean
          is_public?: boolean
          locations_included?: number | null
          monthly_price_id?: string | null
          name?: string
          price_annual_cents?: number
          price_monthly_cents?: number
          sms_included?: number
          staff_seats_included?: number | null
          tagline?: string | null
          updated_at?: string
          whatsapp_included?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          clinic_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          plan_code: string
          price_id: string
          product_id: string
          scheduled_change_action: string | null
          scheduled_change_effective_at: string | null
          scheduled_change_meta: Json | null
          status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          clinic_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          plan_code: string
          price_id: string
          product_id: string
          scheduled_change_action?: string | null
          scheduled_change_effective_at?: string | null
          scheduled_change_meta?: Json | null
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          clinic_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          plan_code?: string
          price_id?: string
          product_id?: string
          scheduled_change_action?: string | null
          scheduled_change_effective_at?: string | null
          scheduled_change_meta?: Json | null
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          clinic_id: string
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          clinic_id: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_active_subscription: {
        Args: { check_env?: string; clinic_uuid: string }
        Returns: boolean
      }
      has_clinic_role: {
        Args: {
          _clinic: string
          _roles: Database["public"]["Enums"]["clinic_role"][]
          _user: string
        }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic: string; _user: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "no_show"
        | "cancelled"
      clinic_role: "owner" | "admin" | "provider" | "front_desk"
      lead_stage:
        | "new"
        | "contacted"
        | "qualified"
        | "consult_booked"
        | "won"
        | "lost"
      task_status: "todo" | "in_progress" | "done"
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
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "confirmed",
        "checked_in",
        "completed",
        "no_show",
        "cancelled",
      ],
      clinic_role: ["owner", "admin", "provider", "front_desk"],
      lead_stage: [
        "new",
        "contacted",
        "qualified",
        "consult_booked",
        "won",
        "lost",
      ],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
