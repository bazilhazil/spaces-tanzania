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
          created_at: string
          currency: string
          features: Json
          id: string
          listing_limit: number | null
          name: string
          price_annual: number
          price_monthly: number
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          agent_limit?: number | null
          badge?: string | null
          created_at?: string
          currency?: string
          features?: Json
          id: string
          listing_limit?: number | null
          name: string
          price_annual?: number
          price_monthly?: number
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          agent_limit?: number | null
          badge?: string | null
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          listing_limit?: number | null
          name?: string
          price_annual?: number
          price_monthly?: number
          sort_order?: number
          tagline?: string
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
      deal_documents: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          kind: Database["public"]["Enums"]["deal_document_kind"]
          mime_type: string | null
          name: string
          size: number | null
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
          size?: number | null
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
          size?: number | null
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
        ]
      }
      deals: {
        Row: {
          agent_id: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          cancel_reason: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          currency: string
          expected_close_at: string | null
          health: Database["public"]["Enums"]["deal_health"]
          id: string
          kanban_position: number
          last_activity_at: string
          lead_id: string | null
          next_follow_up_at: string | null
          notes: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["deal_priority"]
          property_id: string | null
          reference: string
          stage: Database["public"]["Enums"]["deal_stage"]
          updated_at: string
          value: number | null
        }
        Insert: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          expected_close_at?: string | null
          health?: Database["public"]["Enums"]["deal_health"]
          id?: string
          kanban_position?: number
          last_activity_at?: string
          lead_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          property_id?: string | null
          reference?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          expected_close_at?: string | null
          health?: Database["public"]["Enums"]["deal_health"]
          id?: string
          kanban_position?: number
          last_activity_at?: string
          lead_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"]
          property_id?: string | null
          reference?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
          id: string
          last_activity_at: string
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
          id?: string
          last_activity_at?: string
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
          id?: string
          last_activity_at?: string
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
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
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          plan_id: string | null
          provider: string
          purpose: string
          reference: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          plan_id?: string | null
          provider: string
          purpose?: string
          reference?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          plan_id?: string | null
          provider?: string
          purpose?: string
          reference?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          created_at: string
          currency: string
          description: string
          duration_days: number
          id: string
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string
          duration_days?: number
          id: string
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string
          duration_days?: number
          id?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[]
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          currency: string
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
          verified: boolean
          view_count: number
          ward: string | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
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
          verified?: boolean
          view_count?: number
          ward?: string | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          amenities?: string[]
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string
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
      admin_set_payment_status: {
        Args: { _payment_id: string; _status: string }
        Returns: undefined
      }
      agent_permission_for: {
        Args: { _agent_id: string; _property_id: string }
        Returns: Database["public"]["Enums"]["agent_permission"]
      }
      check_my_subscription_expiry: { Args: never; Returns: undefined }
      crm_lead_status_for_stage: {
        Args: { _stage: Database["public"]["Enums"]["deal_stage"] }
        Returns: string
      }
      crm_rank: { Args: { _status: string }; Returns: number }
      crm_stage_for_lead_status: {
        Args: { _status: string }
        Returns: Database["public"]["Enums"]["deal_stage"]
      }
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
      is_blocked_with: { Args: { _other: string }; Returns: boolean }
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
      plan_id_for_user: { Args: { _user_id: string }; Returns: string }
      property_rating: {
        Args: { _property_id: string }
        Returns: {
          average: number
          total: number
        }[]
      }
      recompute_deal_health: { Args: { _deal_id: string }; Returns: undefined }
      respond_to_review: {
        Args: { _response: string; _review_id: string }
        Returns: undefined
      }
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
      set_lead_status: {
        Args: { _force?: boolean; _lead_id: string; _status: string }
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
      app_role: "buyer" | "owner" | "agent" | "admin" | "super_admin"
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
      account_status: ["active", "suspended", "banned"],
      agent_permission: [
        "view_only",
        "manage_leads",
        "manage_viewings",
        "edit_listing",
        "full_management",
      ],
      app_role: ["buyer", "owner", "agent", "admin", "super_admin"],
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
    },
  },
} as const
