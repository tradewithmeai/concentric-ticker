export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      audio_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          sound_type: string
          updated_at: string | null
          user_id: string | null
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          sound_type?: string
          updated_at?: string | null
          user_id?: string | null
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          sound_type?: string
          updated_at?: string | null
          user_id?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_order: number
          sender: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_order: number
          sender: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_order?: number
          sender?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          message_count: number | null
          topic: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          topic: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      debate_judgments: {
        Row: {
          agent_a_evidence: number
          agent_a_logic: number
          agent_a_style: number
          agent_a_total: number
          agent_b_evidence: number
          agent_b_logic: number
          agent_b_style: number
          agent_b_total: number
          created_at: string
          id: string
          judge_reasoning: string | null
          session_id: string
          winner: string
        }
        Insert: {
          agent_a_evidence: number
          agent_a_logic: number
          agent_a_style: number
          agent_a_total: number
          agent_b_evidence: number
          agent_b_logic: number
          agent_b_style: number
          agent_b_total: number
          created_at?: string
          id?: string
          judge_reasoning?: string | null
          session_id: string
          winner: string
        }
        Update: {
          agent_a_evidence?: number
          agent_a_logic?: number
          agent_a_style?: number
          agent_a_total?: number
          agent_b_evidence?: number
          agent_b_logic?: number
          agent_b_style?: number
          agent_b_total?: number
          created_at?: string
          id?: string
          judge_reasoning?: string | null
          session_id?: string
          winner?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_debate_judgments_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "debate_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_rounds: {
        Row: {
          agent: string
          content: string
          created_at: string
          id: string
          phase: string
          reflection_plan: string | null
          round_number: number
          session_id: string
        }
        Insert: {
          agent: string
          content: string
          created_at?: string
          id?: string
          phase?: string
          reflection_plan?: string | null
          round_number: number
          session_id: string
        }
        Update: {
          agent?: string
          content?: string
          created_at?: string
          id?: string
          phase?: string
          reflection_plan?: string | null
          round_number?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_debate_rounds_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "debate_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_sessions: {
        Row: {
          created_at: string
          id: string
          provider_a: string
          provider_b: string
          reflection_enabled: boolean
          rounds: number
          status: string
          token_cap: number
          topic: string
          updated_at: string
          user_id: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          provider_a?: string
          provider_b?: string
          reflection_enabled?: boolean
          rounds?: number
          status?: string
          token_cap?: number
          topic: string
          updated_at?: string
          user_id: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          provider_a?: string
          provider_b?: string
          reflection_enabled?: boolean
          rounds?: number
          status?: string
          token_cap?: number
          topic?: string
          updated_at?: string
          user_id?: string
          winner?: string | null
        }
        Relationships: []
      }
      llm_api_usage: {
        Row: {
          cost_cents: number | null
          created_at: string
          id: string
          model: string
          provider: string
          session_id: string | null
          tokens_used: number | null
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string
          id?: string
          model: string
          provider: string
          session_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          cost_cents?: number | null
          created_at?: string
          id?: string
          model?: string
          provider?: string
          session_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_api_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          alert_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "price_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_push_enabled: boolean | null
          created_at: string | null
          discord_enabled: boolean | null
          discord_webhook_url: string | null
          email_enabled: boolean | null
          id: string
          telegram_chat_id: string | null
          telegram_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          browser_push_enabled?: boolean | null
          created_at?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          id?: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          browser_push_enabled?: boolean | null
          created_at?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          id?: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          alert_type: string
          auto_trigger: boolean | null
          created_at: string | null
          id: string
          is_above: boolean | null
          percentage_threshold: number | null
          symbol: string
          target_price: number
          trail_direction: string | null
          trail_high_watermark: number | null
          trail_low_watermark: number | null
          trail_percentage: number | null
          trail_trigger_price: number | null
          triggered: boolean | null
          triggered_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_type?: string
          auto_trigger?: boolean | null
          created_at?: string | null
          id?: string
          is_above?: boolean | null
          percentage_threshold?: number | null
          symbol: string
          target_price: number
          trail_direction?: string | null
          trail_high_watermark?: number | null
          trail_low_watermark?: number | null
          trail_percentage?: number | null
          trail_trigger_price?: number | null
          triggered?: boolean | null
          triggered_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          auto_trigger?: boolean | null
          created_at?: string | null
          id?: string
          is_above?: boolean | null
          percentage_threshold?: number | null
          symbol?: string
          target_price?: number
          trail_direction?: string | null
          trail_high_watermark?: number | null
          trail_low_watermark?: number | null
          trail_percentage?: number | null
          trail_trigger_price?: number | null
          triggered?: boolean | null
          triggered_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
