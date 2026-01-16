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
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
          email: string | null;
          stripe_customer_id: string | null;
          is_admin: boolean | null;
          partner_id: string | null;
          accepted_community_rules_at: string | null;
          whatsapp_number: string | null;
          is_ambassador: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          is_admin?: boolean | null;
          partner_id?: string | null;
          accepted_community_rules_at?: string | null;
          whatsapp_number?: string | null;
          is_ambassador?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          is_admin?: boolean | null;
          partner_id?: string | null;
          accepted_community_rules_at?: string | null;
          whatsapp_number?: string | null;
          is_ambassador?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_partner_id_fkey";
            columns: ["partner_id"];
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      partners: {
        Row: {
          id: string;
          business_name: string | null;
          contact_name: string | null;
          contact_email: string | null;
          phone: string | null;
          website: string | null;
          description: string | null;
          logo_url: string | null;
          address: string | null;
          coordinates: [number, number] | null;
          social_media: Json;
          opening_hours: Json;
          calendly_url: string | null;
          stripe_account_id: string | null;
          payout_iban: string | null;
          status: 'pending' | 'approved' | 'rejected';
          admin_notes: string | null;
          instagram: string | null;
          facebook: string | null;
          siret: string | null;
          commission_rate: number;
          commission_model: 'fixed' | 'acquisition'; // New field
          commission_rate_repeat: number | null;     // New field
          contract_signed_at: string | null;         // New field
          payout_method: 'manual' | 'stripe';
          settlement_day: number;
          message: string | null;
          is_official: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          phone?: string | null;
          website?: string | null;
          description?: string | null;
          logo_url?: string | null;
          address?: string | null;
          coordinates?: [number, number] | null;
          social_media?: Json;
          opening_hours?: Json;
          calendly_url?: string | null;
          stripe_account_id?: string | null;
          payout_iban?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          siret?: string | null;
          commission_rate?: number;
          commission_model?: 'fixed' | 'acquisition';
          commission_rate_repeat?: number | null;
          contract_signed_at?: string | null;
          payout_method?: 'manual' | 'stripe';
          settlement_day?: number;
          message?: string | null;
          is_official?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          phone?: string | null;
          website?: string | null;
          description?: string | null;
          logo_url?: string | null;
          address?: string | null;
          coordinates?: [number, number] | null;
          social_media?: Json;
          opening_hours?: Json;
          calendly_url?: string | null;
          stripe_account_id?: string | null;
          payout_iban?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          siret?: string | null;
          commission_rate?: number;
          commission_model?: 'fixed' | 'acquisition';
          commission_rate_repeat?: number | null;
          contract_signed_at?: string | null;
          payout_method?: 'manual' | 'stripe';
          settlement_day?: number;
          message?: string | null;
          is_official?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };


      offers: {
        Row: {
          id: string;
          partner_id: string;
          title: string;
          description: string;
          coordinates: [number, number] | null;
          status: 'draft' | 'ready' | 'approved' | 'rejected' | 'active';
          is_approved: boolean | null;
          calendly_url: string | null;
          category_id: string | null;
          commission_rate: number | null;
          event_start_date: string | null;
          event_end_date: string | null;
          street_address: string | null;
          zip_code: string | null;
          department: string | null;
          city: string | null;
          cancellation_policy: 'flexible' | 'moderate' | 'strict' | 'non_refundable';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          title: string;
          description: string;
          coordinates?: [number, number] | null;
          status?: 'draft' | 'ready' | 'approved' | 'rejected' | 'active';
          is_approved?: boolean | null;
          calendly_url?: string | null;
          category_id?: string | null;
          commission_rate?: number | null;
          event_start_date?: string | null;
          event_end_date?: string | null;
          street_address?: string | null;
          zip_code?: string | null;
          department?: string | null;
          city?: string | null;
          cancellation_policy?: 'flexible' | 'moderate' | 'strict' | 'non_refundable';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          title?: string;
          description?: string;
          coordinates?: [number, number] | null;
          status?: 'draft' | 'ready' | 'approved' | 'rejected' | 'active';
          is_approved?: boolean | null;
          calendly_url?: string | null;
          category_id?: string | null;
          commission_rate?: number | null;
          event_start_date?: string | null;
          event_end_date?: string | null;
          street_address?: string | null;
          zip_code?: string | null;
          department?: string | null;
          city?: string | null;
          cancellation_policy?: 'flexible' | 'moderate' | 'strict' | 'non_refundable';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "offer_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_partner_id_fkey";
            columns: ["partner_id"];
            referencedRelation: "partners";
            referencedColumns: ["id"];
          }
        ];
      };

      offer_variants: {
        Row: {
          id: string;
          offer_id: string;
          name: string;
          price: number;
          discounted_price: number | null;
          content: Json; // New field
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          name: string;
          price: number;
          discounted_price?: number | null;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          offer_id?: string;
          name?: string;
          price?: number;
          discounted_price?: number | null;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offer_prices_offer_id_fkey";
            columns: ["offer_id"];
            referencedRelation: "offers";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [];
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

      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          product_id: string | null;
          price_id: string | null;
          status: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at: string | null;
          canceled_at: string | null;
          latest_invoice_id: string | null;
          latest_payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id?: string | null;
          product_id?: string | null;
          price_id?: string | null;
          status?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          latest_invoice_id?: string | null;
          latest_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string | null;
          product_id?: string | null;
          price_id?: string | null;
          status?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          latest_invoice_id?: string | null;
          latest_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "user_profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };

      customer_orders: {
        Row: {
          id: string;
          customer_email: string;
          partner_id: string;
          stripe_payment_id: string | null;
          user_id: string | null;
          amount_cents: number | null;
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_email: string;
          partner_id?: string;
          stripe_payment_id?: string | null;
          user_id?: string | null;
          amount_cents?: number | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_email?: string;
          partner_id?: string;
          stripe_payment_id?: string | null;
          user_id?: string | null;
          amount_cents?: number | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_orders_partner_id_fkey";
            columns: ["partner_id"];
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_orders_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "user_profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };

      offer_categories: {
        Row: {
          id: string;
          name: string;
          parent_name: string | null;
          parent_slug: string | null;
          slug: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          parent_name?: string | null;
          parent_slug?: string | null;
          slug?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          parent_name?: string | null;
          parent_slug?: string | null;
          slug?: string | null;
        };
        Relationships: [];
      };

      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          content: string | null;
          cover_image: string | null;
          category: string | null;
          author_name: string | null;
          location_tags: string[] | null;
          published_at: string | null;
          created_at: string;
          updated_at: string | null;
          status: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          content?: string | null;
          cover_image?: string | null;
          category?: string | null;
          author_name?: string | null;
          location_tags?: string[] | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          status?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          content?: string | null;
          cover_image?: string | null;
          category?: string | null;
          author_name?: string | null;
          location_tags?: string[] | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };

      newsletter_subscribers: {
        Row: {
          email: string;
          created_at: string;
          is_active: boolean;
          source: string | null;
        };
        Insert: {
          email: string;
          created_at?: string;
          is_active?: boolean;
          source?: string | null;
        };
        Update: {
          email?: string;
          created_at?: string;
          is_active?: boolean;
          source?: string | null;
        };
        Relationships: [];
      };

      reviews: {
        Row: {
          id: string;
          booking_id: string;
          offer_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          offer_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          offer_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_offer_id_fkey";
            columns: ["offer_id"];
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      community_hubs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          city: string | null;
          whatsapp_announcement_link: string | null;
          is_read_only: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          city?: string | null;
          whatsapp_announcement_link?: string | null;
          is_read_only?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          city?: string | null;
          whatsapp_announcement_link?: string | null;
          is_read_only?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      micro_squads: {
        Row: {
          id: string;
          hub_id: string;
          creator_id: string;
          title: string;
          description: string | null;
          location: string | null;
          external_link: string | null;
          date_event: string;
          max_participants: number;
          whatsapp_temp_link: string | null;
          status: 'open' | 'full' | 'finished' | 'cancelled';
          reminder_7d_sent_at: string | null;
          reminder_3d_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          hub_id: string;
          creator_id: string;
          title: string;
          description?: string | null;
          location?: string | null;
          external_link?: string | null;
          date_event: string;
          max_participants?: number;
          whatsapp_temp_link?: string | null;
          status?: 'open' | 'full' | 'finished' | 'cancelled';
          reminder_7d_sent_at?: string | null;
          reminder_3d_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          hub_id?: string;
          creator_id?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          external_link?: string | null;
          date_event?: string;
          max_participants?: number;
          whatsapp_temp_link?: string | null;
          status?: 'open' | 'full' | 'finished' | 'cancelled';
          reminder_7d_sent_at?: string | null;
          reminder_3d_sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "micro_squads_hub_id_fkey";
            columns: ["hub_id"];
            referencedRelation: "community_hubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "micro_squads_creator_id_fkey";
            columns: ["creator_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      squad_members: {
        Row: {
          id: string;
          squad_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          squad_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          squad_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey";
            columns: ["squad_id"];
            referencedRelation: "micro_squads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "squad_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };

    Functions: {
      get_squad_link: {
        Args: { squad_id_input: string };
        Returns: string | null;
      };
      get_hub_link: {
        Args: { hub_id_input: string };
        Returns: string | null;
      };
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
      confirm_booking: {
        Args: {
          p_user_id: string;
          p_offer_id: string;
          p_booking_date: string;
          p_status: string;
          p_source: string;
          p_amount: number;
          p_variant_id: string | null;
          p_external_id: string;
          p_meeting_location?: string | null;
        };
        Returns: void;
      };
    };

    Enums: {
      offer_status: 'draft' | 'ready' | 'pending' | 'approved' | 'rejected';
      media_type: 'image' | 'video';
      pending_partner_status: 'pending' | 'approved' | 'rejected';
      email_status: 'pending' | 'sent' | 'failed';
    };
  };
}
