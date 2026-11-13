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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      courses: {
        Row: {
          cover_path: string | null
          cover_url: string | null
          created_at: string
          description: string
          id: string
          is_published: boolean
          owner_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          owner_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          owner_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_role_grants: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string
          grade: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          grade?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          grade?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teacher_profile: {
        Row: {
          bio: string
          display_name: string
          id: number
          photo_url: string | null
          tagline: string
          updated_at: string
        }
        Insert: {
          bio?: string
          display_name?: string
          id?: number
          photo_url?: string | null
          tagline?: string
          updated_at?: string
        }
        Update: {
          bio?: string
          display_name?: string
          id?: number
          photo_url?: string | null
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          rating: number
          reviewer_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          rating: number
          reviewer_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          reviewer_name?: string
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
      video_ai_state: {
        Row: {
          blocked: boolean
          id: boolean
          reason: string | null
        }
        Insert: {
          blocked?: boolean
          id?: boolean
          reason?: string | null
        }
        Update: {
          blocked?: boolean
          id?: boolean
          reason?: string | null
        }
        Relationships: []
      }
      video_caption_chunks: {
        Row: {
          audio_hash: string
          text: string
          video_id: string
        }
        Insert: {
          audio_hash: string
          text: string
          video_id: string
        }
        Update: {
          audio_hash?: string
          text?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_caption_chunks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_secrets: {
        Row: {
          password_hash: string
          password_plain: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          password_hash: string
          password_plain?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          password_hash?: string
          password_plain?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_secrets_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          captions_kind: string | null
          captions_vtt: string | null
          course_id: string
          created_at: string
          description: string
          duration_seconds: number | null
          has_password: boolean
          id: string
          mime_type: string | null
          owner_id: string
          published_at: string | null
          quality_paths: Json
          size_bytes: number | null
          status: Database["public"]["Enums"]["video_status"]
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_path: string | null
        }
        Insert: {
          captions_kind?: string | null
          captions_vtt?: string | null
          course_id: string
          created_at?: string
          description?: string
          duration_seconds?: number | null
          has_password?: boolean
          id?: string
          mime_type?: string | null
          owner_id: string
          published_at?: string | null
          quality_paths?: Json
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          captions_kind?: string | null
          captions_vtt?: string | null
          course_id?: string
          created_at?: string
          description?: string
          duration_seconds?: number | null
          has_password?: boolean
          id?: string
          mime_type?: string | null
          owner_id?: string
          published_at?: string | null
          quality_paths?: Json
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_teacher_role: {
        Args: { _grant: boolean; _user_id: string }
        Returns: undefined
      }
      check_video_password: {
        Args: { _password: string; _video_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      set_video_password: {
        Args: { _password: string; _video_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      video_status: "uploading" | "draft" | "published" | "failed"
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
      app_role: ["admin", "teacher", "student"],
      video_status: ["uploading", "draft", "published", "failed"],
    },
  },
} as const
