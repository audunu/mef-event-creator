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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_sponsors: {
        Row: {
          created_at: string
          display_order: number | null
          event_id: string
          id: string
          logo_url: string
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          event_id: string
          id?: string
          logo_url: string
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          event_id?: string
          id?: string
          logo_url?: string
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string | null
          enable_exhibitors: boolean | null
          enable_info: boolean | null
          enable_map: boolean | null
          enable_participants: boolean | null
          enable_program: boolean | null
          end_date: string | null
          google_sheets_url: string | null
          hero_image_url: string | null
          id: string
          last_synced_at: string | null
          location: string | null
          name: string
          published: boolean | null
          slug: string
          sponsors_module_enabled: boolean | null
          sponsors_module_title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          enable_exhibitors?: boolean | null
          enable_info?: boolean | null
          enable_map?: boolean | null
          enable_participants?: boolean | null
          enable_program?: boolean | null
          end_date?: string | null
          google_sheets_url?: string | null
          hero_image_url?: string | null
          id?: string
          last_synced_at?: string | null
          location?: string | null
          name: string
          published?: boolean | null
          slug: string
          sponsors_module_enabled?: boolean | null
          sponsors_module_title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          enable_exhibitors?: boolean | null
          enable_info?: boolean | null
          enable_map?: boolean | null
          enable_participants?: boolean | null
          enable_program?: boolean | null
          end_date?: string | null
          google_sheets_url?: string | null
          hero_image_url?: string | null
          id?: string
          last_synced_at?: string | null
          location?: string | null
          name?: string
          published?: boolean | null
          slug?: string
          sponsors_module_enabled?: boolean | null
          sponsors_module_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exhibitors: {
        Row: {
          company_name: string
          created_at: string | null
          event_id: string
          external_id: string | null
          id: string
          stand_number: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          event_id: string
          external_id?: string | null
          id?: string
          stand_number?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          event_id?: string
          external_id?: string | null
          id?: string
          stand_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      info_sections: {
        Row: {
          content: string | null
          created_at: string | null
          event_id: string
          id: string
          image_url: string | null
          order_index: number | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "info_sections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          category: string | null
          company: string | null
          created_at: string | null
          event_id: string
          external_id: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          company?: string | null
          created_at?: string | null
          event_id: string
          external_id?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          company?: string | null
          created_at?: string | null
          event_id?: string
          external_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      program_items: {
        Row: {
          category: string | null
          created_at: string | null
          day: string
          description: string | null
          end_time: string | null
          event_id: string
          external_id: string | null
          id: string
          image_url: string | null
          image_url_2: string | null
          location: string | null
          location_url: string | null
          start_time: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          day: string
          description?: string | null
          end_time?: string | null
          event_id: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          image_url_2?: string | null
          location?: string | null
          location_url?: string | null
          start_time: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          day?: string
          description?: string | null
          end_time?: string | null
          event_id?: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          image_url_2?: string | null
          location?: string | null
          location_url?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "regional_admin"
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
      app_role: ["admin", "user", "super_admin", "regional_admin"],
    },
  },
} as const
