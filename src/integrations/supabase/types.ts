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
      ai_assistants: {
        Row: {
          active: boolean
          call_count: number
          clinic_id: string
          created_at: string
          id: string
          model: string
          name: string
          purpose: string
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          call_count?: number
          clinic_id: string
          created_at?: string
          id?: string
          model?: string
          name: string
          purpose?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          call_count?: number
          clinic_id?: string
          created_at?: string
          id?: string
          model?: string
          name?: string
          purpose?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          clinic_id: string
          created_at: string
          deposit_status: string | null
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
          deposit_status?: string | null
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
          deposit_status?: string | null
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
      before_after_photos: {
        Row: {
          after_url: string | null
          before_url: string | null
          client_id: string | null
          client_name: string
          clinic_id: string
          consent_given: boolean
          created_at: string
          id: string
          notes: string | null
          taken_on: string
          treatment: string | null
          updated_at: string
        }
        Insert: {
          after_url?: string | null
          before_url?: string | null
          client_id?: string | null
          client_name: string
          clinic_id: string
          consent_given?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          taken_on?: string
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          after_url?: string | null
          before_url?: string | null
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          consent_given?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          taken_on?: string
          treatment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "before_after_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "before_after_photos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          appointment_id: string | null
          checked_in_at: string
          client_id: string | null
          client_name: string
          clinic_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          seated_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          checked_in_at?: string
          client_id?: string | null
          client_name: string
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          seated_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          checked_in_at?: string
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          seated_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          allergies: string[] | null
          clinic_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          medical_alerts: string | null
          medications: string[] | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          allergies?: string[] | null
          clinic_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          medical_alerts?: string | null
          medications?: string[] | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          allergies?: string[] | null
          clinic_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          medical_alerts?: string | null
          medications?: string[] | null
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
          deposit_amount_cents: number
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
          deposit_amount_cents?: number
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
          deposit_amount_cents?: number
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
      deposits: {
        Row: {
          amount_cents: number
          appointment_id: string
          client_id: string | null
          clinic_id: string
          collected_at: string | null
          created_at: string
          id: string
          method: string
          notes: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          appointment_id: string
          client_id?: string | null
          clinic_id: string
          collected_at?: string | null
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          appointment_id?: string
          client_id?: string | null
          clinic_id?: string
          collected_at?: string | null
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
      inbox_messages: {
        Row: {
          channel: string
          clinic_id: string
          contact_handle: string | null
          contact_name: string
          created_at: string
          id: string
          last_message_at: string
          preview: string | null
          status: string
          unread: boolean
          updated_at: string
        }
        Insert: {
          channel?: string
          clinic_id: string
          contact_handle?: string | null
          contact_name: string
          created_at?: string
          id?: string
          last_message_at?: string
          preview?: string | null
          status?: string
          unread?: boolean
          updated_at?: string
        }
        Update: {
          channel?: string
          clinic_id?: string
          contact_handle?: string | null
          contact_name?: string
          created_at?: string
          id?: string
          last_message_at?: string
          preview?: string | null
          status?: string
          unread?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      injection_sites: {
        Row: {
          client_id: string | null
          client_name: string
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          product: string
          region: string
          units: number
          updated_at: string
          visit_date: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          product: string
          region: string
          units?: number
          updated_at?: string
          visit_date?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          product?: string
          region?: string
          units?: number
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "injection_sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injection_sites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          client_id: string | null
          client_name: string
          clinic_id: string
          created_at: string
          due_on: string | null
          id: string
          invoice_number: string | null
          issued_on: string
          notes: string | null
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          clinic_id: string
          created_at?: string
          due_on?: string | null
          id?: string
          invoice_number?: string | null
          issued_on?: string
          notes?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          created_at?: string
          due_on?: string | null
          id?: string
          invoice_number?: string | null
          issued_on?: string
          notes?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
      locations: {
        Row: {
          active: boolean
          address_line1: string | null
          city: string | null
          clinic_id: string
          country: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          region: string | null
          tax_label: string
          tax_rate: number
          timezone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_line1?: string | null
          city?: string | null
          clinic_id: string
          country?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          tax_label?: string
          tax_rate?: number
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_line1?: string | null
          city?: string | null
          clinic_id?: string
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          tax_label?: string
          tax_rate?: number
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          client_id: string | null
          client_name: string
          clinic_id: string
          created_at: string
          id: string
          lifetime_points: number
          notes: string | null
          points_balance: number
          tier: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          clinic_id: string
          created_at?: string
          id?: string
          lifetime_points?: number
          notes?: string | null
          points_balance?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          created_at?: string
          id?: string
          lifetime_points?: number
          notes?: string | null
          points_balance?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_clinic_id_fkey"
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
      memberships: {
        Row: {
          active: boolean
          benefits: string | null
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          member_count: number
          monthly_price_cents: number
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          benefits?: string | null
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          monthly_price_cents?: number
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          benefits?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          monthly_price_cents?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
      pos_orders: {
        Row: {
          client_id: string | null
          client_name: string | null
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          staff_name: string | null
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          staff_name?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          staff_name?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          referred_email: string | null
          referred_name: string
          referrer_name: string
          reward_cents: number
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          referred_email?: string | null
          referred_name: string
          referrer_name: string
          reward_cents?: number
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          referred_email?: string | null
          referred_name?: string
          referrer_name?: string
          reward_cents?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          clinic_id: string
          created_at: string
          id: string
          rating: number
          responded: boolean
          reviewer_name: string
          source: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          rating?: number
          responded?: boolean
          reviewer_name: string
          source?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          rating?: number
          responded?: boolean
          reviewer_name?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_clinic_id_fkey"
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
          deposit_cents: number
          deposit_required: boolean
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
          deposit_cents?: number
          deposit_required?: boolean
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
          deposit_cents?: number
          deposit_required?: boolean
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
      soap_notes: {
        Row: {
          assessment: string | null
          client_id: string | null
          client_name: string
          clinic_id: string
          created_at: string
          id: string
          objective: string | null
          plan: string | null
          signed: boolean
          subjective: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          assessment?: string | null
          client_id?: string | null
          client_name: string
          clinic_id: string
          created_at?: string
          id?: string
          objective?: string | null
          plan?: string | null
          signed?: boolean
          subjective?: string | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          assessment?: string | null
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          created_at?: string
          id?: string
          objective?: string | null
          plan?: string | null
          signed?: boolean
          subjective?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "soap_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_clinic_id_fkey"
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
      staff_commissions: {
        Row: {
          active: boolean
          applies_to: string
          clinic_id: string
          commission_type: string
          created_at: string
          id: string
          rate: number
          service_category: string | null
          service_id: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string
          clinic_id: string
          commission_type?: string
          created_at?: string
          id?: string
          rate?: number
          service_category?: string | null
          service_id?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          clinic_id?: string
          commission_type?: string
          created_at?: string
          id?: string
          rate?: number
          service_category?: string | null
          service_id?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_commissions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_commissions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_commissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_hr: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_type: string
          hire_date: string | null
          hourly_rate_cents: number | null
          id: string
          notes: string | null
          phone: string | null
          salary_cents: number | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string
          hire_date?: string | null
          hourly_rate_cents?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          salary_cents?: number | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string
          hire_date?: string | null
          hourly_rate_cents?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          salary_cents?: number | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_hr_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_hr_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
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
      treatment_plans: {
        Row: {
          client_id: string | null
          client_name: string
          clinic_id: string
          created_at: string
          estimated_total_cents: number
          goals: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          clinic_id: string
          created_at?: string
          estimated_total_cents?: number
          goals?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          created_at?: string
          estimated_total_cents?: number
          goals?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
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
      deposit_status: "pending" | "collected" | "refunded" | "forfeited"
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
      deposit_status: ["pending", "collected", "refunded", "forfeited"],
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
