export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string;
          actor: string;
          created_at: string;
          detail: string | null;
          entity_id: string | null;
          entity_type: string;
          hash: string | null;
          id: string;
          payload: Json | null;
          prev_hash: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          actor: string;
          created_at?: string;
          detail?: string | null;
          entity_id?: string | null;
          entity_type: string;
          hash?: string | null;
          id?: string;
          payload?: Json | null;
          prev_hash?: string | null;
          user_id?: string;
        };
        Update: {
          action?: string;
          actor?: string;
          created_at?: string;
          detail?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          hash?: string | null;
          id?: string;
          payload?: Json | null;
          prev_hash?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      claims: {
        Row: {
          chunk_id: string | null;
          created_at: string;
          id: string;
          locator: string | null;
          source_id: string;
          text: string;
          user_id: string;
        };
        Insert: {
          chunk_id?: string | null;
          created_at?: string;
          id?: string;
          locator?: string | null;
          source_id: string;
          text: string;
          user_id?: string;
        };
        Update: {
          chunk_id?: string | null;
          created_at?: string;
          id?: string;
          locator?: string | null;
          source_id?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claims_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "source_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      demo_scenarios: {
        Row: {
          body: string;
          created_at: string;
          description: string;
          id: string;
          kind: string;
          slug: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          description: string;
          id?: string;
          kind?: string;
          slug: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          description?: string;
          id?: string;
          kind?: string;
          slug?: string;
          title?: string;
        };
        Relationships: [];
      };
      distributions: {
        Row: {
          channel: string;
          created_at: string;
          id: string;
          output_id: string;
          payload: Json | null;
          status: string;
          target: string | null;
          user_id: string;
        };
        Insert: {
          channel: string;
          created_at?: string;
          id?: string;
          output_id: string;
          payload?: Json | null;
          status?: string;
          target?: string | null;
          user_id?: string;
        };
        Update: {
          channel?: string;
          created_at?: string;
          id?: string;
          output_id?: string;
          payload?: Json | null;
          status?: string;
          target?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "distributions_output_id_fkey";
            columns: ["output_id"];
            isOneToOne: false;
            referencedRelation: "outputs";
            referencedColumns: ["id"];
          },
        ];
      };
      entities: {
        Row: {
          created_at: string;
          entity_type: string;
          id: string;
          locator: string | null;
          name: string;
          source_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_type?: string;
          id?: string;
          locator?: string | null;
          name: string;
          source_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          entity_type?: string;
          id?: string;
          locator?: string | null;
          name?: string;
          source_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entities_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      fact_conflicts: {
        Row: {
          created_at: string;
          fact_id: string | null;
          fact_label: string;
          generated_text: string;
          generated_value: string | null;
          id: string;
          locked_value: string;
          output_id: string;
          status: string;
          suggestion: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          fact_id?: string | null;
          fact_label: string;
          generated_text: string;
          generated_value?: string | null;
          id?: string;
          locked_value: string;
          output_id: string;
          status?: string;
          suggestion?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          fact_id?: string | null;
          fact_label?: string;
          generated_text?: string;
          generated_value?: string | null;
          id?: string;
          locked_value?: string;
          output_id?: string;
          status?: string;
          suggestion?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fact_conflicts_fact_id_fkey";
            columns: ["fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fact_conflicts_output_id_fkey";
            columns: ["output_id"];
            isOneToOne: false;
            referencedRelation: "outputs";
            referencedColumns: ["id"];
          },
        ];
      };
      facts: {
        Row: {
          chunk_id: string | null;
          created_at: string;
          id: string;
          is_locked: boolean;
          label: string;
          locator: string | null;
          source_id: string;
          user_id: string;
          value: string;
        };
        Insert: {
          chunk_id?: string | null;
          created_at?: string;
          id?: string;
          is_locked?: boolean;
          label: string;
          locator?: string | null;
          source_id: string;
          user_id?: string;
          value: string;
        };
        Update: {
          chunk_id?: string | null;
          created_at?: string;
          id?: string;
          is_locked?: boolean;
          label?: string;
          locator?: string | null;
          source_id?: string;
          user_id?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facts_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "source_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facts_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_requests: {
        Row: {
          audience: string;
          created_at: string;
          detail: string;
          id: string;
          instructions: string | null;
          intent_prompt: string | null;
          language: string;
          objective: string;
          output_types: string[];
          source_id: string;
          tone: string;
          understood_intent: Json | null;
          user_id: string;
        };
        Insert: {
          audience?: string;
          created_at?: string;
          detail?: string;
          id?: string;
          instructions?: string | null;
          intent_prompt?: string | null;
          language?: string;
          objective?: string;
          output_types?: string[];
          source_id: string;
          tone?: string;
          understood_intent?: Json | null;
          user_id?: string;
        };
        Update: {
          audience?: string;
          created_at?: string;
          detail?: string;
          id?: string;
          instructions?: string | null;
          intent_prompt?: string | null;
          language?: string;
          objective?: string;
          output_types?: string[];
          source_id?: string;
          tone?: string;
          understood_intent?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_requests_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          created_at: string;
          current_stage: string;
          error: string | null;
          id: string;
          source_id: string;
          stages: Json;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_stage?: string;
          error?: string | null;
          id?: string;
          source_id: string;
          stages?: Json;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          current_stage?: string;
          error?: string | null;
          id?: string;
          source_id?: string;
          stages?: Json;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      output_claims: {
        Row: {
          chunk_id: string | null;
          created_at: string;
          evidence_text: string | null;
          grounded: boolean;
          id: string;
          locator: string | null;
          match_score: number | null;
          note: string | null;
          ordinal: number;
          output_id: string;
          sentence: string;
          user_id: string;
        };
        Insert: {
          chunk_id?: string | null;
          created_at?: string;
          evidence_text?: string | null;
          grounded?: boolean;
          id?: string;
          locator?: string | null;
          match_score?: number | null;
          note?: string | null;
          ordinal?: number;
          output_id: string;
          sentence: string;
          user_id?: string;
        };
        Update: {
          chunk_id?: string | null;
          created_at?: string;
          evidence_text?: string | null;
          grounded?: boolean;
          id?: string;
          locator?: string | null;
          match_score?: number | null;
          note?: string | null;
          ordinal?: number;
          output_id?: string;
          sentence?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "output_claims_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "source_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "output_claims_output_id_fkey";
            columns: ["output_id"];
            isOneToOne: false;
            referencedRelation: "outputs";
            referencedColumns: ["id"];
          },
        ];
      };
      outputs: {
        Row: {
          audience: string;
          content: string;
          created_at: string;
          evidence_coverage: number | null;
          id: string;
          model: string | null;
          output_type: string;
          request_id: string | null;
          source_id: string;
          status: string;
          tone: string | null;
          updated_at: string;
          user_id: string;
          verification_status: string;
        };
        Insert: {
          audience: string;
          content?: string;
          created_at?: string;
          evidence_coverage?: number | null;
          id?: string;
          model?: string | null;
          output_type: string;
          request_id?: string | null;
          source_id: string;
          status?: string;
          tone?: string | null;
          updated_at?: string;
          user_id?: string;
          verification_status?: string;
        };
        Update: {
          audience?: string;
          content?: string;
          created_at?: string;
          evidence_coverage?: number | null;
          id?: string;
          model?: string | null;
          output_type?: string;
          request_id?: string | null;
          source_id?: string;
          status?: string;
          tone?: string | null;
          updated_at?: string;
          user_id?: string;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outputs_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "generation_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outputs_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          organisation: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          organisation?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          organisation?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          notes: string | null;
          output_id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          output_id: string;
          user_id?: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          output_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_output_id_fkey";
            columns: ["output_id"];
            isOneToOne: false;
            referencedRelation: "outputs";
            referencedColumns: ["id"];
          },
        ];
      };
      source_chunks: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          locator: string;
          ordinal: number;
          source_id: string;
          tsv: unknown;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          locator: string;
          ordinal: number;
          source_id: string;
          tsv?: unknown;
          user_id?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          locator?: string;
          ordinal?: number;
          source_id?: string;
          tsv?: unknown;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_chunks_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          byte_size: number;
          created_at: string;
          extraction_method: string;
          id: string;
          is_demo: boolean;
          kind: string;
          origin: string | null;
          raw_text: string;
          status: string;
          summary: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          byte_size?: number;
          created_at?: string;
          extraction_method?: string;
          id?: string;
          is_demo?: boolean;
          kind?: string;
          origin?: string | null;
          raw_text?: string;
          status?: string;
          summary?: string | null;
          title: string;
          user_id?: string;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          extraction_method?: string;
          id?: string;
          is_demo?: boolean;
          kind?: string;
          origin?: string | null;
          raw_text?: string;
          status?: string;
          summary?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      trust_checks: {
        Row: {
          check_key: string;
          created_at: string;
          detail: string | null;
          id: string;
          label: string;
          method: string | null;
          output_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          check_key: string;
          created_at?: string;
          detail?: string | null;
          id?: string;
          label: string;
          method?: string | null;
          output_id: string;
          status?: string;
          user_id?: string;
        };
        Update: {
          check_key?: string;
          created_at?: string;
          detail?: string | null;
          id?: string;
          label?: string;
          method?: string | null;
          output_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trust_checks_output_id_fkey";
            columns: ["output_id"];
            isOneToOne: false;
            referencedRelation: "outputs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
