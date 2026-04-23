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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          site_id: string | null
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          site_id?: string | null
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          site_id?: string | null
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          expense_date: string
          id: string
          label: string
          notes: string | null
          product_id: string | null
          site_id: string
          supplier_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          expense_date?: string
          id?: string
          label: string
          notes?: string | null
          product_id?: string | null
          site_id: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          expense_date?: string
          id?: string
          label?: string
          notes?: string | null
          product_id?: string | null
          site_id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          position: number | null
          product_id: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position?: number | null
          product_id: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number | null
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_seasons: {
        Row: {
          end_month: number
          id: string
          price: number
          price_child: number
          product_id: string
          season: Database["public"]["Enums"]["season_type"]
          start_month: number
        }
        Insert: {
          end_month: number
          id?: string
          price: number
          price_child?: number
          product_id: string
          season: Database["public"]["Enums"]["season_type"]
          start_month: number
        }
        Update: {
          end_month?: number
          id?: string
          price?: number
          price_child?: number
          product_id?: string
          season?: Database["public"]["Enums"]["season_type"]
          start_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_seasons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string
          description: string | null
          id: string
          image: string | null
          max_capacity: number | null
          name: string
          parcours: string | null
          price: number
          price_child: number
          site_id: string
          stock: number | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          max_capacity?: number | null
          name: string
          parcours?: string | null
          price?: number
          price_child?: number
          site_id: string
          stock?: number | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          max_capacity?: number | null
          name?: string
          parcours?: string | null
          price?: number
          price_child?: number
          site_id?: string
          stock?: number | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          adults: number | null
          children: number | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          end_date: string
          history: Json | null
          id: string
          linked_product_id: string | null
          notes: string | null
          persons: number
          product_id: string
          start_date: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
        }
        Insert: {
          adults?: number | null
          children?: number | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          end_date: string
          history?: Json | null
          id?: string
          linked_product_id?: string | null
          notes?: string | null
          persons?: number
          product_id: string
          start_date: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Update: {
          adults?: number | null
          children?: number | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          end_date?: string
          history?: Json | null
          id?: string
          linked_product_id?: string | null
          notes?: string | null
          persons?: number
          product_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          site_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          site_id?: string | null
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          site_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          id: string
          location: string
          name: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location: string
          name: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          name?: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: []
      }
      supplier_prices: {
        Row: {
          cost_price: number
          id: string
          product_id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          cost_price: number
          id?: string
          product_id: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          cost_price?: number
          id?: string
          product_id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          site_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      product_type: "chambre" | "excursion" | "service"
      reservation_status: "confirmed" | "pending" | "cancelled" | "maintenance"
      season_type: "base" | "moyenne" | "haute" | "tres_haute"
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
      product_type: ["chambre", "excursion", "service"],
      reservation_status: ["confirmed", "pending", "cancelled", "maintenance"],
      season_type: ["base", "moyenne", "haute", "tres_haute"],
    },
  },
} as const
