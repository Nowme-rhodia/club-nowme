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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      __supabase_migrations: {
        Row: {
          applied_at: string | null
          id: number
          name: string
        }
        Insert: {
          applied_at?: string | null
          id?: number
          name: string
        }
        Update: {
          applied_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      admin_newsletters: {
        Row: {
          body: string
          created_at: string | null
          id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string
          target_filter: Json | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          subject: string
          target_filter?: Json | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          target_filter?: Json | null
        }
        Relationships: []
      }
      ambassador_applications: {
        Row: {
          availability_hours_per_week: number
          created_at: string
          id: string
          location: string
          motivation_text: string
          phone: string | null
          reviewed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          availability_hours_per_week: number
          created_at?: string
          id?: string
          location: string
          motivation_text: string
          phone?: string | null
          reviewed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          availability_hours_per_week?: number
          created_at?: string
          id?: string
          location?: string
          motivation_text?: string
          phone?: string | null
          reviewed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          location_tags: string[] | null
          published_at: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          location_tags?: string[] | null
          published_at?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          location_tags?: string[] | null
          published_at?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount: number | null
          booking_date: string | null
          calendly_event_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_partner: boolean | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          external_id: string | null
          feedback_email_sent_at: string | null
          id: string
          invoice_sent: boolean | null
          meeting_location: string | null
          offer_id: string | null
          partner_id: string | null
          payment_intent_id: string | null
          penalty_amount: number | null
          scheduled_at: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          amount?: number | null
          booking_date?: string | null
          calendly_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_partner?: boolean | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          external_id?: string | null
          feedback_email_sent_at?: string | null
          id?: string
          invoice_sent?: boolean | null
          meeting_location?: string | null
          offer_id?: string | null
          partner_id?: string | null
          payment_intent_id?: string | null
          penalty_amount?: number | null
          scheduled_at?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          amount?: number | null
          booking_date?: string | null
          calendly_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_partner?: boolean | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          external_id?: string | null
          feedback_email_sent_at?: string | null
          id?: string
          invoice_sent?: boolean | null
          meeting_location?: string | null
          offer_id?: string | null
          partner_id?: string | null
          payment_intent_id?: string | null
          penalty_amount?: number | null
          scheduled_at?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "current_user_admin"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "offer_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      cgp_versions: {
        Row: {
          active: boolean | null
          content: string
          created_at: string | null
          id: string
          version_number: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string | null
          id?: string
          version_number: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string | null
          id?: string
          version_number?: string
        }
        Relationships: []
      }
      community_content: {
        Row: {
          content: string
          created_at: string | null
          event_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      community_hubs: {
        Row: {
          city: string | null
          created_at: string | null
          description: string | null
          id: string
          is_read_only: boolean | null
          name: string
          whatsapp_announcement_link: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_read_only?: boolean | null
          name: string
          whatsapp_announcement_link?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_read_only?: boolean | null
          name?: string
          whatsapp_announcement_link?: string | null
        }
        Relationships: []
      }
      community_suggestions: {
        Row: {
          created_at: string | null
          id: string
          suggestion_text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          suggestion_text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          suggestion_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "current_user_admin"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          amount_cents: number | null
          created_at: string
          customer_email: string
          id: string
          partner_id: string
          status: string | null
          stripe_payment_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          customer_email: string
          id?: string
          partner_id?: string
          status?: string | null
          stripe_payment_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          customer_email?: string
          id?: string
          partner_id?: string
          status?: string | null
          stripe_payment_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "current_user_admin"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "customer_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_id: string | null
          id: string
          message: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          id?: string
          message?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          content: string
          created_at: string
          error: string | null
          error_log: string | null
          id: string
          last_retry: string | null
          next_retry_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
          to_address: string
        }
        Insert: {
          content: string
          created_at?: string
          error?: string | null
          error_log?: string | null
          id?: string
          last_retry?: string | null
          next_retry_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
          to_address: string
        }
        Update: {
          content?: string
          created_at?: string
          error?: string | null
          error_log?: string | null
          id?: string
          last_retry?: string | null
          next_retry_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_address?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category: string
          created_at: string | null
          id: string
          message: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      micro_squads: {
        Row: {
          created_at: string | null
          creator_id: string | null
          date_event: string
          description: string | null
          external_link: string | null
          hub_id: string | null
          id: string
          is_official: boolean | null
          location: string | null
          max_participants: number | null
          reminder_3d_sent_at: string | null
          reminder_7d_sent_at: string | null
          status: string | null
          title: string
          whatsapp_temp_link: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          date_event: string
          description?: string | null
          external_link?: string | null
          hub_id?: string | null
          id?: string
          is_official?: boolean | null
          location?: string | null
          max_participants?: number | null
          reminder_3d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          status?: string | null
          title: string
          whatsapp_temp_link?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          date_event?: string
          description?: string | null
          external_link?: string | null
          hub_id?: string | null
          id?: string
          is_official?: boolean | null
          location?: string | null
          max_participants?: number | null
          reminder_3d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          status?: string | null
          title?: string
          whatsapp_temp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "micro_squads_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "community_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string
          id?: number
          name: string
        }
        Update: {
          executed_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          is_active: boolean | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          is_active?: boolean | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          is_active?: boolean | null
          source?: string | null
        }
        Relationships: []
      }
      offer_categories: {
        Row: {
          id: string
          name: string
          parent_name: string | null
          parent_slug: string | null
          slug: string | null
        }
        Insert: {
          id?: string
          name: string
          parent_name?: string | null
          parent_slug?: string | null
          slug?: string | null
        }
        Update: {
          id?: string
          name?: string
          parent_name?: string | null
          parent_slug?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      offer_media: {
        Row: {
          created_at: string | null
          id: string
          offer_id: string | null
          order_index: number | null
          type: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          order_index?: number | null
          type?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          order_index?: number | null
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_media_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_variants: {
        Row: {
          created_at: string | null
          description: string | null
          discounted_price: number | null
          id: string
          name: string
          offer_id: string
          price: number
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          id?: string
          name: string
          offer_id: string
          price: number
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          id?: string
          name?: string
          offer_id?: string
          price?: number
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_prices_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          booking_type: string | null
          calendly_url: string | null
          cancellation_conditions: string | null
          cancellation_policy: Database["public"]["Enums"]["cancellation_policy"]
          category_id: string | null
          city: string | null
          commission_rate: number | null
          coordinates: unknown
          created_at: string | null
          department: string | null
          description: string
          digital_product_file: string | null
          duration: number | null
          duration_type: string | null
          event_end_date: string | null
          event_start_date: string | null
          external_link: string | null
          id: string
          image_url: string | null
          is_approved: boolean | null
          is_official: boolean | null
          is_online: boolean | null
          partner_id: string
          promo_code: string | null
          promo_conditions: string | null
          service_zones: Json | null
          status: Database["public"]["Enums"]["offer_status"] | null
          street_address: string | null
          title: string
          updated_at: string | null
          validity_end_date: string | null
          validity_start_date: string | null
          zip_code: string | null
        }
        Insert: {
          booking_type?: string | null
          calendly_url?: string | null
          cancellation_conditions?: string | null
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"]
          category_id?: string | null
          city?: string | null
          commission_rate?: number | null
          coordinates?: unknown
          created_at?: string | null
          department?: string | null
          description: string
          digital_product_file?: string | null
          duration?: number | null
          duration_type?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_official?: boolean | null
          is_online?: boolean | null
          partner_id: string
          promo_code?: string | null
          promo_conditions?: string | null
          service_zones?: Json | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          street_address?: string | null
          title: string
          updated_at?: string | null
          validity_end_date?: string | null
          validity_start_date?: string | null
          zip_code?: string | null
        }
        Update: {
          booking_type?: string | null
          calendly_url?: string | null
          cancellation_conditions?: string | null
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"]
          category_id?: string | null
          city?: string | null
          commission_rate?: number | null
          coordinates?: unknown
          created_at?: string | null
          department?: string | null
          description?: string
          digital_product_file?: string | null
          duration?: number | null
          duration_type?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_official?: boolean | null
          is_online?: boolean | null
          partner_id?: string
          promo_code?: string | null
          promo_conditions?: string | null
          service_zones?: Json | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          street_address?: string | null
          title?: string
          updated_at?: string | null
          validity_end_date?: string | null
          validity_start_date?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_cgp_acceptance: {
        Row: {
          accepted_at: string | null
          cgp_version_id: string | null
          id: string
          partner_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cgp_version_id?: string | null
          id?: string
          partner_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cgp_version_id?: string | null
          id?: string
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_cgp_acceptance_cgp_version_id_fkey"
            columns: ["cgp_version_id"]
            isOneToOne: false
            referencedRelation: "cgp_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_cgp_acceptance_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notifications: {
        Row: {
          content: string | null
          created_at: string
          data: Json | null
          id: string
          partner_id: string
          priority: string | null
          read_status: boolean | null
          title: string
          type: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          partner_id: string
          priority?: string | null
          read_status?: boolean | null
          title: string
          type: string
        }
        Update: {
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          partner_id?: string
          priority?: string | null
          read_status?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          commission_amount_cents: number | null
          created_at: string | null
          currency: string | null
          fees_amount_cents: number
          finalized_at: string | null
          generated_at: string | null
          gross_amount_cents: number | null
          id: string
          item_count: number
          net_amount_cents: number | null
          notes: string | null
          paid_at: string | null
          partner_id: string | null
          payout_reference: string | null
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["partner_payout_status"]
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          commission_amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          fees_amount_cents?: number
          finalized_at?: string | null
          generated_at?: string | null
          gross_amount_cents?: number | null
          id?: string
          item_count?: number
          net_amount_cents?: number | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string | null
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["partner_payout_status"]
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          fees_amount_cents?: number
          finalized_at?: string | null
          generated_at?: string | null
          gross_amount_cents?: number | null
          id?: string
          item_count?: number
          net_amount_cents?: number | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string | null
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["partner_payout_status"]
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          admin_notes: string | null
          business_name: string | null
          calendly_token: string | null
          calendly_url: string | null
          commission_rate: number
          contact_email: string | null
          contact_name: string | null
          coordinates: unknown
          created_at: string | null
          description: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          message: string | null
          notification_settings: Json | null
          opening_hours: Json | null
          payout_iban: string | null
          payout_method: Database["public"]["Enums"]["payout_method"]
          pending_penalties: number | null
          phone: string | null
          reminder_sent: boolean | null
          settlement_day: number
          siret: string | null
          social_media: Json | null
          status: Database["public"]["Enums"]["partner_status"]
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          terms_accepted_at: string | null
          tva_intra: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          welcome_sent: boolean | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          business_name?: string | null
          calendly_token?: string | null
          calendly_url?: string | null
          commission_rate?: number
          contact_email?: string | null
          contact_name?: string | null
          coordinates?: unknown
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          message?: string | null
          notification_settings?: Json | null
          opening_hours?: Json | null
          payout_iban?: string | null
          payout_method?: Database["public"]["Enums"]["payout_method"]
          pending_penalties?: number | null
          phone?: string | null
          reminder_sent?: boolean | null
          settlement_day?: number
          siret?: string | null
          social_media?: Json | null
          status?: Database["public"]["Enums"]["partner_status"]
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          terms_accepted_at?: string | null
          tva_intra?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          welcome_sent?: boolean | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          business_name?: string | null
          calendly_token?: string | null
          calendly_url?: string | null
          commission_rate?: number
          contact_email?: string | null
          contact_name?: string | null
          coordinates?: unknown
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          message?: string | null
          notification_settings?: Json | null
          opening_hours?: Json | null
          payout_iban?: string | null
          payout_method?: Database["public"]["Enums"]["payout_method"]
          pending_penalties?: number | null
          phone?: string | null
          reminder_sent?: boolean | null
          settlement_day?: number
          siret?: string | null
          social_media?: Json | null
          status?: Database["public"]["Enums"]["partner_status"]
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          terms_accepted_at?: string | null
          tva_intra?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          welcome_sent?: boolean | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          commission_amount: number
          commission_tva: number
          created_at: string | null
          generated_at: string | null
          id: string
          net_payout_amount: number
          paid_at: string | null
          partner_id: string | null
          period_end: string
          period_start: string
          statement_url: string | null
          status: string | null
          stripe_transfer_id: string | null
          total_amount_collected: number
        }
        Insert: {
          commission_amount?: number
          commission_tva?: number
          created_at?: string | null
          generated_at?: string | null
          id?: string
          net_payout_amount?: number
          paid_at?: string | null
          partner_id?: string | null
          period_end: string
          period_start: string
          statement_url?: string | null
          status?: string | null
          stripe_transfer_id?: string | null
          total_amount_collected?: number
        }
        Update: {
          commission_amount?: number
          commission_tva?: number
          created_at?: string | null
          generated_at?: string | null
          id?: string
          net_payout_amount?: number
          paid_at?: string | null
          partner_id?: string | null
          period_end?: string
          period_start?: string
          statement_url?: string | null
          status?: string | null
          stripe_transfer_id?: string | null
          total_amount_collected?: number
        }
        Relationships: [
          {
            foreignKeyName: "payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      region_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          notified: boolean | null
          region: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          notified?: boolean | null
          region: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          notified?: boolean | null
          region?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          offer_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          offer_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          offer_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "current_user_admin"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      squad_members: {
        Row: {
          id: string
          joined_at: string | null
          squad_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          squad_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          squad_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "micro_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "current_user_admin"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "squad_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          latest_invoice_id: string | null
          latest_payment_intent_id: string | null
          price_id: string | null
          product_id: string | null
          status: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          latest_invoice_id?: string | null
          latest_payment_intent_id?: string | null
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          latest_invoice_id?: string | null
          latest_payment_intent_id?: string | null
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "current_user_admin"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          accepted_community_rules_at: string | null
          acquisition_source: string | null
          ambassador_last_reminder_at: string | null
          ambassador_start_date: string | null
          birth_date: string | null
          created_at: string | null
          delivery_address: string | null
          email: string | null
          first_name: string | null
          id: string
          is_admin: boolean | null
          is_ambassador: boolean | null
          last_name: string | null
          last_reminder_sent_at: string | null
          latitude: number | null
          longitude: number | null
          partner_id: string | null
          phone: string | null
          photo_url: string | null
          reminder_step: number | null
          selected_plan: string | null
          signup_goal: string | null
          signup_reminder_sent: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          sub_auto_recap: boolean | null
          sub_newsletter: boolean | null
          subscription_status: string | null
          subscription_type: string | null
          subscription_updated_at: string | null
          terms_accepted_at: string | null
          updated_at: string | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          accepted_community_rules_at?: string | null
          acquisition_source?: string | null
          ambassador_last_reminder_at?: string | null
          ambassador_start_date?: string | null
          birth_date?: string | null
          created_at?: string | null
          delivery_address?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_ambassador?: boolean | null
          last_name?: string | null
          last_reminder_sent_at?: string | null
          latitude?: number | null
          longitude?: number | null
          partner_id?: string | null
          phone?: string | null
          photo_url?: string | null
          reminder_step?: number | null
          selected_plan?: string | null
          signup_goal?: string | null
          signup_reminder_sent?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sub_auto_recap?: boolean | null
          sub_newsletter?: boolean | null
          subscription_status?: string | null
          subscription_type?: string | null
          subscription_updated_at?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          accepted_community_rules_at?: string | null
          acquisition_source?: string | null
          ambassador_last_reminder_at?: string | null
          ambassador_start_date?: string | null
          birth_date?: string | null
          created_at?: string | null
          delivery_address?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_ambassador?: boolean | null
          last_name?: string | null
          last_reminder_sent_at?: string | null
          latitude?: number | null
          longitude?: number | null
          partner_id?: string | null
          phone?: string | null
          photo_url?: string | null
          reminder_step?: number | null
          selected_plan?: string | null
          signup_goal?: string | null
          signup_reminder_sent?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sub_auto_recap?: boolean | null
          sub_newsletter?: boolean | null
          subscription_status?: string | null
          subscription_type?: string | null
          subscription_updated_at?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      current_user_admin: {
        Row: {
          email: string | null
          is_admin: boolean | null
          user_id: string | null
        }
        Relationships: []
      }
      partner_payouts_summary: {
        Row: {
          commission_amount_cents: number | null
          created_at: string | null
          currency: string | null
          fees_amount_cents: number | null
          finalized_at: string | null
          generated_at: string | null
          gross_amount_cents: number | null
          id: string | null
          item_count: number | null
          net_amount_cents: number | null
          paid_at: string | null
          partner_id: string | null
          payout_reference: string | null
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["partner_payout_status"] | null
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          commission_amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          fees_amount_cents?: number | null
          finalized_at?: string | null
          generated_at?: string | null
          gross_amount_cents?: number | null
          id?: string | null
          item_count?: number | null
          net_amount_cents?: number | null
          paid_at?: string | null
          partner_id?: string | null
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["partner_payout_status"] | null
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          fees_amount_cents?: number | null
          finalized_at?: string | null
          generated_at?: string | null
          gross_amount_cents?: number | null
          id?: string | null
          item_count?: number | null
          net_amount_cents?: number | null
          paid_at?: string | null
          partner_id?: string | null
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["partner_payout_status"] | null
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_constraints_status: {
        Row: {
          constraint_name: unknown
          definition: string | null
          fk_columns: unknown[] | null
          index_check: string | null
          on_delete_action: string | null
          referenced_table: unknown
          table_name: unknown
        }
        Relationships: []
      }
      vw_rls_status: {
        Row: {
          command: string | null
          permissive: string | null
          policyname: unknown
          role: unknown
          schemaname: unknown
          tablename: unknown
          using_expression: string | null
          with_check_expression: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_payouts_report: {
        Args: never
        Returns: {
          commission: number
          gross_total: number
          net_total: number
          total_bookings: number
        }[]
      }
      admin_payouts_report_by_partner: {
        Args: { partner_uuid: string }
        Returns: {
          commission: number
          gross_total: number
          net_total: number
          total_bookings: number
        }[]
      }
      am_i_admin: { Args: never; Returns: boolean }
      approve_offer: { Args: { target_offer_id: string }; Returns: boolean }
      archive_expired_content: { Args: never; Returns: undefined }
      bytea_to_text: { Args: { data: string }; Returns: string }
      check_subscription_status: { Args: never; Returns: boolean }
      cleanup_database: { Args: never; Returns: undefined }
      confirm_booking: {
        Args: {
          p_amount: number
          p_booking_date: string
          p_external_id?: string
          p_meeting_location?: string
          p_offer_id: string
          p_source: string
          p_status: string
          p_user_id: string
          p_variant_id?: string
        }
        Returns: Json
      }
      create_test_user: {
        Args: {
          first_name: string
          last_name: string
          phone: string
          subscription_type?: string
          user_email: string
          user_password: string
        }
        Returns: string
      }
      create_working_test_user: {
        Args: {
          p_email: string
          p_first_name?: string
          p_last_name?: string
          p_password: string
          p_phone?: string
          p_subscription_type?: string
        }
        Returns: string
      }
      decrement_offer_stock: { Args: { offer_id: string }; Returns: undefined }
      delete_user_completely: { Args: { user_id: string }; Returns: undefined }
      exec_sql: { Args: { sql_query: string }; Returns: undefined }
      find_inconsistent_subscription_statuses: {
        Args: never
        Returns: {
          db_status: string
          email: string
          last_webhook_event_time: string
          last_webhook_event_type: string
          stripe_subscription_id: string
          user_id: string
        }[]
      }
      generate_monthly_partner_payouts:
        | { Args: never; Returns: undefined }
        | { Args: { p_ref_date?: string }; Returns: Json }
      generate_partner_payout: {
        Args: {
          v_partner_id: string
          v_period_end: string
          v_period_start: string
        }
        Returns: string
      }
      generate_partner_payout_items: {
        Args: {
          p_partner_id: string
          p_partner_payout_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: undefined
      }
      generate_partner_payout_items_for: {
        Args: { p_dry_run?: boolean; p_payout_id: string }
        Returns: Json
      }
      generate_partner_payouts_for_month: {
        Args: { v_month: number; v_year: number }
        Returns: undefined
      }
      generate_partner_payouts_for_period: {
        Args: { v_period_end: string; v_period_start: string }
        Returns: undefined
      }
      get_auth_partner_id: { Args: never; Returns: string }
      get_hub_link: { Args: { hub_id_input: string }; Returns: string }
      get_my_claims: { Args: never; Returns: Json }
      get_my_clients_secure: { Args: never; Returns: string[] }
      get_my_partner_id: { Args: never; Returns: string }
      get_my_partner_id_secure: { Args: never; Returns: string }
      get_safe_community_locations: {
        Args: never
        Returns: {
          first_name: string
          photo_url: string
          safe_latitude: number
          safe_longitude: number
          user_id: string
        }[]
      }
      get_squad_link: { Args: { squad_id_input: string }; Returns: string }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      get_webhook_event_counts: {
        Args: never
        Returns: {
          count: number
          last_24h: number
          last_7d: number
          status: string
        }[]
      }
      get_webhook_event_type_stats: {
        Args: never
        Returns: {
          event_type: string
          failed_count: number
          last_received: string
          success_count: number
          success_rate: number
          total_count: number
        }[]
      }
      handle_checkout_completed: {
        Args: {
          customer_email: string
          customer_id: string
          event_id: string
          subscription_id: string
        }
        Returns: undefined
      }
      handle_payment_failed: {
        Args: { customer_id: string; event_id: string }
        Returns: undefined
      }
      handle_payment_succeeded:
        | { Args: { event: Json }; Returns: undefined }
        | {
            Args: {
              customer_email: string
              customer_id: string
              event_id: string
              subscription_id: string
            }
            Returns: undefined
          }
      handle_subscription_created:
        | {
            Args: {
              customer_id: string
              event_id: string
              subscription_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              customer_id: string
              event_id: string
              subscription_id: string
            }
            Returns: undefined
          }
      handle_subscription_deleted: {
        Args: { customer_id: string; event_id: string }
        Returns: undefined
      }
      has_active_subscription: { Args: { user_uuid: string }; Returns: boolean }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_variant_stock: {
        Args: { variant_id_input: string }
        Returns: undefined
      }
      is_active_subscriber: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_secure: { Args: never; Returns: boolean }
      is_partner:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      is_premium_member: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_standard_user: { Args: never; Returns: boolean }
      is_subscription_active: { Args: { user_id: string }; Returns: boolean }
      link_profile_to_auth_user: {
        Args: { auth_user_id: string; profile_email: string }
        Returns: boolean
      }
      policy_exists: {
        Args: { policy_name: string; table_name: string }
        Returns: boolean
      }
      recalc_partner_payout_totals: {
        Args: { p_payout_id: string }
        Returns: undefined
      }
      recompute_partner_payout_aggregates: {
        Args: { p_payout_id: string }
        Returns: undefined
      }
      recompute_partner_payout_totals: {
        Args: { p_payout_id: string }
        Returns: undefined
      }
      refresh_all_partner_payouts: { Args: never; Returns: undefined }
      refresh_partner_payouts: {
        Args: { p_payout_id: string }
        Returns: undefined
      }
      safe_get_user_by_email: {
        Args: { p_email: string }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
        }[]
      }
      safe_list_users: {
        Args: { p_email?: string; p_page?: number; p_per_page?: number }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
        }[]
      }
      send_partner_reminders: { Args: never; Returns: undefined }
      text_to_bytea: { Args: { data: string }; Returns: string }
      upsert_partner_payout_header: {
        Args: {
          p_currency: string
          p_finalize?: boolean
          p_partner_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          commission_amount_cents: number | null
          created_at: string | null
          currency: string | null
          fees_amount_cents: number
          finalized_at: string | null
          generated_at: string | null
          gross_amount_cents: number | null
          id: string
          item_count: number
          net_amount_cents: number | null
          notes: string | null
          paid_at: string | null
          partner_id: string | null
          payout_reference: string | null
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["partner_payout_status"]
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      booking_status:
        | "pending"
        | "requires_payment"
        | "paid"
        | "canceled"
        | "refunded"
        | "failed"
      cancellation_policy: "flexible" | "moderate" | "strict" | "non_refundable"
      email_status: "pending" | "sent" | "failed"
      media_type: "image" | "video"
      offer_status:
        | "draft"
        | "ready"
        | "pending"
        | "approved"
        | "rejected"
        | "archived"
      partner_payout_item_kind: "sale" | "adjustment"
      partner_payout_status:
        | "draft"
        | "finalized"
        | "paid"
        | "cancelled"
        | "failed"
      partner_status: "pending" | "approved" | "rejected"
      payout_method: "manual" | "sepa" | "stripe_connect"
      pending_partner_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      booking_status: [
        "pending",
        "requires_payment",
        "paid",
        "canceled",
        "refunded",
        "failed",
      ],
      cancellation_policy: ["flexible", "moderate", "strict", "non_refundable"],
      email_status: ["pending", "sent", "failed"],
      media_type: ["image", "video"],
      offer_status: [
        "draft",
        "ready",
        "pending",
        "approved",
        "rejected",
        "archived",
      ],
      partner_payout_item_kind: ["sale", "adjustment"],
      partner_payout_status: [
        "draft",
        "finalized",
        "paid",
        "cancelled",
        "failed",
      ],
      partner_status: ["pending", "approved", "rejected"],
      payout_method: ["manual", "sepa", "stripe_connect"],
      pending_partner_status: ["pending", "approved", "rejected"],
    },
  },
} as const
