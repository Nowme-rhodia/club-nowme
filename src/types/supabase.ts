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
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          phone: string;
          photo_url?: string;
          created_at: string;
          updated_at: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          subscription_type?: 'discovery' | 'premium';
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name: string;
          last_name: string;
          phone: string;
          photo_url?: string;
          subscription_status?: 'pending' | 'active' | 'cancelled';
          updated_at?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          subscription_type?: 'discovery' | 'premium';
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          photo_url?: string;
          created_at?: string;
          updated_at?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          subscription_type?: 'discovery' | 'premium';
        };
      };
      partners: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          contact_name: string;
          phone: string;
          website?: string;
          description?: string;
          logo_url?: string;
          address?: string;
          coordinates?: [number, number];
          social_media?: Json;
          opening_hours?: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          contact_name: string;
          phone: string;
          website?: string;
          description?: string;
          logo_url?: string;
          address?: string;
          coordinates?: [number, number];
          social_media?: Json;
          opening_hours?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          contact_name?: string;
          phone?: string;
          website?: string;
          description?: string;
          logo_url?: string;
          address?: string;
          coordinates?: [number, number];
          social_media?: Json;
          opening_hours?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      offers: {
        Row: {
          id: string;
          partner_id: string;
          title: string;
          description: string;
          category_slug: string;
          subcategory_slug: string;
          location: string;
          coordinates?: [number, number];
          status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          title: string;
          description: string;
          category_slug: string;
          subcategory_slug: string;
          location: string;
          coordinates?: [number, number];
          status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'active';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          title?: string;
          description?: string;
          category_slug?: string;
          subcategory_slug?: string;
          location?: string;
          coordinates?: [number, number];
          status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'active';
          created_at?: string;
          updated_at?: string;
        };
      };
      offer_prices: {
        Row: {
          id: string;
          offer_id: string;
          name: string;
          price: number;
          promo_price?: number;
          duration: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          name: string;
          price: number;
          promo_price?: number;
          duration: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          offer_id?: string;
          name?: string;
          price?: number;
          promo_price?: number;
          duration?: string;
          created_at?: string;
        };
      };
      offer_media: {
        Row: {
          id: string;
          offer_id: string;
          url: string;
          type: 'image' | 'video';
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          url: string;
          type: 'image' | 'video';
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          offer_id?: string;
          url?: string;
          type?: 'image' | 'video';
          order?: number;
          created_at?: string;
        };
      };
      pending_partners: {
        Row: {
          id: string;
          business_name: string;
          contact_name: string;
          email: string;
          phone: string;
          siret: string;
          status: 'pending' | 'approved' | 'rejected';
          signup_token?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          contact_name: string;
          email: string;
          phone: string;
          siret: string;
          status?: 'pending' | 'approved' | 'rejected';
          signup_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string;
          siret?: string;
          status?: 'pending' | 'approved' | 'rejected';
          signup_token?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      pending_offers: {
        Row: {
          id: string;
          pending_partner_id: string;
          title: string;
          description: string;
          category_slug: string;
          subcategory_slug: string;
          price: number;
          location: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pending_partner_id: string;
          title: string;
          description: string;
          category_slug: string;
          subcategory_slug: string;
          price: number;
          location: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pending_partner_id?: string;
          title?: string;
          description?: string;
          category_slug?: string;
          subcategory_slug?: string;
          price?: number;
          location?: string;
          created_at?: string;
        };
      };
      emails: {
        Row: {
          id: string;
          to_address: string;
          subject: string;
          content: string;
          status: 'pending' | 'sent' | 'failed';
          error?: string;
          sent_at?: string;
          created_at: string;
          retry_count?: number;
          last_retry?: string;
          next_retry_at?: string;
          error_log?: string;
        };
        Insert: {
          id?: string;
          to_address: string;
          subject: string;
          content: string;
          status?: 'pending' | 'sent' | 'failed';
          error?: string;
          sent_at?: string;
          created_at?: string;
          retry_count?: number;
          last_retry?: string;
          next_retry_at?: string;
          error_log?: string;
        };
        Update: {
          id?: string;
          to_address?: string;
          subject?: string;
          content?: string;
          status?: 'pending' | 'sent' | 'failed';
          error?: string;
          sent_at?: string;
          created_at?: string;
          retry_count?: number;
          last_retry?: string;
          next_retry_at?: string;
          error_log?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          email_id: string;
          status: string;
          message?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email_id: string;
          status: string;
          message?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          status?: string;
          message?: string;
          created_at?: string;
        };
      };
      partner_notifications: {
        Row: {
          id: string;
          partner_id: string;
          type: string;
          title: string;
          content: string;
          priority: 'high' | 'medium' | 'normal' | 'low';
          data?: Json;
          read_status: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          type: string;
          title: string;
          content: string;
          priority: 'high' | 'medium' | 'normal' | 'low';
          data?: Json;
          read_status?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          type?: string;
          title?: string;
          content?: string;
          priority?: 'high' | 'medium' | 'normal' | 'low';
          data?: Json;
          read_status?: boolean;
          created_at?: string;
        };
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          event_type: string;
          customer_id?: string;
          customer_email?: string;
          subscription_id?: string;
          amount?: number;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          raw_event: Json;
          error?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          event_type: string;
          customer_id?: string;
          customer_email?: string;
          subscription_id?: string;
          amount?: number;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          raw_event: Json;
          error?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          stripe_event_id?: string;
          event_type?: string;
          customer_id?: string;
          customer_email?: string;
          subscription_id?: string;
          amount?: number;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          raw_event?: Json;
          error?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      handle_payment_succeeded: {
        Args: { event_id: string; customer_email: string; customer_id: string; subscription_id: string };
        Returns: void;
      };
      handle_payment_failed: {
        Args: { event_id: string; customer_id: string };
        Returns: void;
      };
      handle_subscription_deleted: {
        Args: { event_id: string; customer_id: string };
        Returns: void;
      };
      handle_checkout_completed: {
        Args: { event_id: string; customer_email: string; customer_id: string; subscription_id: string };
        Returns: void;
      };
      validate_coordinates: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      update_updated_at_column: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      validate_subcategories: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
    Enums: {
      offer_status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active';
      media_type: 'image' | 'video';
      pending_partner_status: 'pending' | 'approved' | 'rejected';
      email_status: 'pending' | 'sent' | 'failed';
    };
  };
}