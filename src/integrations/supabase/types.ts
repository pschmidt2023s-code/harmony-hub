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
      favorites: {
        Row: {
          created_at: string
          id: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          song_id?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          consent_at: string | null
          created_at: string
          email: string
          id: string
          source: string | null
          status: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          consent_at?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          consent_at?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string
          fulfillment_status: string
          id: string
          items: Json
          paypal_order_id: string | null
          shipping: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          email: string
          fulfillment_status?: string
          id?: string
          items?: Json
          paypal_order_id?: string | null
          shipping?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string
          fulfillment_status?: string
          id?: string
          items?: Json
          paypal_order_id?: string | null
          shipping?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      play_history: {
        Row: {
          created_at: string
          id: string
          played_at: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          played_at?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          played_at?: string
          song_id?: string
          user_id?: string
        }
        Relationships: []
      }
      playback_positions: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          position_seconds: number
          song_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          position_seconds?: number
          song_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          position_seconds?: number
          song_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          available: boolean
          created_at: string
          digital_asset_url: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          product_id: string
          sale_price: number | null
          sku: string | null
          sort_order: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          digital_asset_url?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          product_id: string
          sale_price?: number | null
          sku?: string | null
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          digital_asset_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          product_id?: string
          sale_price?: number | null
          sku?: string | null
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          base_price: number
          created_at: string
          currency: string
          description: string
          digital_asset_url: string | null
          id: string
          image_url: string | null
          is_digital: boolean
          name: string
          release_id: string | null
          sale_price: number | null
          seo_description: string
          seo_title: string
          short_description: string
          slug: string
          song_id: string | null
          sort_order: number
          status: string
          stock: number | null
          type: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          badge?: string | null
          base_price?: number
          created_at?: string
          currency?: string
          description?: string
          digital_asset_url?: string | null
          id: string
          image_url?: string | null
          is_digital?: boolean
          name: string
          release_id?: string | null
          sale_price?: number | null
          seo_description?: string
          seo_title?: string
          short_description?: string
          slug: string
          song_id?: string | null
          sort_order?: number
          status?: string
          stock?: number | null
          type?: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          badge?: string | null
          base_price?: number
          created_at?: string
          currency?: string
          description?: string
          digital_asset_url?: string | null
          id?: string
          image_url?: string | null
          is_digital?: boolean
          name?: string
          release_id?: string | null
          sale_price?: number | null
          seo_description?: string
          seo_title?: string
          short_description?: string
          slug?: string
          song_id?: string | null
          sort_order?: number
          status?: string
          stock?: number | null
          type?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          notify_account: boolean
          notify_new_releases: boolean
          notify_release_reminders: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          notify_account?: boolean
          notify_new_releases?: boolean
          notify_release_reminders?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          notify_account?: boolean
          notify_new_releases?: boolean
          notify_release_reminders?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      release_notifications: {
        Row: {
          created_at: string
          id: string
          release_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          release_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          release_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_notifications_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          artist: string
          cover_key: string
          cover_url: string | null
          created_at: string
          credits: Json
          description: string
          explicit: boolean
          id: string
          links: Json
          publish_at: string | null
          release_date: string
          seo_description: string
          seo_title: string
          short_description: string
          slug: string | null
          status: string
          title: string
          tracks: number
          type: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          artist?: string
          cover_key: string
          cover_url?: string | null
          created_at?: string
          credits?: Json
          description?: string
          explicit?: boolean
          id: string
          links?: Json
          publish_at?: string | null
          release_date: string
          seo_description?: string
          seo_title?: string
          short_description?: string
          slug?: string | null
          status: string
          title: string
          tracks?: number
          type: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          artist?: string
          cover_key?: string
          cover_url?: string | null
          created_at?: string
          credits?: Json
          description?: string
          explicit?: boolean
          id?: string
          links?: Json
          publish_at?: string | null
          release_date?: string
          seo_description?: string
          seo_title?: string
          short_description?: string
          slug?: string | null
          status?: string
          title?: string
          tracks?: number
          type?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_mode: string
          artist_name: string
          canonical_base_url: string
          created_at: string
          default_locale: string
          default_og_image: string
          favicon_url: string
          id: number
          logo_url: string
          manual_accent: string
          site_description: string
          site_name: string
          site_title: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          accent_mode?: string
          artist_name?: string
          canonical_base_url?: string
          created_at?: string
          default_locale?: string
          default_og_image?: string
          favicon_url?: string
          id?: number
          logo_url?: string
          manual_accent?: string
          site_description?: string
          site_name?: string
          site_title?: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          accent_mode?: string
          artist_name?: string
          canonical_base_url?: string
          created_at?: string
          default_locale?: string
          default_og_image?: string
          favicon_url?: string
          id?: number
          logo_url?: string
          manual_accent?: string
          site_description?: string
          site_name?: string
          site_title?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          access_level: string
          album: string
          artist: string
          audio_url: string | null
          bpm: number
          cover_key: string
          cover_url: string | null
          created_at: string
          credits: Json
          description: string
          duration: number
          explicit: boolean
          genre: string
          id: string
          isrc: string
          language: string
          links: Json
          lyrics: Json
          mood: string
          producer: string
          release_id: string | null
          slug: string | null
          song_key: string
          songwriter: string
          sort_order: number
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          album: string
          artist?: string
          audio_url?: string | null
          bpm: number
          cover_key: string
          cover_url?: string | null
          created_at?: string
          credits?: Json
          description?: string
          duration: number
          explicit?: boolean
          genre: string
          id: string
          isrc: string
          language?: string
          links?: Json
          lyrics?: Json
          mood: string
          producer: string
          release_id?: string | null
          slug?: string | null
          song_key: string
          songwriter: string
          sort_order?: number
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          album?: string
          artist?: string
          audio_url?: string | null
          bpm?: number
          cover_key?: string
          cover_url?: string | null
          created_at?: string
          credits?: Json
          description?: string
          duration?: number
          explicit?: boolean
          genre?: string
          id?: string
          isrc?: string
          language?: string
          links?: Json
          lyrics?: Json
          mood?: string
          producer?: string
          release_id?: string | null
          slug?: string | null
          song_key?: string
          songwriter?: string
          sort_order?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
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
      videos: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          publish_at: string | null
          release_id: string | null
          seo_description: string
          seo_title: string
          slug: string | null
          song: string
          song_id: string | null
          sort_order: number
          source: string
          status: string
          thumb_key: string
          thumb_url: string | null
          title: string
          updated_at: string
          video_date: string
          video_url: string | null
          views: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          id: string
          publish_at?: string | null
          release_id?: string | null
          seo_description?: string
          seo_title?: string
          slug?: string | null
          song?: string
          song_id?: string | null
          sort_order?: number
          source?: string
          status?: string
          thumb_key: string
          thumb_url?: string | null
          title: string
          updated_at?: string
          video_date: string
          video_url?: string | null
          views?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          publish_at?: string | null
          release_id?: string | null
          seo_description?: string
          seo_title?: string
          slug?: string | null
          song?: string
          song_id?: string | null
          sort_order?: number
          source?: string
          status?: string
          thumb_key?: string
          thumb_url?: string | null
          title?: string
          updated_at?: string
          video_date?: string
          video_url?: string | null
          views?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_fans: {
        Args: {
          _filter?: string
          _limit?: number
          _offset?: number
          _search?: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          favorites_count: number
          id: string
          is_admin: boolean
          last_order_at: string
          last_sign_in_at: string
          newsletter_consent_at: string
          newsletter_source: string
          newsletter_status: string
          order_count: number
          order_total: number
          registered_at: string
          total_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "fan"
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
      app_role: ["admin", "fan"],
    },
  },
} as const
