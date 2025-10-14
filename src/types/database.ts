export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
        }
        Insert: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
        }
      }
      prd_documents: {
        Row: {
          id: string
          workspace_id: string
          platform: string
          title: string
          body_markdown: string
          params: Json
          version: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          platform: string
          title: string
          body_markdown: string
          params?: Json
          version?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          platform?: string
          title?: string
          body_markdown?: string
          params?: Json
          version?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      prd_versions: {
        Row: {
          prd_id: string
          version: number
          body_markdown: string
          params: Json
          created_at: string
        }
        Insert: {
          prd_id: string
          version: number
          body_markdown: string
          params?: Json
          created_at?: string
        }
        Update: {
          prd_id?: string
          version?: number
          body_markdown?: string
          params?: Json
          created_at?: string
        }
      }
      platforms: {
        Row: {
          id: string
          label: string
          ordering: number
          enabled: boolean
        }
        Insert: {
          id: string
          label: string
          ordering: number
          enabled?: boolean
        }
        Update: {
          id?: string
          label?: string
          ordering?: number
          enabled?: boolean
        }
      }
      platform_params: {
        Row: {
          id: number
          platform_id: string
          key: string
          label: string
          type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean'
          help: string | null
          options: Json | null
          required: boolean
          advanced: boolean
        }
        Insert: {
          id?: number
          platform_id: string
          key: string
          label: string
          type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean'
          help?: string | null
          options?: Json | null
          required?: boolean
          advanced?: boolean
        }
        Update: {
          id?: number
          platform_id?: string
          key?: string
          label?: string
          type?: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean'
          help?: string | null
          options?: Json | null
          required?: boolean
          advanced?: boolean
        }
      }
      billing_customers: {
        Row: {
          user_id: string
          workspace_id: string
          stripe_customer_id: string | null
        }
        Insert: {
          user_id: string
          workspace_id: string
          stripe_customer_id?: string | null
        }
        Update: {
          user_id?: string
          workspace_id?: string
          stripe_customer_id?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          workspace_id: string
          stripe_subscription_id: string | null
          plan_id: string | null
          status: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          stripe_subscription_id?: string | null
          plan_id?: string | null
          status?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          stripe_subscription_id?: string | null
          plan_id?: string | null
          status?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stripe_events: {
        Row: {
          id: number
          type: string
          payload: Json
          received_at: string
        }
        Insert: {
          id?: number
          type: string
          payload: Json
          received_at?: string
        }
        Update: {
          id?: number
          type?: string
          payload?: Json
          received_at?: string
        }
      }
      billing_metrics_daily: {
        Row: {
          day: string
          mrr_cents: number
          active_subscribers: number
          trials: number
          churn_rate: number | null
          arpa_cents: number | null
          new_subs: number
          cancels: number
        }
        Insert: {
          day: string
          mrr_cents: number
          active_subscribers: number
          trials: number
          churn_rate?: number | null
          arpa_cents?: number | null
          new_subs: number
          cancels: number
        }
        Update: {
          day?: string
          mrr_cents?: number
          active_subscribers?: number
          trials?: number
          churn_rate?: number | null
          arpa_cents?: number | null
          new_subs?: number
          cancels?: number
        }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
