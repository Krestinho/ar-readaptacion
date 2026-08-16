export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string | null;
          username: string | null;
          must_change_password: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string | null;
          username?: string | null;
          must_change_password?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string | null;
          username?: string | null;
          must_change_password?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          code: string | null;
          title: string;
          description: string | null;
          video_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string | null;
          title: string;
          description?: string | null;
          video_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string | null;
          title?: string;
          description?: string | null;
          video_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          start_date: string | null;
          end_date: string | null;
          training_days: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          start_date?: string | null;
          end_date?: string | null;
          training_days?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          title?: string;
          start_date?: string | null;
          end_date?: string | null;
          training_days?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plans_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_exercises: {
        Row: {
          id: string;
          plan_id: string;
          exercise_id: string;
          custom_instructions: string | null;
          section_name: string | null;
          block_name: string | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          plan_id: string;
          exercise_id: string;
          custom_instructions?: string | null;
          section_name?: string | null;
          block_name?: string | null;
          order_index?: number;
        };
        Update: {
          id?: string;
          plan_id?: string;
          exercise_id?: string;
          custom_instructions?: string | null;
          section_name?: string | null;
          block_name?: string | null;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "plan_exercises_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_active_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      clear_must_change_password: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "admin" | "patient";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

/** Atajos de dominio usados en la app */
export type UserRole = Enums<"user_role">;
export type Profile = Tables<"profiles">;
export type Exercise = Tables<"exercises">;
export type Plan = Tables<"plans">;
export type PlanExercise = Tables<"plan_exercises">;

/** Plan exercise con el ejercicio base embebido (joins típicos) */
export type PlanExerciseWithExercise = PlanExercise & {
  exercises: Pick<Exercise, "id" | "code" | "title" | "description" | "video_url">;
};

/** Plan completo para vistas de lectura / PDF */
export type PlanWithExercises = Plan & {
  plan_exercises: PlanExerciseWithExercise[];
};
