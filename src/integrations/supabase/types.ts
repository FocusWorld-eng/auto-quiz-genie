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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_responses: {
        Row: {
          ai_feedback: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          requires_manual_review: boolean
          student_answer: string
          submission_id: string
          teacher_feedback: string | null
          teacher_override_score: number | null
        }
        Insert: {
          ai_feedback?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          requires_manual_review?: boolean
          student_answer: string
          submission_id: string
          teacher_feedback?: string | null
          teacher_override_score?: number | null
        }
        Update: {
          ai_feedback?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          requires_manual_review?: boolean
          student_answer?: string
          submission_id?: string
          teacher_feedback?: string | null
          teacher_override_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "quiz_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer_index: number | null
          created_at: string
          grading_rubric: string | null
          id: string
          options: Json | null
          order_number: number
          points: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          sample_answer: string | null
        }
        Insert: {
          correct_answer_index?: number | null
          created_at?: string
          grading_rubric?: string | null
          id?: string
          options?: Json | null
          order_number: number
          points?: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          sample_answer?: string | null
        }
        Update: {
          correct_answer_index?: number | null
          created_at?: string
          grading_rubric?: string | null
          id?: string
          options?: Json | null
          order_number?: number
          points?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
          sample_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          max_possible_score: number | null
          needs_review: boolean
          quiz_id: string
          started_at: string
          student_id: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          max_possible_score?: number | null
          needs_review?: boolean
          quiz_id: string
          started_at?: string
          student_id: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          max_possible_score?: number | null
          needs_review?: boolean
          quiz_id?: string
          started_at?: string
          student_id?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_published: boolean
          lesson_text: string
          mcq_count: number
          short_answer_count: number
          time_limit: number | null
          title: string
          topic: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean
          lesson_text: string
          mcq_count?: number
          short_answer_count?: number
          time_limit?: number | null
          title: string
          topic: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean
          lesson_text?: string
          mcq_count?: number
          short_answer_count?: number
          time_limit?: number | null
          title?: string
          topic?: string
          total_questions?: number
          updated_at?: string
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
      confidence_level: "high" | "medium" | "low"
      question_type: "multiple_choice" | "short_answer"
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
      confidence_level: ["high", "medium", "low"],
      question_type: ["multiple_choice", "short_answer"],
    },
  },
} as const
