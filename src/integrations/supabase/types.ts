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
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          meta: Json
          reason: string | null
          target_id: string | null
          target_label: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      agencies: {
        Row: {
          admin_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          accepted_at: string | null
          agency_id: string
          created_at: string
          id: string
          invited_by: string | null
          invited_email: string | null
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_clients: {
        Row: {
          agent_id: string
          avatar_url: string | null
          budget: number | null
          client_type: string
          created_at: string
          currency: string | null
          email: string | null
          full_name: string
          id: string
          interested_property_id: string | null
          last_activity_at: string | null
          notes: string | null
          phone: string | null
          preferred_area: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          avatar_url?: string | null
          budget?: number | null
          client_type?: string
          created_at?: string
          currency?: string | null
          email?: string | null
          full_name: string
          id?: string
          interested_property_id?: string | null
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_area?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          avatar_url?: string | null
          budget?: number | null
          client_type?: string
          created_at?: string
          currency?: string | null
          email?: string | null
          full_name?: string
          id?: string
          interested_property_id?: string | null
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_area?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_clients_interested_property_id_fkey"
            columns: ["interested_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clients_interested_property_id_fkey"
            columns: ["interested_property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clients_interested_property_id_fkey"
            columns: ["interested_property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          active: boolean
          agent_limit: number | null
          badge: string | null
          billing_frequency: string
          created_at: string
          currency: string
          description: string | null
          effective_from: string
          features: Json
          id: string
          listing_limit: number | null
          name: string
          price_annual: number
          price_monthly: number
          sort_order: number
          tagline: string
          target_roles: string[]
          tax_inclusive: boolean
          tax_rate: number
          team_limit: number | null
          unit_limit: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          agent_limit?: number | null
          badge?: string | null
          billing_frequency?: string
          created_at?: string
          currency?: string
          description?: string | null
          effective_from?: string
          features?: Json
          id: string
          listing_limit?: number | null
          name: string
          price_annual?: number
          price_monthly?: number
          sort_order?: number
          tagline?: string
          target_roles?: string[]
          tax_inclusive?: boolean
          tax_rate?: number
          team_limit?: number | null
          unit_limit?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          agent_limit?: number | null
          badge?: string | null
          billing_frequency?: string
          created_at?: string
          currency?: string
          description?: string | null
          effective_from?: string
          features?: Json
          id?: string
          listing_limit?: number | null
          name?: string
          price_annual?: number
          price_monthly?: number
          sort_order?: number
          tagline?: string
          target_roles?: string[]
          tax_inclusive?: boolean
          tax_rate?: number
          team_limit?: number | null
          unit_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agent_id: string | null
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          contact_phone: string | null
          created_at: string
          deal_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_minutes: number
          id: string
          lead_id: string | null
          message: string | null
          notes: string | null
          owner_id: string
          property_id: string
          recipient_id: string | null
          scheduled_at: string
          status: string
          suggested_at: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id: string
          buyer_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id?: string | null
          message?: string | null
          notes?: string | null
          owner_id: string
          property_id: string
          recipient_id?: string | null
          scheduled_at: string
          status?: string
          suggested_at?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id?: string
          buyer_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id?: string | null
          message?: string | null
          notes?: string | null
          owner_id?: string
          property_id?: string
          recipient_id?: string | null
          scheduled_at?: string
          status?: string
          suggested_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contractors: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          service_category: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          service_category?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          service_category?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          owner_id: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          actor_id: string | null
          created_at: string
          deal_id: string
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["deal_activity_kind"]
          label: string
          meta: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          deal_id: string
          detail?: string | null
          id?: string
          kind: Database["public"]["Enums"]["deal_activity_kind"]
          label: string
          meta?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          deal_id?: string
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["deal_activity_kind"]
          label?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          amount: number | null
          created_at: string
          deal_id: string
          id: string
          label: string
          new_value: Json | null
          note: string | null
          offer_id: string | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          amount?: number | null
          created_at?: string
          deal_id: string
          id?: string
          label: string
          new_value?: Json | null
          note?: string | null
          offer_id?: string | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          amount?: number | null
          created_at?: string
          deal_id?: string
          id?: string
          label?: string
          new_value?: Json | null
          note?: string | null
          offer_id?: string | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_audit_log_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_audit_log_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deal_id: string
          id: string
          key: string
          label: string
          phase: string
          required: boolean
          sort_order: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deal_id: string
          id?: string
          key: string
          label: string
          phase?: string
          required?: boolean
          sort_order?: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          key?: string
          label?: string
          phase?: string
          required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_checklist_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_commissions: {
        Row: {
          agent_id: string
          amount: number
          cancelled_at: string | null
          completion_condition: string
          created_at: string
          currency: string
          deal_id: string
          id: string
          paid_at: string | null
          payable_at: string | null
          protected_at: string | null
          rate: number | null
          rule_id: string | null
          rule_label: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          amount?: number
          cancelled_at?: string | null
          completion_condition?: string
          created_at?: string
          currency?: string
          deal_id: string
          id?: string
          paid_at?: string | null
          payable_at?: string | null
          protected_at?: string | null
          rate?: number | null
          rule_id?: string | null
          rule_label?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          amount?: number
          cancelled_at?: string | null
          completion_condition?: string
          created_at?: string
          currency?: string
          deal_id?: string
          id?: string
          paid_at?: string | null
          payable_at?: string | null
          protected_at?: string | null
          rate?: number | null
          rule_id?: string | null
          rule_label?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_commissions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_documents: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          kind: Database["public"]["Enums"]["deal_document_kind"]
          mime_type: string | null
          name: string
          offer_id: string | null
          size: number | null
          status: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          kind?: Database["public"]["Enums"]["deal_document_kind"]
          mime_type?: string | null
          name: string
          offer_id?: string | null
          size?: number | null
          status?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["deal_document_kind"]
          mime_type?: string | null
          name?: string
          offer_id?: string | null
          size?: number | null
          status?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_payment_items: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deal_id: string
          id: string
          is_test: boolean
          kind: string
          label: string
          paid_at: string | null
          payer: string
          payment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id: string
          id?: string
          is_test?: boolean
          kind: string
          label: string
          paid_at?: string | null
          payer?: string
          payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deal_id?: string
          id?: string
          is_test?: boolean
          kind?: string
          label?: string
          paid_at?: string | null
          payer?: string
          payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_payment_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_payment_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          agency_id: string | null
          agent_commission: number | null
          agent_id: string | null
          agreed_price: number | null
          agreement_at: string | null
          asking_price: number | null
          buyer_confirmed_at: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          cancel_reason: string | null
          commission_rate: number | null
          commission_rule_id: string | null
          commission_rule_label: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          currency: string
          current_offer_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          estimated_spaces_fee: number | null
          expected_close_at: string | null
          fee_fixed_used: number | null
          fee_rate_used: number | null
          fees_locked_at: string | null
          health: Database["public"]["Enums"]["deal_health"]
          id: string
          kanban_position: number
          last_activity_at: string
          lead_id: string | null
          next_follow_up_at: string | null
          notes: string | null
          other_charges: number
          owner_id: string | null
          priority: Database["public"]["Enums"]["deal_priority"]
          property_id: string | null
          reference: string
          seller_confirmed_at: string | null
          spaces_fee_rule_id: string | null
          spaces_fee_tax: number | null
          stage: Database["public"]["Enums"]["deal_stage"]
          tax_rate_used: number | null
          transaction_type: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          agency_id?: string | null
          agent_commission?: number | null
          agent_id?: string | null
          agreed_price?: number | null
          agreement_at?: string | null
          asking_price?: number | null
          buyer_confirmed_at?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancel_reason?: string | null
          commission_rate?: number | null
          commission_rule_id?: string | null
          commission_rule_label?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          current_offer_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_spaces_fee?: number | null
          expected_close_at?: string | null
          fee_fixed_used?: number | null
          fee_rate_used?: number | null
          fees_locked_at?: string | null
          health?: Database["public"]["Enums"]["deal_health"]
          id?: string
          kanban_position?: number
          last_activity_at?: string
          lead_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          other_charges?: number
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          property_id?: string | null
          reference?: string
          seller_confirmed_at?: string | null
          spaces_fee_rule_id?: string | null
          spaces_fee_tax?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tax_rate_used?: number | null
          transaction_type?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          agency_id?: string | null
          agent_commission?: number | null
          agent_id?: string | null
          agreed_price?: number | null
          agreement_at?: string | null
          asking_price?: number | null
          buyer_confirmed_at?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancel_reason?: string | null
          commission_rate?: number | null
          commission_rule_id?: string | null
          commission_rule_label?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          current_offer_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_spaces_fee?: number | null
          expected_close_at?: string | null
          fee_fixed_used?: number | null
          fee_rate_used?: number | null
          fees_locked_at?: string | null
          health?: Database["public"]["Enums"]["deal_health"]
          id?: string
          kanban_position?: number
          last_activity_at?: string
          lead_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          other_charges?: number
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          property_id?: string | null
          reference?: string
          seller_confirmed_at?: string | null
          spaces_fee_rule_id?: string | null
          spaces_fee_tax?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tax_rate_used?: number | null
          transaction_type?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_current_offer_fk"
            columns: ["current_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_spaces_fee_rule_id_fkey"
            columns: ["spaces_fee_rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contact_method: string
          conversation_id: string | null
          created_at: string
          deal_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          first_responded_at: string | null
          id: string
          last_activity_at: string
          lost_reason: string | null
          message: string | null
          notes: string | null
          owner_id: string
          property_id: string
          status: string
          updated_at: string
          visitor_email: string | null
          visitor_id: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          contact_method: string
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          first_responded_at?: string | null
          id?: string
          last_activity_at?: string
          lost_reason?: string | null
          message?: string | null
          notes?: string | null
          owner_id: string
          property_id: string
          status?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          contact_method?: string
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          first_responded_at?: string | null
          id?: string
          last_activity_at?: string
          lost_reason?: string | null
          message?: string | null
          notes?: string | null
          owner_id?: string
          property_id?: string
          status?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          created_at: string
          currency: string
          deposit_amount: number | null
          document_path: string | null
          end_date: string | null
          id: string
          late_fee_grace_days: number | null
          late_fee_type: string
          late_fee_value: number | null
          manager_id: string | null
          monthly_rent: number
          notice_period_days: number | null
          owner_id: string
          payment_frequency: string
          property_id: string
          renewal_date: string | null
          service_charge: number | null
          signed_document_path: string | null
          special_terms: string | null
          start_date: string
          status: string
          tenant_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          document_path?: string | null
          end_date?: string | null
          id?: string
          late_fee_grace_days?: number | null
          late_fee_type?: string
          late_fee_value?: number | null
          manager_id?: string | null
          monthly_rent?: number
          notice_period_days?: number | null
          owner_id: string
          payment_frequency?: string
          property_id: string
          renewal_date?: string | null
          service_charge?: number | null
          signed_document_path?: string | null
          special_terms?: string | null
          start_date: string
          status?: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          document_path?: string | null
          end_date?: string | null
          id?: string
          late_fee_grace_days?: number | null
          late_fee_type?: string
          late_fee_value?: number | null
          manager_id?: string | null
          monthly_rent?: number
          notice_period_days?: number | null
          owner_id?: string
          payment_frequency?: string
          property_id?: string
          renewal_date?: string | null
          service_charge?: number | null
          signed_document_path?: string | null
          special_terms?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          actual_cost: number | null
          approved_cost: number | null
          category: string
          closed_at: string | null
          contractor_id: string | null
          created_at: string
          currency: string
          description: string
          estimated_cost: number | null
          id: string
          lease_id: string | null
          notes: string | null
          owner_id: string
          priority: string
          property_id: string
          reported_by: string | null
          status: string
          tenant_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          approved_cost?: number | null
          category?: string
          closed_at?: string | null
          contractor_id?: string | null
          created_at?: string
          currency?: string
          description: string
          estimated_cost?: number | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          owner_id: string
          priority?: string
          property_id: string
          reported_by?: string | null
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          approved_cost?: number | null
          category?: string
          closed_at?: string | null
          contractor_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          owner_id?: string
          priority?: string
          property_id?: string
          reported_by?: string | null
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      management_documents: {
        Row: {
          charge_id: string | null
          created_at: string
          doc_type: string
          id: string
          lease_id: string | null
          mime_type: string | null
          name: string
          owner_id: string
          payment_id: string | null
          property_id: string | null
          size: number | null
          storage_path: string
          tenant_id: string | null
          ticket_id: string | null
          unit_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          charge_id?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          lease_id?: string | null
          mime_type?: string | null
          name: string
          owner_id: string
          payment_id?: string | null
          property_id?: string | null
          size?: number | null
          storage_path: string
          tenant_id?: string | null
          ticket_id?: string | null
          unit_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          charge_id?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          lease_id?: string | null
          mime_type?: string | null
          name?: string
          owner_id?: string
          payment_id?: string | null
          property_id?: string | null
          size?: number | null
          storage_path?: string
          tenant_id?: string | null
          ticket_id?: string | null
          unit_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "management_documents_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "rent_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "rent_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email: boolean
          in_app: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: boolean
          in_app?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: boolean
          in_app?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          dedupe_key: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          accepted_at: string | null
          agency_id: string | null
          agent_id: string | null
          amount: number
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          buyer_phone: string | null
          completion_date: string | null
          conditions: string | null
          created_at: string
          currency: string
          deal_id: string
          declined_at: string | null
          deposit_amount: number | null
          expired_at: string | null
          expires_at: string | null
          financing_method: string | null
          id: string
          made_by: string
          made_by_side: string
          message: string | null
          owner_id: string | null
          parent_offer_id: string | null
          property_id: string
          reference: string
          responded_at: string | null
          status: string
          submitted_at: string
          updated_at: string
          viewed_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          agency_id?: string | null
          agent_id?: string | null
          amount: number
          buyer_email?: string | null
          buyer_id: string
          buyer_name?: string | null
          buyer_phone?: string | null
          completion_date?: string | null
          conditions?: string | null
          created_at?: string
          currency?: string
          deal_id: string
          declined_at?: string | null
          deposit_amount?: number | null
          expired_at?: string | null
          expires_at?: string | null
          financing_method?: string | null
          id?: string
          made_by: string
          made_by_side: string
          message?: string | null
          owner_id?: string | null
          parent_offer_id?: string | null
          property_id: string
          reference?: string
          responded_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          viewed_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string | null
          agent_id?: string | null
          amount?: number
          buyer_email?: string | null
          buyer_id?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          completion_date?: string | null
          conditions?: string | null
          created_at?: string
          currency?: string
          deal_id?: string
          declined_at?: string | null
          deposit_amount?: number | null
          expired_at?: string | null
          expires_at?: string | null
          financing_method?: string | null
          id?: string
          made_by?: string
          made_by_side?: string
          message?: string | null
          owner_id?: string | null
          parent_offer_id?: string | null
          property_id?: string
          reference?: string
          responded_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          viewed_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          billing_cycle: string | null
          channel: string | null
          created_at: string
          currency: string
          deal_id: string | null
          failure_reason: string | null
          gateway_url: string | null
          id: string
          is_test: boolean
          metadata: Json
          paid_at: string | null
          payment_type: string | null
          plan_id: string | null
          provider: string
          provider_reference: string | null
          provider_transaction_id: string | null
          purpose: string
          receipt_number: string | null
          reference: string | null
          refund_status: string | null
          refunded_at: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          deal_id?: string | null
          failure_reason?: string | null
          gateway_url?: string | null
          id?: string
          is_test?: boolean
          metadata?: Json
          paid_at?: string | null
          payment_type?: string | null
          plan_id?: string | null
          provider: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          purpose?: string
          receipt_number?: string | null
          reference?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          deal_id?: string | null
          failure_reason?: string | null
          gateway_url?: string | null
          id?: string
          is_test?: boolean
          metadata?: Json
          paid_at?: string | null
          payment_type?: string | null
          plan_id?: string | null
          provider?: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          purpose?: string
          receipt_number?: string | null
          reference?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      pricing_change_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          active: boolean
          applies_to: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          effective_from: string
          effective_to: string | null
          fixed_amount: number
          id: string
          max_amount: number | null
          min_amount: number | null
          name: string
          payer: string
          percentage: number
          rule_type: string
          sort_order: number
          target_roles: string[]
          tax_rate: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          fixed_amount?: number
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          name: string
          payer?: string
          percentage?: number
          rule_type: string
          sort_order?: number
          target_roles?: string[]
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          fixed_amount?: number
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          payer?: string
          percentage?: number
          rule_type?: string
          sort_order?: number
          target_roles?: string[]
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          agency_name: string | null
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          location: string | null
          national_id: string | null
          phone: string | null
          suspended_until: string | null
          suspension_reason: string | null
          updated_at: string
          verified_agent: boolean
          verified_business: boolean
          verified_identity: boolean
          verified_owner: boolean
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          national_id?: string | null
          phone?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          verified_agent?: boolean
          verified_business?: boolean
          verified_identity?: boolean
          verified_owner?: boolean
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          national_id?: string | null
          phone?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          verified_agent?: boolean
          verified_business?: boolean
          verified_identity?: boolean
          verified_owner?: boolean
        }
        Relationships: []
      }
      promotion_products: {
        Row: {
          active: boolean
          badge_label: string
          created_at: string
          currency: string
          description: string
          duration_days: number
          effective_from: string
          id: string
          name: string
          placement: string
          price: number
          priority_score: number
          sort_order: number
          target_roles: string[]
          tax_rate: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_label?: string
          created_at?: string
          currency?: string
          description?: string
          duration_days?: number
          effective_from?: string
          id: string
          name: string
          placement?: string
          price?: number
          priority_score?: number
          sort_order?: number
          target_roles?: string[]
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_label?: string
          created_at?: string
          currency?: string
          description?: string
          duration_days?: number
          effective_from?: string
          id?: string
          name?: string
          placement?: string
          price?: number
          priority_score?: number
          sort_order?: number
          target_roles?: string[]
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[]
          area_sqm: number | null
          availability: string
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          currency: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          district: string | null
          featured: boolean
          floor: number | null
          id: string
          landmark: string | null
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          negotiable: boolean
          owner_id: string
          parking: number | null
          parking_available: boolean
          preferred_contact: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          region: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["property_status"]
          street: string | null
          title: string
          under_review: boolean
          under_review_reason: string | null
          updated_at: string
          verification_status: string
          verified: boolean
          view_count: number
          ward: string | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          area_sqm?: number | null
          availability?: string
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          district?: string | null
          featured?: boolean
          floor?: number | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          negotiable?: boolean
          owner_id: string
          parking?: number | null
          parking_available?: boolean
          preferred_contact?: string | null
          price?: number
          property_type: Database["public"]["Enums"]["property_type"]
          region?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          street?: string | null
          title: string
          under_review?: boolean
          under_review_reason?: string | null
          updated_at?: string
          verification_status?: string
          verified?: boolean
          view_count?: number
          ward?: string | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          amenities?: string[]
          area_sqm?: number | null
          availability?: string
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          district?: string | null
          featured?: boolean
          floor?: number | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          negotiable?: boolean
          owner_id?: string
          parking?: number | null
          parking_available?: boolean
          preferred_contact?: string | null
          price?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          region?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          street?: string | null
          title?: string
          under_review?: boolean
          under_review_reason?: string | null
          updated_at?: string
          verification_status?: string
          verified?: boolean
          view_count?: number
          ward?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      property_agents: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          owner_id: string
          permission: Database["public"]["Enums"]["agent_permission"]
          property_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          owner_id: string
          permission?: Database["public"]["Enums"]["agent_permission"]
          property_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          permission?: Database["public"]["Enums"]["agent_permission"]
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_contacts: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          property_id: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_managers: {
        Row: {
          accepted_at: string | null
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          id: string
          invited_at: string
          invited_by: string | null
          manager_id: string
          owner_id: string
          permission: string
          property_id: string
          responded_at: string | null
          scopes: Json
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          manager_id: string
          owner_id: string
          permission?: string
          property_id: string
          responded_at?: string | null
          scopes?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          manager_id?: string
          owner_id?: string
          permission?: string
          property_id?: string
          responded_at?: string | null
          scopes?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_managers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_managers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_managers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          position: number
          property_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          position?: number
          property_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          position?: number
          property_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_promotions: {
        Row: {
          created_at: string
          currency: string
          duration_days: number
          ends_at: string | null
          id: string
          payment_id: string | null
          price: number
          product_id: string
          property_id: string
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          payment_id?: string | null
          price?: number
          product_id: string
          property_id: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          payment_id?: string | null
          price?: number
          product_id?: string
          property_id?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_promotions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "promotion_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_promotions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_promotions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_promotions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          property_id: string
          reason: string
          reporter_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          property_id: string
          reason: string
          reporter_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          property_id?: string
          reason?: string
          reporter_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          currency: string
          deposit_amount: number | null
          id: string
          name: string
          notes: string | null
          occupancy_status: string
          owner_id: string
          property_id: string
          rent_amount: number | null
          service_charge: number | null
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          id?: string
          name: string
          notes?: string | null
          occupancy_status?: string
          owner_id: string
          property_id: string
          rent_amount?: number | null
          service_charge?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          id?: string
          name?: string
          notes?: string | null
          occupancy_status?: string
          owner_id?: string
          property_id?: string
          rent_amount?: number | null
          service_charge?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_views: {
        Row: {
          created_at: string
          id: string
          property_id: string
          session_id: string | null
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          session_id?: string | null
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          session_id?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_charges: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          due_date: string
          id: string
          lease_id: string
          notes: string | null
          owner_id: string
          period_end: string | null
          period_start: string | null
          property_id: string
          status: string
          tenant_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          lease_id: string
          notes?: string | null
          owner_id: string
          period_end?: string | null
          period_start?: string | null
          property_id: string
          status?: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          lease_id?: string
          notes?: string | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          property_id?: string
          status?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_charges_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_charges_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_charges_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          charge_id: string
          created_at: string
          currency: string
          id: string
          lease_id: string
          method: string
          owner_id: string
          paid_at: string | null
          proof_path: string | null
          property_id: string
          receipt_path: string | null
          recorded_by: string | null
          reference: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          charge_id: string
          created_at?: string
          currency?: string
          id?: string
          lease_id: string
          method?: string
          owner_id: string
          paid_at?: string | null
          proof_path?: string | null
          property_id: string
          receipt_path?: string | null
          recorded_by?: string | null
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          charge_id?: string
          created_at?: string
          currency?: string
          id?: string
          lease_id?: string
          method?: string
          owner_id?: string
          paid_at?: string | null
          proof_path?: string | null
          property_id?: string
          receipt_path?: string | null
          recorded_by?: string | null
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "rent_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["report_status"] | null
          id: string
          note: string | null
          report_id: string
          to_status: Database["public"]["Enums"]["report_status"] | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["report_status"] | null
          id?: string
          note?: string | null
          report_id: string
          to_status?: Database["public"]["Enums"]["report_status"] | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["report_status"] | null
          id?: string
          note?: string | null
          report_id?: string
          to_status?: Database["public"]["Enums"]["report_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "report_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "safety_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      review_moderation_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          review_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          review_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          review_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_moderation_events_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          review_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          review_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          categories: Json
          comment: string | null
          created_at: string
          deal_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          property_id: string | null
          published_at: string | null
          rating: number
          response: string | null
          response_at: string | null
          response_by: string | null
          reviewer_id: string
          reviewer_role: string
          status: Database["public"]["Enums"]["review_status"]
          status_reason: string | null
          subject_type: Database["public"]["Enums"]["review_subject_type"]
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          categories?: Json
          comment?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          property_id?: string | null
          published_at?: string | null
          rating: number
          response?: string | null
          response_at?: string | null
          response_by?: string | null
          reviewer_id: string
          reviewer_role?: string
          status?: Database["public"]["Enums"]["review_status"]
          status_reason?: string | null
          subject_type: Database["public"]["Enums"]["review_subject_type"]
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          categories?: Json
          comment?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          property_id?: string | null
          published_at?: string | null
          rating?: number
          response?: string | null
          response_at?: string | null
          response_by?: string | null
          reviewer_id?: string
          reviewer_role?: string
          status?: Database["public"]["Enums"]["review_status"]
          status_reason?: string | null
          subject_type?: Database["public"]["Enums"]["review_subject_type"]
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_reports: {
        Row: {
          assigned_admin_id: string | null
          conversation_id: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          evidence_path: string | null
          id: string
          message_id: string | null
          priority: Database["public"]["Enums"]["report_priority"]
          property_id: string | null
          reason: string
          reference: string
          reported_user_id: string | null
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_type: Database["public"]["Enums"]["report_target_type"]
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          conversation_id?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          evidence_path?: string | null
          id?: string
          message_id?: string | null
          priority?: Database["public"]["Enums"]["report_priority"]
          property_id?: string | null
          reason: string
          reference?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_type: Database["public"]["Enums"]["report_target_type"]
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          conversation_id?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          evidence_path?: string | null
          id?: string
          message_id?: string | null
          priority?: Database["public"]["Enums"]["report_priority"]
          property_id?: string | null
          reason?: string
          reference?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_type?: Database["public"]["Enums"]["report_target_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alerts_enabled: boolean
          created_at: string
          filters: Json
          frequency: string
          id: string
          last_alert_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean
          created_at?: string
          filters?: Json
          frequency?: string
          id?: string
          last_alert_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean
          created_at?: string
          filters?: Json
          frequency?: string
          id?: string
          last_alert_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_delivery_log: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          masked_recipient: string
          provider_message_id: string | null
          purpose: string
          success: boolean
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          masked_recipient: string
          provider_message_id?: string | null
          purpose: string
          success: boolean
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          masked_recipient?: string
          provider_message_id?: string | null
          purpose?: string
          success?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string
          expiry_notified_at: string | null
          id: string
          plan: string
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          expiry_notified_at?: string | null
          id?: string
          plan?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          expiry_notified_at?: string | null
          id?: string
          plan?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_faqs: {
        Row: {
          answer: string
          answer_sw: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          question: string
          question_sw: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          answer_sw?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          question: string
          question_sw?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          answer_sw?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          question?: string
          question_sw?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_path: string | null
          body: string
          created_at: string
          id: string
          internal: boolean
          is_staff: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          created_at?: string
          id?: string
          internal?: boolean
          is_staff?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          created_at?: string
          id?: string
          internal?: boolean
          is_staff?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          category: string
          closed_at: string | null
          created_at: string
          deal_id: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          last_message_at: string
          lead_id: string | null
          priority: Database["public"]["Enums"]["support_priority"]
          property_id: string | null
          reference: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_message_at?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["support_priority"]
          property_id?: string | null
          reference?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          deal_id?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_message_at?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["support_priority"]
          property_id?: string | null
          reference?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          emergency_name: string | null
          emergency_phone: string | null
          full_name: string
          id: string
          id_document_ref: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          property_id: string
          status: string
          unit_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          full_name: string
          id?: string
          id_document_ref?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          property_id: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          full_name?: string
          id?: string
          id_document_ref?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          property_id?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          internal: boolean
          reason: string | null
          request_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          internal?: boolean
          reason?: string | null
          request_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          internal?: boolean
          reason?: string | null
          request_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string
          details: Json
          documents: Json
          expires_at: string | null
          id: string
          notes: string | null
          property_id: string | null
          requester_id: string
          review_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json
          documents?: Json
          expires_at?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          requester_id: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json
          documents?: Json
          expires_at?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          requester_id?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_listing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_listing_pages: {
        Row: {
          address: string | null
          amenities: string[] | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          district: string | null
          featured: boolean | null
          floor: number | null
          id: string | null
          landmark: string | null
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"] | null
          longitude: number | null
          negotiable: boolean | null
          owner_id: string | null
          parking: number | null
          parking_available: boolean | null
          price: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          region: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          street: string | null
          title: string | null
          updated_at: string | null
          verification_status: string | null
          verified: boolean | null
          view_count: number | null
          ward: string | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          district?: string | null
          featured?: boolean | null
          floor?: number | null
          id?: string | null
          landmark?: string | null
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"] | null
          longitude?: number | null
          negotiable?: boolean | null
          owner_id?: string | null
          parking?: number | null
          parking_available?: boolean | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          region?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          street?: string | null
          title?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified?: boolean | null
          view_count?: number | null
          ward?: string | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          district?: string | null
          featured?: boolean | null
          floor?: number | null
          id?: string | null
          landmark?: string | null
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"] | null
          longitude?: number | null
          negotiable?: boolean | null
          owner_id?: string | null
          parking?: number | null
          parking_available?: boolean | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          region?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          street?: string | null
          title?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified?: boolean | null
          view_count?: number | null
          ward?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          agency_name: string | null
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          location: string | null
          verified_agent: boolean | null
          verified_business: boolean | null
          verified_identity: boolean | null
          verified_owner: boolean | null
        }
        Relationships: []
      }
      public_properties: {
        Row: {
          address: string | null
          amenities: string[] | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          district: string | null
          featured: boolean | null
          floor: number | null
          id: string | null
          landmark: string | null
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"] | null
          longitude: number | null
          negotiable: boolean | null
          owner_id: string | null
          parking: number | null
          parking_available: boolean | null
          price: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          region: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          street: string | null
          title: string | null
          updated_at: string | null
          verified: boolean | null
          view_count: number | null
          ward: string | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          district?: string | null
          featured?: boolean | null
          floor?: number | null
          id?: string | null
          landmark?: string | null
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"] | null
          longitude?: number | null
          negotiable?: boolean | null
          owner_id?: string | null
          parking?: number | null
          parking_available?: boolean | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          region?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          street?: string | null
          title?: string | null
          updated_at?: string | null
          verified?: boolean | null
          view_count?: number | null
          ward?: string | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          district?: string | null
          featured?: boolean | null
          floor?: number | null
          id?: string | null
          landmark?: string | null
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"] | null
          longitude?: number | null
          negotiable?: boolean | null
          owner_id?: string | null
          parking?: number | null
          parking_available?: boolean | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          region?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          street?: string | null
          title?: string | null
          updated_at?: string | null
          verified?: boolean | null
          view_count?: number | null
          ward?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_analytics: { Args: { _from: string; _to: string }; Returns: Json }
      admin_deal_summary: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      admin_finance_summary: { Args: never; Returns: Json }
      admin_refund_action: {
        Args: { _action: string; _note?: string; _payment_id: string }
        Returns: undefined
      }
      admin_search_deals: {
        Args: {
          _agent: string
          _avail: string
          _buyer: string
          _from: string
          _owner: string
          _pay: string
          _ptype: string
          _region: string
          _stage: string
          _to: string
          _ttype: string
        }
        Returns: {
          agent_commission: number
          agent_id: string
          agent_name: string
          agreed_price: number
          availability: string
          buyer_id: string
          buyer_name: string
          created_at: string
          district: string
          estimated_spaces_fee: number
          id: string
          owner_id: string
          owner_name: string
          payment_status: string
          property_title: string
          property_type: string
          reference: string
          region: string
          stage: string
          transaction_type: string
          value: number
        }[]
      }
      admin_set_payment_status: {
        Args: { _payment_id: string; _status: string }
        Returns: undefined
      }
      advance_deal: { Args: { _deal_id: string }; Returns: string }
      agency_overview: { Args: { _agency: string }; Returns: Json }
      agent_permission_for: {
        Args: { _agent_id: string; _property_id: string }
        Returns: Database["public"]["Enums"]["agent_permission"]
      }
      archive_property: {
        Args: { _property_id: string; _reason?: string }
        Returns: Json
      }
      calc_deal_fees: { Args: { _deal_id: string }; Returns: Json }
      can_manage_property: { Args: { _property_id: string }; Returns: boolean }
      check_my_subscription_expiry: { Args: never; Returns: undefined }
      confirm_deal_completion: { Args: { _deal_id: string }; Returns: string }
      crm_lead_status_for_stage: {
        Args: { _stage: Database["public"]["Enums"]["deal_stage"] }
        Returns: string
      }
      crm_rank: { Args: { _status: string }; Returns: number }
      crm_stage_for_lead_status: {
        Args: { _status: string }
        Returns: Database["public"]["Enums"]["deal_stage"]
      }
      end_property_manager: {
        Args: { _assignment_id: string; _reason?: string }
        Returns: undefined
      }
      expire_offers: { Args: never; Returns: number }
      get_conversation_peers: {
        Args: never
        Returns: {
          agency_name: string
          avatar_url: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          verified: boolean
        }[]
      }
      get_property_contact: {
        Args: { _property_id: string }
        Returns: {
          contact_name: string
          contact_phone: string
          contact_whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_agency_member: {
        Args: { _agency: string; _email: string }
        Returns: string
      }
      invite_property_manager: {
        Args: {
          _manager_id: string
          _permission?: string
          _property_id: string
          _scopes?: Json
        }
        Returns: string
      }
      is_active_manager: {
        Args: { _need_manage?: boolean; _property_id: string }
        Returns: boolean
      }
      is_blocked_with: { Args: { _other: string }; Returns: boolean }
      is_my_tenancy: { Args: { _tenant_id: string }; Returns: boolean }
      log_management_action: {
        Args: {
          _action: string
          _meta: Json
          _row: Database["public"]["Tables"]["property_managers"]["Row"]
        }
        Returns: undefined
      }
      moderate_review: {
        Args: { _reason?: string; _review_id: string; _status: string }
        Returns: undefined
      }
      my_account_status: {
        Args: never
        Returns: {
          reason: string
          status: Database["public"]["Enums"]["account_status"]
          until: string
        }[]
      }
      my_commission_summary: { Args: never; Returns: Json }
      my_management_assignments: {
        Args: never
        Returns: {
          accepted_at: string
          ended_at: string
          id: string
          invited_at: string
          manager_id: string
          manager_name: string
          owner_id: string
          owner_name: string
          permission: string
          property_id: string
          property_title: string
          scopes: Json
          status: string
        }[]
      }
      my_monetization_summary: {
        Args: never
        Returns: {
          commission_value: number
          leads_count: number
          open_deals: number
          won_deals: number
        }[]
      }
      my_plan_usage: {
        Args: never
        Returns: {
          agent_limit: number
          cancel_at_period_end: boolean
          current_period_end: string
          listing_limit: number
          listings_used: number
          plan_id: string
          plan_name: string
          status: string
        }[]
      }
      my_review_opportunities: {
        Args: never
        Returns: {
          can_review_property: boolean
          counterpart_id: string
          counterpart_name: string
          counterpart_reviewed: boolean
          occurred_at: string
          property_id: string
          property_reviewed: boolean
          property_title: string
          source: string
          source_id: string
        }[]
      }
      notification_is_critical: { Args: { _kind: string }; Returns: boolean }
      owner_of_property: { Args: { _property_id: string }; Returns: string }
      payment_test_mode_enabled: { Args: never; Returns: boolean }
      plan_id_for_user: { Args: { _user_id: string }; Returns: string }
      property_rating: {
        Args: { _property_id: string }
        Returns: {
          average: number
          total: number
        }[]
      }
      publish_property: { Args: { _property_id: string }; Returns: Json }
      recompute_deal_health: { Args: { _deal_id: string }; Returns: undefined }
      remove_agency_member: { Args: { _member_id: string }; Returns: undefined }
      respond_agency_invite: {
        Args: { _accept: boolean; _member_id: string }
        Returns: undefined
      }
      respond_management_invite: {
        Args: { _accept: boolean; _assignment_id: string }
        Returns: undefined
      }
      respond_offer: {
        Args: {
          _action: string
          _amount?: number
          _completion?: string
          _conditions?: string
          _deposit?: number
          _message?: string
          _offer_id: string
        }
        Returns: Json
      }
      respond_to_review: {
        Args: { _response: string; _review_id: string }
        Returns: undefined
      }
      restore_property: { Args: { _property_id: string }; Returns: undefined }
      saved_search_matches: {
        Args: {
          _filters: Json
          _p: Database["public"]["Tables"]["properties"]["Row"]
        }
        Returns: boolean
      }
      search_agents: {
        Args: { _q: string }
        Returns: {
          agency_name: string
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      search_message_recipients: {
        Args: { _q: string }
        Returns: {
          agency_name: string
          avatar_url: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          verified: boolean
        }[]
      }
      search_property_managers: {
        Args: { _q: string }
        Returns: {
          agency_name: string
          avatar_url: string
          full_name: string
          id: string
          is_manager: boolean
        }[]
      }
      set_checklist_item: {
        Args: { _done: boolean; _item_id: string }
        Returns: string
      }
      set_lead_status: {
        Args: { _force?: boolean; _lead_id: string; _status: string }
        Returns: undefined
      }
      simulate_test_payment: { Args: { _deal_id: string }; Returns: number }
      submit_offer: {
        Args: {
          _amount: number
          _completion: string
          _conditions: string
          _deposit: number
          _email: string
          _expires_at: string
          _financing: string
          _name: string
          _phone: string
          _property_id: string
        }
        Returns: Json
      }
      update_manager_permission: {
        Args: { _assignment_id: string; _permission: string; _scopes?: Json }
        Returns: undefined
      }
      user_rating: {
        Args: { _user_id: string }
        Returns: {
          average: number
          total: number
        }[]
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned"
      agent_permission:
        | "view_only"
        | "manage_leads"
        | "manage_viewings"
        | "edit_listing"
        | "full_management"
      app_role:
        | "buyer"
        | "owner"
        | "agent"
        | "admin"
        | "super_admin"
        | "property_manager"
      deal_activity_kind:
        | "lead_created"
        | "message_sent"
        | "call_made"
        | "viewing_scheduled"
        | "viewing_completed"
        | "stage_changed"
        | "note_added"
        | "document_uploaded"
        | "agent_assigned"
        | "offer_made"
        | "offer_accepted"
        | "offer_rejected"
        | "follow_up_scheduled"
        | "deal_completed"
        | "deal_cancelled"
        | "reminder"
      deal_document_kind:
        | "offer_letter"
        | "lease_agreement"
        | "sale_agreement"
        | "inspection_report"
        | "ownership_document"
        | "other"
        | "proof_of_funds"
        | "financing_document"
        | "identification"
      deal_health: "healthy" | "waiting" | "at_risk" | "closed"
      deal_priority: "low" | "medium" | "high" | "urgent"
      deal_stage:
        | "new_inquiry"
        | "contacted"
        | "viewing_scheduled"
        | "viewing_completed"
        | "negotiation"
        | "offer_made"
        | "offer_accepted"
        | "agreement_signed"
        | "completed"
        | "cancelled"
        | "verification"
        | "payment"
      listing_type: "rent" | "sale"
      media_type: "image" | "video"
      property_status:
        | "draft"
        | "live"
        | "archived"
        | "pending"
        | "paused"
        | "sold"
        | "rented"
        | "rejected"
      property_type:
        | "house"
        | "apartment"
        | "office"
        | "shop"
        | "warehouse"
        | "land"
        | "commercial"
      report_priority: "normal" | "high" | "urgent"
      report_status:
        | "new"
        | "under_review"
        | "more_info"
        | "resolved"
        | "dismissed"
      report_target_type: "property" | "user" | "message"
      review_status: "pending" | "published" | "flagged" | "removed"
      review_subject_type: "property" | "user"
      support_priority: "normal" | "high" | "urgent"
      support_status:
        | "open"
        | "in_progress"
        | "waiting_user"
        | "resolved"
        | "closed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "suspended", "banned"],
      agent_permission: [
        "view_only",
        "manage_leads",
        "manage_viewings",
        "edit_listing",
        "full_management",
      ],
      app_role: [
        "buyer",
        "owner",
        "agent",
        "admin",
        "super_admin",
        "property_manager",
      ],
      deal_activity_kind: [
        "lead_created",
        "message_sent",
        "call_made",
        "viewing_scheduled",
        "viewing_completed",
        "stage_changed",
        "note_added",
        "document_uploaded",
        "agent_assigned",
        "offer_made",
        "offer_accepted",
        "offer_rejected",
        "follow_up_scheduled",
        "deal_completed",
        "deal_cancelled",
        "reminder",
      ],
      deal_document_kind: [
        "offer_letter",
        "lease_agreement",
        "sale_agreement",
        "inspection_report",
        "ownership_document",
        "other",
        "proof_of_funds",
        "financing_document",
        "identification",
      ],
      deal_health: ["healthy", "waiting", "at_risk", "closed"],
      deal_priority: ["low", "medium", "high", "urgent"],
      deal_stage: [
        "new_inquiry",
        "contacted",
        "viewing_scheduled",
        "viewing_completed",
        "negotiation",
        "offer_made",
        "offer_accepted",
        "agreement_signed",
        "completed",
        "cancelled",
        "verification",
        "payment",
      ],
      listing_type: ["rent", "sale"],
      media_type: ["image", "video"],
      property_status: [
        "draft",
        "live",
        "archived",
        "pending",
        "paused",
        "sold",
        "rented",
        "rejected",
      ],
      property_type: [
        "house",
        "apartment",
        "office",
        "shop",
        "warehouse",
        "land",
        "commercial",
      ],
      report_priority: ["normal", "high", "urgent"],
      report_status: [
        "new",
        "under_review",
        "more_info",
        "resolved",
        "dismissed",
      ],
      report_target_type: ["property", "user", "message"],
      review_status: ["pending", "published", "flagged", "removed"],
      review_subject_type: ["property", "user"],
      support_priority: ["normal", "high", "urgent"],
      support_status: [
        "open",
        "in_progress",
        "waiting_user",
        "resolved",
        "closed",
      ],
    },
  },
} as const
