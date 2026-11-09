export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AdminStatus = 'active' | 'suspended' | 'disabled';
export type LeadStatus = 'new' | 'contacted' | 'in_progress' | 'won' | 'lost' | 'spam';
export type WorkPriority = 'low' | 'normal' | 'high' | 'urgent';
export type WorkStatus = 'assigned' | 'accepted' | 'in_progress' | 'in_review' | 'completed' | 'delivered' | 'on_hold' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_built_in: boolean;
          permissions: string[];
          default_lead_scope: Record<string, unknown> | null;
          ip_allowlist: string | null;
          session_timeout_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          is_built_in?: boolean;
          permissions: string[];
          default_lead_scope?: Record<string, unknown> | null;
          ip_allowlist?: string | null;
          session_timeout_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['roles']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          role: string;
          custom_permissions: string[] | null;
          lead_scope: Record<string, unknown> | null;
          status: AdminStatus;
          two_factor_enabled: boolean;
          must_change_password: boolean;
          must_setup_2fa: boolean;
          expires_at: string | null;
          deleted_at: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          role?: string;
          custom_permissions?: string[] | null;
          lead_scope?: Record<string, unknown> | null;
          status?: AdminStatus;
          two_factor_enabled?: boolean;
          must_change_password?: boolean;
          must_setup_2fa?: boolean;
          expires_at?: string | null;
          deleted_at?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          billing_address: string | null;
          gstin: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          billing_address?: string | null;
          gstin?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email_encrypted: string;
          email_blind_index: string;
          category: string;
          message_encrypted: string;
          status: LeadStatus;
          assigned_to: string | null;
          source_page: string | null;
          referrer: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          device_type: string | null;
          browser: string | null;
          os: string | null;
          country: string | null;
          ip_masked: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email_encrypted: string;
          email_blind_index: string;
          category: string;
          message_encrypted: string;
          status?: LeadStatus;
          assigned_to?: string | null;
          source_page?: string | null;
          referrer?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          device_type?: string | null;
          browser?: string | null;
          os?: string | null;
          country?: string | null;
          ip_masked?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
      work_items: {
        Row: {
          id: string;
          item_number: string;
          lead_id: string | null;
          client_id: string | null;
          client_name: string;
          client_email: string | null;
          client_phone: string | null;
          client_company: string | null;
          title: string;
          description: string;
          category: string;
          source: string;
          is_personal: boolean;
          priority: WorkPriority;
          status: WorkStatus;
          progress_percent: number;
          due_date: string | null;
          tags: string[] | null;
          links: Json | null;
          custom_fields: Json | null;
          version: number;
          quoted_price: number | null;
          final_price: number | null;
          discount: number | null;
          tax_percent: number | null;
          currency: string;
          payment_status: PaymentStatus;
          amount_received: number | null;
          balance_due: number | null;
          payment_method: string | null;
          delivery_notes: string | null;
          delivered_at: string | null;
          delivered_by: string | null;
          completed_at: string | null;
          invoice_reference: string | null;
          invoice_details: Json | null;
          assigned_to: string | null;
          assigned_by: string | null;
          assigned_by_name: string | null;
          assigned_by_role: string | null;
          assigned_at: string | null;
          shared_fields: string[];
          assignment_instructions: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_number: string;
          lead_id?: string | null;
          client_id?: string | null;
          client_name: string;
          client_email?: string | null;
          client_phone?: string | null;
          client_company?: string | null;
          title: string;
          description: string;
          category: string;
          source?: string;
          is_personal?: boolean;
          priority?: WorkPriority;
          status?: WorkStatus;
          progress_percent?: number;
          due_date?: string | null;
          tags?: string[] | null;
          links?: Json | null;
          custom_fields?: Json | null;
          version?: number;
          quoted_price?: number | null;
          final_price?: number | null;
          discount?: number | null;
          tax_percent?: number | null;
          currency?: string;
          payment_status?: PaymentStatus;
          amount_received?: number | null;
          balance_due?: number | null;
          payment_method?: string | null;
          delivery_notes?: string | null;
          delivered_at?: string | null;
          delivered_by?: string | null;
          completed_at?: string | null;
          invoice_reference?: string | null;
          invoice_details?: Json | null;
          assigned_to?: string | null;
          assigned_by?: string | null;
          assigned_by_name?: string | null;
          assigned_by_role?: string | null;
          assigned_at?: string | null;
          shared_fields?: string[];
          assignment_instructions?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['work_items']['Insert']>;
      };
      settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
      };
      analytics_events: {
        Row: {
          id: string;
          visitor_hash: string;
          visitor_id: string | null;
          session_id: string;
          event_type: string;
          target: string | null;
          path: string;
          referrer: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          device_type: string | null;
          browser: string | null;
          os: string | null;
          country: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          visitor_hash: string;
          visitor_id?: string | null;
          session_id: string;
          event_type: string;
          target?: string | null;
          path?: string;
          referrer?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          device_type?: string | null;
          browser?: string | null;
          os?: string | null;
          country?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>;
      };
    };
  };
}
