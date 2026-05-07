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
          cancel_reason: string | null
          cancelled_at: string | null
          check_in_at: string | null
          check_out_at: string | null
          client_id: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          deposit_status: string | null
          ends_at: string
          id: string
          internal_notes: string | null
          location_id: string | null
          no_show_at: string | null
          notes: string | null
          price_cents: number
          service_id: string | null
          staff_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          client_id?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          deposit_status?: string | null
          ends_at: string
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          no_show_at?: string | null
          notes?: string | null
          price_cents?: number
          service_id?: string | null
          staff_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          client_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          deposit_status?: string | null
          ends_at?: string
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          no_show_at?: string | null
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
      audit_log: {
        Row: {
          action: string
          clinic_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          clinic_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          clinic_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
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
      client_package_redemptions: {
        Row: {
          appointment_id: string | null
          client_package_id: string
          created_at: string
          id: string
          notes: string | null
          redeemed_at: string
          service_id: string | null
          staff_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_package_id: string
          created_at?: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          service_id?: string | null
          staff_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_package_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          service_id?: string | null
          staff_id?: string | null
        }
        Relationships: []
      }
      client_packages: {
        Row: {
          activated_at: string | null
          client_id: string
          clinic_id: string
          created_at: string
          expires_at: string | null
          id: string
          package_id: string
          paid_amount_cents: number
          pos_order_id: string | null
          purchased_at: string
          sessions_used: number
          status: string
          total_sessions: number
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          client_id: string
          clinic_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id: string
          paid_amount_cents?: number
          pos_order_id?: string | null
          purchased_at?: string
          sessions_used?: number
          status?: string
          total_sessions: number
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          client_id?: string
          clinic_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          paid_amount_cents?: number
          pos_order_id?: string | null
          purchased_at?: string
          sessions_used?: number
          status?: string
          total_sessions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          allergies: string[] | null
          cancellation_count: number | null
          city: string | null
          clinic_id: string
          country: string | null
          created_at: string
          current_medications: string | null
          date_of_birth: string | null
          email: string | null
          email_consent: boolean | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          first_visit_date: string | null
          gender: string | null
          id: string
          last_name: string | null
          last_visit_date: string | null
          lifetime_value_cents: number | null
          marketing_consent: boolean | null
          medical_alerts: string | null
          medical_conditions: string[] | null
          medications: string[] | null
          no_show_count: number | null
          notes: string | null
          notes_internal: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          preferred_language: string | null
          preferred_name: string | null
          preferred_provider_id: string | null
          pregnancy_status: string | null
          previous_treatments: string | null
          pronouns: string | null
          referred_by_client_id: string | null
          skin_type: string | null
          smoking_status: string | null
          sms_consent: boolean | null
          source: string | null
          state_province: string | null
          tags: string[] | null
          updated_at: string
          vip_status: boolean | null
          visit_count: number | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          allergies?: string[] | null
          cancellation_count?: number | null
          city?: string | null
          clinic_id: string
          country?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_consent?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          first_visit_date?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_visit_date?: string | null
          lifetime_value_cents?: number | null
          marketing_consent?: boolean | null
          medical_alerts?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          no_show_count?: number | null
          notes?: string | null
          notes_internal?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          preferred_name?: string | null
          preferred_provider_id?: string | null
          pregnancy_status?: string | null
          previous_treatments?: string | null
          pronouns?: string | null
          referred_by_client_id?: string | null
          skin_type?: string | null
          smoking_status?: string | null
          sms_consent?: boolean | null
          source?: string | null
          state_province?: string | null
          tags?: string[] | null
          updated_at?: string
          vip_status?: boolean | null
          visit_count?: number | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          allergies?: string[] | null
          cancellation_count?: number | null
          city?: string | null
          clinic_id?: string
          country?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_consent?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          first_visit_date?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_visit_date?: string | null
          lifetime_value_cents?: number | null
          marketing_consent?: boolean | null
          medical_alerts?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          no_show_count?: number | null
          notes?: string | null
          notes_internal?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          preferred_name?: string | null
          preferred_provider_id?: string | null
          pregnancy_status?: string | null
          previous_treatments?: string | null
          pronouns?: string | null
          referred_by_client_id?: string | null
          skin_type?: string | null
          smoking_status?: string | null
          sms_consent?: boolean | null
          source?: string | null
          state_province?: string | null
          tags?: string[] | null
          updated_at?: string
          vip_status?: boolean | null
          visit_count?: number | null
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
          accent_color: string | null
          bio: string | null
          booking_rules: Json | null
          booking_widget_enabled: boolean | null
          booking_widget_settings: Json | null
          communication_settings: Json | null
          created_at: string
          created_by: string
          currency: string
          deposit_amount_cents: number
          email: string | null
          id: string
          integration_settings: Json | null
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          notification_settings: Json | null
          operating_hours: Json | null
          phone: string | null
          primary_color: string | null
          slug: string
          tax_currency_settings: Json | null
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          bio?: string | null
          booking_rules?: Json | null
          booking_widget_enabled?: boolean | null
          booking_widget_settings?: Json | null
          communication_settings?: Json | null
          created_at?: string
          created_by: string
          currency?: string
          deposit_amount_cents?: number
          email?: string | null
          id?: string
          integration_settings?: Json | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name: string
          notification_settings?: Json | null
          operating_hours?: Json | null
          phone?: string | null
          primary_color?: string | null
          slug: string
          tax_currency_settings?: Json | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          bio?: string | null
          booking_rules?: Json | null
          booking_widget_enabled?: boolean | null
          booking_widget_settings?: Json | null
          communication_settings?: Json | null
          created_at?: string
          created_by?: string
          currency?: string
          deposit_amount_cents?: number
          email?: string | null
          id?: string
          integration_settings?: Json | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          notification_settings?: Json | null
          operating_hours?: Json | null
          phone?: string | null
          primary_color?: string | null
          slug?: string
          tax_currency_settings?: Json | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      consent_form_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["consent_audit_action"]
          actor_id: string | null
          actor_name: string
          actor_type: Database["public"]["Enums"]["consent_actor_type"]
          clinic_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          signature_id: string
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["consent_audit_action"]
          actor_id?: string | null
          actor_name?: string
          actor_type?: Database["public"]["Enums"]["consent_actor_type"]
          clinic_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature_id: string
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["consent_audit_action"]
          actor_id?: string | null
          actor_name?: string
          actor_type?: Database["public"]["Enums"]["consent_actor_type"]
          clinic_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_form_audit_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_audit_log_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "consent_form_signatures"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_form_signatures: {
        Row: {
          appointment_id: string | null
          client_id: string
          clinic_id: string
          created_at: string
          declined_reason: string | null
          device_fingerprint: string | null
          email_verified: boolean
          expires_at: string | null
          id: string
          phone_verified: boolean
          public_token: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          sent_at: string | null
          service_id: string | null
          signature_canvas_data: string | null
          signature_checkbox_confirmed: boolean
          signature_typed_name: string | null
          signed_at: string | null
          signed_html_snapshot: string
          signer_geolocation: Json | null
          signer_ip_address: string | null
          signer_user_agent: string | null
          status: Database["public"]["Enums"]["consent_signature_status"]
          template_id: string
          template_version: number
          updated_at: string
          viewed_at: string | null
          witness_name: string | null
          witness_relationship: string | null
          witness_signature_data: string | null
          witness_signed_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          clinic_id: string
          created_at?: string
          declined_reason?: string | null
          device_fingerprint?: string | null
          email_verified?: boolean
          expires_at?: string | null
          id?: string
          phone_verified?: boolean
          public_token?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          sent_at?: string | null
          service_id?: string | null
          signature_canvas_data?: string | null
          signature_checkbox_confirmed?: boolean
          signature_typed_name?: string | null
          signed_at?: string | null
          signed_html_snapshot?: string
          signer_geolocation?: Json | null
          signer_ip_address?: string | null
          signer_user_agent?: string | null
          status?: Database["public"]["Enums"]["consent_signature_status"]
          template_id: string
          template_version?: number
          updated_at?: string
          viewed_at?: string | null
          witness_name?: string | null
          witness_relationship?: string | null
          witness_signature_data?: string | null
          witness_signed_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          clinic_id?: string
          created_at?: string
          declined_reason?: string | null
          device_fingerprint?: string | null
          email_verified?: boolean
          expires_at?: string | null
          id?: string
          phone_verified?: boolean
          public_token?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          sent_at?: string | null
          service_id?: string | null
          signature_canvas_data?: string | null
          signature_checkbox_confirmed?: boolean
          signature_typed_name?: string | null
          signed_at?: string | null
          signed_html_snapshot?: string
          signer_geolocation?: Json | null
          signer_ip_address?: string | null
          signer_user_agent?: string | null
          status?: Database["public"]["Enums"]["consent_signature_status"]
          template_id?: string
          template_version?: number
          updated_at?: string
          viewed_at?: string | null
          witness_name?: string | null
          witness_relationship?: string | null
          witness_signature_data?: string | null
          witness_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_form_signatures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_signatures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_signatures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_signatures_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_signatures_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_signatures_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consent_form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_form_templates: {
        Row: {
          body_html: string
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          is_legal_template: boolean
          name: string
          requires_witness: boolean
          service_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          body_html?: string
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_legal_template?: boolean
          name: string
          requires_witness?: boolean
          service_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          body_html?: string
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_legal_template?: boolean
          name?: string
          requires_witness?: boolean
          service_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "consent_form_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_locations: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          location_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          location_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          location_id?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          client_id: string | null
          coupon_id: string
          created_at: string
          discount_applied_cents: number
          id: string
          pos_order_id: string | null
          used_at: string
        }
        Insert: {
          client_id?: string | null
          coupon_id: string
          created_at?: string
          discount_applied_cents?: number
          id?: string
          pos_order_id?: string | null
          used_at?: string
        }
        Update: {
          client_id?: string | null
          coupon_id?: string
          created_at?: string
          discount_applied_cents?: number
          id?: string
          pos_order_id?: string | null
          used_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          applies_to_ids: string[] | null
          applies_to_type: string | null
          clinic_id: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          first_time_only: boolean | null
          id: string
          max_discount_cents: number | null
          min_purchase_cents: number | null
          name: string | null
          per_client_limit: number | null
          stackable: boolean | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
          valid_days: string[] | null
          valid_end_time: string | null
          valid_start_time: string | null
          visible_to_clients: boolean | null
        }
        Insert: {
          active?: boolean
          applies_to_ids?: string[] | null
          applies_to_type?: string | null
          clinic_id: string
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          first_time_only?: boolean | null
          id?: string
          max_discount_cents?: number | null
          min_purchase_cents?: number | null
          name?: string | null
          per_client_limit?: number | null
          stackable?: boolean | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_days?: string[] | null
          valid_end_time?: string | null
          valid_start_time?: string | null
          visible_to_clients?: boolean | null
        }
        Update: {
          active?: boolean
          applies_to_ids?: string[] | null
          applies_to_type?: string | null
          clinic_id?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          first_time_only?: boolean | null
          id?: string
          max_discount_cents?: number | null
          min_purchase_cents?: number | null
          name?: string | null
          per_client_limit?: number | null
          stackable?: boolean | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_days?: string[] | null
          valid_end_time?: string | null
          valid_start_time?: string | null
          visible_to_clients?: boolean | null
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
      gift_card_locations: {
        Row: {
          created_at: string
          gift_card_id: string
          id: string
          location_id: string
        }
        Insert: {
          created_at?: string
          gift_card_id: string
          id?: string
          location_id: string
        }
        Update: {
          created_at?: string
          gift_card_id?: string
          id?: string
          location_id?: string
        }
        Relationships: []
      }
      gift_card_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          gift_card_id: string
          id: string
          notes: string | null
          pos_order_id: string | null
          staff_id: string | null
          transaction_type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          gift_card_id: string
          id?: string
          notes?: string | null
          pos_order_id?: string | null
          staff_id?: string | null
          transaction_type?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          gift_card_id?: string
          id?: string
          notes?: string | null
          pos_order_id?: string | null
          staff_id?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          active: boolean
          balance_cents: number
          card_image_url: string | null
          clinic_id: string
          code: string
          created_at: string
          delivered_at: string | null
          delivery_method: string | null
          design_template: string | null
          expires_at: string | null
          id: string
          initial_value_cents: number
          issued_by_staff_id: string | null
          personal_message: string | null
          purchaser_name: string | null
          recipient_email: string | null
          recipient_name: string | null
          scheduled_delivery_at: string | null
          sender_email: string | null
          sender_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          balance_cents?: number
          card_image_url?: string | null
          clinic_id: string
          code: string
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string | null
          design_template?: string | null
          expires_at?: string | null
          id?: string
          initial_value_cents?: number
          issued_by_staff_id?: string | null
          personal_message?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          scheduled_delivery_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          balance_cents?: number
          card_image_url?: string | null
          clinic_id?: string
          code?: string
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string | null
          design_template?: string | null
          expires_at?: string | null
          id?: string
          initial_value_cents?: number
          issued_by_staff_id?: string | null
          personal_message?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          scheduled_delivery_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string | null
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
      lead_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["lead_activity_type"]
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["lead_activity_type"]
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["lead_activity_type"]
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: []
      }
      lead_sources_config: {
        Row: {
          clinic_id: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          source_key: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          source_key: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          source_key?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          clinic_id: string
          converted_to_client_id: string | null
          created_at: string
          email: string | null
          estimated_value_cents: number
          first_name: string
          id: string
          last_contacted_at: string | null
          last_name: string | null
          lost_reason: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          service_interest: string | null
          source: string | null
          source_details: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          clinic_id: string
          converted_to_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value_cents?: number
          first_name?: string
          id?: string
          last_contacted_at?: string | null
          last_name?: string | null
          lost_reason?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string | null
          source_details?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          clinic_id?: string
          converted_to_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value_cents?: number
          first_name?: string
          id?: string
          last_contacted_at?: string | null
          last_name?: string | null
          lost_reason?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string | null
          source_details?: string | null
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
          email: string | null
          id: string
          image_url: string | null
          is_primary: boolean
          name: string
          notes: string | null
          operating_hours: Json | null
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
          email?: string | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          name: string
          notes?: string | null
          operating_hours?: Json | null
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
          email?: string | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          name?: string
          notes?: string | null
          operating_hours?: Json | null
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
      package_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          package_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          package_id?: string
        }
        Relationships: []
      }
      package_services: {
        Row: {
          created_at: string
          id: string
          package_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          service_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          activation_policy: string | null
          active: boolean
          clinic_id: string
          created_at: string
          description: string | null
          expires_after_days: number | null
          id: string
          image_url: string | null
          member_only: boolean | null
          name: string
          price_cents: number
          session_type: string | null
          sessions: number
          tax_category: string | null
          transferable: boolean | null
          updated_at: string
          validity_days: number | null
          validity_type: string | null
        }
        Insert: {
          activation_policy?: string | null
          active?: boolean
          clinic_id: string
          created_at?: string
          description?: string | null
          expires_after_days?: number | null
          id?: string
          image_url?: string | null
          member_only?: boolean | null
          name: string
          price_cents?: number
          session_type?: string | null
          sessions?: number
          tax_category?: string | null
          transferable?: boolean | null
          updated_at?: string
          validity_days?: number | null
          validity_type?: string | null
        }
        Update: {
          activation_policy?: string | null
          active?: boolean
          clinic_id?: string
          created_at?: string
          description?: string | null
          expires_after_days?: number | null
          id?: string
          image_url?: string | null
          member_only?: boolean | null
          name?: string
          price_cents?: number
          session_type?: string | null
          sessions?: number
          tax_category?: string | null
          transferable?: boolean | null
          updated_at?: string
          validity_days?: number | null
          validity_type?: string | null
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
      referral_codes: {
        Row: {
          client_id: string
          clinic_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          times_used: number
          total_rewards_earned_cents: number
          updated_at: string
        }
        Insert: {
          client_id: string
          clinic_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          times_used?: number
          total_rewards_earned_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          clinic_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          times_used?: number
          total_rewards_earned_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          amount_cents: number
          clinic_id: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          recipient_client_id: string
          redeemed_at: string | null
          referral_id: string
          reward_type: Database["public"]["Enums"]["reward_type"]
          status: Database["public"]["Enums"]["reward_status"]
        }
        Insert: {
          amount_cents?: number
          clinic_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          recipient_client_id: string
          redeemed_at?: string | null
          referral_id: string
          reward_type?: Database["public"]["Enums"]["reward_type"]
          status?: Database["public"]["Enums"]["reward_status"]
        }
        Update: {
          amount_cents?: number
          clinic_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          recipient_client_id?: string
          redeemed_at?: string | null
          referral_id?: string
          reward_type?: Database["public"]["Enums"]["reward_type"]
          status?: Database["public"]["Enums"]["reward_status"]
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_enabled: boolean
          referee_reward_enabled: boolean
          referee_reward_type: Database["public"]["Enums"]["reward_type"]
          referee_reward_value: number
          reward_description: string | null
          reward_service_id: string | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          reward_value: number
          terms_text: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          referee_reward_enabled?: boolean
          referee_reward_type?: Database["public"]["Enums"]["reward_type"]
          referee_reward_value?: number
          reward_description?: string | null
          reward_service_id?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"]
          reward_value?: number
          terms_text?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          referee_reward_enabled?: boolean
          referee_reward_type?: Database["public"]["Enums"]["reward_type"]
          referee_reward_value?: number
          reward_description?: string | null
          reward_service_id?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"]
          reward_value?: number
          terms_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          referee_client_id: string | null
          referee_phone: string | null
          referred_email: string | null
          referred_name: string
          referrer_client_id: string | null
          referrer_code_id: string | null
          referrer_name: string
          reward_cents: number
          reward_redeemed_at: string | null
          reward_unlocked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          referee_client_id?: string | null
          referee_phone?: string | null
          referred_email?: string | null
          referred_name: string
          referrer_client_id?: string | null
          referrer_code_id?: string | null
          referrer_name: string
          reward_cents?: number
          reward_redeemed_at?: string | null
          reward_unlocked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          referee_client_id?: string | null
          referee_phone?: string | null
          referred_email?: string | null
          referred_name?: string
          referrer_client_id?: string | null
          referrer_code_id?: string | null
          referrer_name?: string
          reward_cents?: number
          reward_redeemed_at?: string | null
          reward_unlocked_at?: string | null
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
      review_requests: {
        Row: {
          appointment_id: string | null
          client_id: string
          clinic_id: string
          completed_at: string | null
          created_at: string
          id: string
          opened_at: string | null
          public_token: string
          reminder_sent_at: string | null
          scheduled_send_at: string
          sent_at: string | null
          sent_via: Database["public"]["Enums"]["review_sent_via"]
          status: Database["public"]["Enums"]["review_request_status"]
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          public_token?: string
          reminder_sent_at?: string | null
          scheduled_send_at?: string
          sent_at?: string | null
          sent_via?: Database["public"]["Enums"]["review_sent_via"]
          status?: Database["public"]["Enums"]["review_request_status"]
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          public_token?: string
          reminder_sent_at?: string | null
          scheduled_send_at?: string
          sent_at?: string | null
          sent_via?: Database["public"]["Enums"]["review_sent_via"]
          status?: Database["public"]["Enums"]["review_request_status"]
        }
        Relationships: []
      }
      review_responses: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          posted_to_external: boolean
          responded_by: string | null
          response_text: string
          review_id: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          posted_to_external?: boolean
          responded_by?: string | null
          response_text: string
          review_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          posted_to_external?: boolean
          responded_by?: string | null
          response_text?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_settings: {
        Row: {
          clinic_id: string
          created_at: string
          google_business_url: string | null
          id: string
          internal_thank_you_message: string | null
          is_enabled: boolean
          negative_feedback_alert_email: string | null
          smart_filter_enabled: boolean
          trigger_hours_after_appointment: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          google_business_url?: string | null
          id?: string
          internal_thank_you_message?: string | null
          is_enabled?: boolean
          negative_feedback_alert_email?: string | null
          smart_filter_enabled?: boolean
          trigger_hours_after_appointment?: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          google_business_url?: string | null
          id?: string
          internal_thank_you_message?: string | null
          is_enabled?: boolean
          negative_feedback_alert_email?: string | null
          smart_filter_enabled?: boolean
          trigger_hours_after_appointment?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          body: string | null
          client_id: string | null
          clinic_id: string
          created_at: string
          external_review_id: string | null
          external_url: string | null
          id: string
          is_published: boolean
          is_responded: boolean
          platform: string
          posted_at: string | null
          rating: number
          request_id: string | null
          responded: boolean
          reviewer_name: string
          source: string
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          client_id?: string | null
          clinic_id: string
          created_at?: string
          external_review_id?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          is_responded?: boolean
          platform?: string
          posted_at?: string | null
          rating?: number
          request_id?: string | null
          responded?: boolean
          reviewer_name: string
          source?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          client_id?: string | null
          clinic_id?: string
          created_at?: string
          external_review_id?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          is_responded?: boolean
          platform?: string
          posted_at?: string | null
          rating?: number
          request_id?: string | null
          responded?: boolean
          reviewer_name?: string
          source?: string
          title?: string | null
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
      service_locations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          location_id: string
          price_override_cents: number | null
          service_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          location_id: string
          price_override_cents?: number | null
          service_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          location_id?: string
          price_override_cents?: number | null
          service_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          booking_description: string | null
          category: string | null
          cleanup_time_minutes: number
          clinic_id: string
          created_at: string
          deposit_cents: number
          deposit_required: boolean
          description: string | null
          dosage_notes: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          member_price_cents: number | null
          name: string
          online_booking_enabled: boolean
          post_treatment_aftercare: string | null
          pre_treatment_instructions: string | null
          prep_time_minutes: number
          price_cents: number
          recommended_interval: string | null
          sub_category: string | null
          tax_category: string | null
          treatment_area_tags: string[] | null
          updated_at: string
          visible_online: boolean | null
        }
        Insert: {
          active?: boolean
          booking_description?: string | null
          category?: string | null
          cleanup_time_minutes?: number
          clinic_id: string
          created_at?: string
          deposit_cents?: number
          deposit_required?: boolean
          description?: string | null
          dosage_notes?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          member_price_cents?: number | null
          name: string
          online_booking_enabled?: boolean
          post_treatment_aftercare?: string | null
          pre_treatment_instructions?: string | null
          prep_time_minutes?: number
          price_cents?: number
          recommended_interval?: string | null
          sub_category?: string | null
          tax_category?: string | null
          treatment_area_tags?: string[] | null
          updated_at?: string
          visible_online?: boolean | null
        }
        Update: {
          active?: boolean
          booking_description?: string | null
          category?: string | null
          cleanup_time_minutes?: number
          clinic_id?: string
          created_at?: string
          deposit_cents?: number
          deposit_required?: boolean
          description?: string | null
          dosage_notes?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          member_price_cents?: number | null
          name?: string
          online_booking_enabled?: boolean
          post_treatment_aftercare?: string | null
          pre_treatment_instructions?: string | null
          prep_time_minutes?: number
          price_cents?: number
          recommended_interval?: string | null
          sub_category?: string | null
          tax_category?: string | null
          treatment_area_tags?: string[] | null
          updated_at?: string
          visible_online?: boolean | null
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
      signed_consents: {
        Row: {
          client_id: string | null
          client_name: string
          clinic_id: string
          consent_body: string | null
          consent_form_id: string
          consent_title: string
          created_at: string
          id: string
          signature_data: string
          signed_at: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          clinic_id: string
          consent_body?: string | null
          consent_form_id: string
          consent_title: string
          created_at?: string
          id?: string
          signature_data: string
          signed_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          clinic_id?: string
          consent_body?: string | null
          consent_form_id?: string
          consent_title?: string
          created_at?: string
          id?: string
          signature_data?: string
          signed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      signup_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: unknown
          success: boolean | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address: unknown
          success?: boolean | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Relationships: []
      }
      soap_note_amendments: {
        Row: {
          amended_at: string
          amended_by: string
          amendment_reason: string
          clinic_id: string
          id: string
          new_assessment: string
          new_objective: string
          new_plan: string
          new_subjective: string
          note_id: string
          previous_assessment: string
          previous_objective: string
          previous_plan: string
          previous_subjective: string
        }
        Insert: {
          amended_at?: string
          amended_by: string
          amendment_reason: string
          clinic_id: string
          id?: string
          new_assessment?: string
          new_objective?: string
          new_plan?: string
          new_subjective?: string
          note_id: string
          previous_assessment?: string
          previous_objective?: string
          previous_plan?: string
          previous_subjective?: string
        }
        Update: {
          amended_at?: string
          amended_by?: string
          amendment_reason?: string
          clinic_id?: string
          id?: string
          new_assessment?: string
          new_objective?: string
          new_plan?: string
          new_subjective?: string
          note_id?: string
          previous_assessment?: string
          previous_objective?: string
          previous_plan?: string
          previous_subjective?: string
        }
        Relationships: [
          {
            foreignKeyName: "soap_note_amendments_amended_by_fkey"
            columns: ["amended_by"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_note_amendments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_note_amendments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "soap_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_notes: {
        Row: {
          amendment_count: number
          amendment_reason: string | null
          appointment_id: string | null
          assessment: string
          client_id: string
          clinic_id: string
          created_at: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          objective: string
          plan: string
          provider_id: string
          service_id: string | null
          status: Database["public"]["Enums"]["soap_note_status"]
          subjective: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          amendment_count?: number
          amendment_reason?: string | null
          appointment_id?: string | null
          assessment?: string
          client_id: string
          clinic_id: string
          created_at?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          objective?: string
          plan?: string
          provider_id: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["soap_note_status"]
          subjective?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          amendment_count?: number
          amendment_reason?: string | null
          appointment_id?: string | null
          assessment?: string
          client_id?: string
          clinic_id?: string
          created_at?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          objective?: string
          plan?: string
          provider_id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["soap_note_status"]
          subjective?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soap_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "soap_notes_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "soap_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_templates: {
        Row: {
          assessment_template: string
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          objective_template: string
          plan_template: string
          service_id: string | null
          subjective_template: string
          updated_at: string
        }
        Insert: {
          assessment_template?: string
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          objective_template?: string
          plan_template?: string
          service_id?: string | null
          subjective_template?: string
          updated_at?: string
        }
        Update: {
          assessment_template?: string
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          objective_template?: string
          plan_template?: string
          service_id?: string | null
          subjective_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soap_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          bio: string | null
          booking_bio: string | null
          clinic_id: string
          color: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          online_booking_visible: boolean
          phone: string | null
          photo_url: string | null
          role: string
          title: string | null
          updated_at: string
          user_id: string | null
          visible_online: boolean | null
          working_hours: Json | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          booking_bio?: string | null
          clinic_id: string
          color?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          online_booking_visible?: boolean
          phone?: string | null
          photo_url?: string | null
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          visible_online?: boolean | null
          working_hours?: Json | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          booking_bio?: string | null
          clinic_id?: string
          color?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          online_booking_visible?: boolean
          phone?: string | null
          photo_url?: string | null
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          visible_online?: boolean | null
          working_hours?: Json | null
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
      staff_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          primary_location: boolean
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          primary_location?: boolean
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          primary_location?: boolean
          staff_id?: string
        }
        Relationships: []
      }
      staff_services: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          service_id: string
          staff_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          service_id: string
          staff_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          service_id?: string
          staff_id?: string
        }
        Relationships: []
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
      treatment_plan_photos: {
        Row: {
          clinic_id: string
          created_at: string
          has_consent: boolean
          id: string
          notes: string
          photo_type: Database["public"]["Enums"]["photo_type"]
          photo_url: string
          plan_id: string
          session_id: string | null
          taken_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          has_consent?: boolean
          id?: string
          notes?: string
          photo_type?: Database["public"]["Enums"]["photo_type"]
          photo_url: string
          plan_id: string
          session_id?: string | null
          taken_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          has_consent?: boolean
          id?: string
          notes?: string
          photo_type?: Database["public"]["Enums"]["photo_type"]
          photo_url?: string
          plan_id?: string
          session_id?: string | null
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_photos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_photos_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_photos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_sessions: {
        Row: {
          after_photo_url: string | null
          appointment_id: string | null
          before_photo_url: string | null
          clinic_id: string
          completed_date: string | null
          created_at: string
          id: string
          notes: string
          plan_id: string
          scheduled_date: string | null
          session_number: number
          session_price_cents: number
          status: Database["public"]["Enums"]["plan_session_status"]
          updated_at: string
        }
        Insert: {
          after_photo_url?: string | null
          appointment_id?: string | null
          before_photo_url?: string | null
          clinic_id: string
          completed_date?: string | null
          created_at?: string
          id?: string
          notes?: string
          plan_id: string
          scheduled_date?: string | null
          session_number?: number
          session_price_cents?: number
          status?: Database["public"]["Enums"]["plan_session_status"]
          updated_at?: string
        }
        Update: {
          after_photo_url?: string | null
          appointment_id?: string | null
          before_photo_url?: string | null
          clinic_id?: string
          completed_date?: string | null
          created_at?: string
          id?: string
          notes?: string
          plan_id?: string
          scheduled_date?: string | null
          session_number?: number
          session_price_cents?: number
          status?: Database["public"]["Enums"]["plan_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_templates: {
        Row: {
          clinic_id: string
          created_at: string
          default_session_count: number
          default_session_interval_days: number
          description: string
          id: string
          is_active: boolean
          name: string
          service_id: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          default_session_count?: number
          default_session_interval_days?: number
          description?: string
          id?: string
          is_active?: boolean
          name: string
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          default_session_count?: number
          default_session_interval_days?: number
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          client_id: string
          client_signed_at: string | null
          clinic_id: string
          created_at: string
          description: string
          end_date: string | null
          goals: string
          id: string
          name: string
          notes: string
          paid_cents: number
          provider_id: string
          service_id: string | null
          sessions_completed: number
          signature_data: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["treatment_plan_status"]
          template_id: string | null
          total_price_cents: number
          total_sessions_planned: number
          updated_at: string
        }
        Insert: {
          client_id: string
          client_signed_at?: string | null
          clinic_id: string
          created_at?: string
          description?: string
          end_date?: string | null
          goals?: string
          id?: string
          name: string
          notes?: string
          paid_cents?: number
          provider_id: string
          service_id?: string | null
          sessions_completed?: number
          signature_data?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"]
          template_id?: string | null
          total_price_cents?: number
          total_sessions_planned?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_signed_at?: string | null
          clinic_id?: string
          created_at?: string
          description?: string
          end_date?: string | null
          goals?: string
          id?: string
          name?: string
          notes?: string
          paid_cents?: number
          provider_id?: string
          service_id?: string | null
          sessions_completed?: number
          signature_data?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"]
          template_id?: string | null
          total_price_cents?: number
          total_sessions_planned?: number
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
          {
            foreignKeyName: "treatment_plans_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clinic_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_templates"
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
      seed_clinical_templates: {
        Args: { p_clinic_id: string }
        Returns: undefined
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
      consent_actor_type: "clinic_staff" | "client" | "witness" | "system"
      consent_audit_action:
        | "created"
        | "sent"
        | "opened"
        | "viewed"
        | "signed"
        | "witness_signed"
        | "declined"
        | "revoked"
        | "downloaded"
      consent_signature_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "declined"
        | "expired"
        | "revoked"
      deposit_status: "pending" | "collected" | "refunded" | "forfeited"
      lead_activity_type:
        | "stage_change"
        | "note"
        | "call_made"
        | "email_sent"
        | "sms_sent"
        | "meeting_booked"
        | "appointment_booked"
        | "converted"
        | "follow_up_set"
      lead_stage:
        | "new"
        | "contacted"
        | "qualified"
        | "consultation_booked"
        | "treatment_booked"
        | "converted"
        | "consult_booked"
        | "won"
        | "lost"
      photo_type: "before" | "after" | "progress" | "other"
      plan_session_status: "scheduled" | "completed" | "missed" | "cancelled"
      referral_status:
        | "invited"
        | "signed_up"
        | "first_appointment_completed"
        | "rewarded"
        | "expired"
      review_platform: "internal" | "google" | "yelp" | "facebook" | "instagram"
      review_request_status:
        | "pending"
        | "sent"
        | "opened"
        | "completed"
        | "expired"
      review_sent_via: "email" | "sms" | "both"
      reward_status: "pending" | "available" | "redeemed" | "expired"
      reward_type: "credit" | "percentage" | "free_service" | "custom"
      soap_note_status: "draft" | "finalized" | "amended"
      task_status: "todo" | "in_progress" | "done"
      treatment_plan_status:
        | "proposed"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      consent_actor_type: ["clinic_staff", "client", "witness", "system"],
      consent_audit_action: [
        "created",
        "sent",
        "opened",
        "viewed",
        "signed",
        "witness_signed",
        "declined",
        "revoked",
        "downloaded",
      ],
      consent_signature_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "declined",
        "expired",
        "revoked",
      ],
      deposit_status: ["pending", "collected", "refunded", "forfeited"],
      lead_activity_type: [
        "stage_change",
        "note",
        "call_made",
        "email_sent",
        "sms_sent",
        "meeting_booked",
        "appointment_booked",
        "converted",
        "follow_up_set",
      ],
      lead_stage: [
        "new",
        "contacted",
        "qualified",
        "consultation_booked",
        "treatment_booked",
        "converted",
        "consult_booked",
        "won",
        "lost",
      ],
      photo_type: ["before", "after", "progress", "other"],
      plan_session_status: ["scheduled", "completed", "missed", "cancelled"],
      referral_status: [
        "invited",
        "signed_up",
        "first_appointment_completed",
        "rewarded",
        "expired",
      ],
      review_platform: ["internal", "google", "yelp", "facebook", "instagram"],
      review_request_status: [
        "pending",
        "sent",
        "opened",
        "completed",
        "expired",
      ],
      review_sent_via: ["email", "sms", "both"],
      reward_status: ["pending", "available", "redeemed", "expired"],
      reward_type: ["credit", "percentage", "free_service", "custom"],
      soap_note_status: ["draft", "finalized", "amended"],
      task_status: ["todo", "in_progress", "done"],
      treatment_plan_status: [
        "proposed",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
