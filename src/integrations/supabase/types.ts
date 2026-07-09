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
      bookings: {
        Row: {
          buyer_id: string
          contact_phone: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          owner_id: string
          property_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          owner_id: string
          property_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          owner_id?: string
          property_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          conversation_id: string | null
          created_at: string
          currency: string
          expected_close_at: string | null
          health: Database["public"]["Enums"]["deal_health"]
          id: string
          kanban_position: number
          last_activity_at: string
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
          conversation_id?: string | null
          created_at?: string
          currency?: string
          expected_close_at?: string | null
          health?: Database["public"]["Enums"]["deal_health"]
          id?: string
          kanban_position?: number
          last_activity_at?: string
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
          conversation_id?: string | null
          created_at?: string
          currency?: string
          expected_close_at?: string | null
          health?: Database["public"]["Enums"]["deal_health"]
          id?: string
          kanban_position?: number
          last_activity_at?: string
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
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          created_at: string
          currency: string
          id: string
          metadata: Json
          provider: string
          reference: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          provider: string
          reference?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          provider?: string
          reference?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          currency: string
          description: string | null
          district: string | null
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
          status: Database["public"]["Enums"]["property_status"]
          street: string | null
          title: string
          updated_at: string
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
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          district?: string | null
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
          status?: Database["public"]["Enums"]["property_status"]
          street?: string | null
          title: string
          updated_at?: string
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
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          district?: string | null
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
          status?: Database["public"]["Enums"]["property_status"]
          street?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          ward?: string | null
          year_built?: number | null
        }
        Relationships: []
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
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          plan: string
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
          id?: string
          plan?: string
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
          id?: string
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
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
      verification_requests: {
        Row: {
          created_at: string
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
        ]
      }
    }
    Views: {
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
        }
        Insert: {
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
        }
        Update: {
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_deal_health: { Args: { _deal_id: string }; Returns: undefined }
    }
    Enums: {
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
      property_type:
        | "house"
        | "apartment"
        | "office"
        | "shop"
        | "warehouse"
        | "land"
        | "commercial"
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
    },
  },
} as const
