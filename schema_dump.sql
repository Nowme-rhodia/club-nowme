

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'requires_payment',
    'paid',
    'canceled',
    'refunded',
    'failed'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."cancellation_policy" AS ENUM (
    'flexible',
    'moderate',
    'strict',
    'non_refundable'
);


ALTER TYPE "public"."cancellation_policy" OWNER TO "postgres";


CREATE TYPE "public"."email_status" AS ENUM (
    'pending',
    'sent',
    'failed'
);


ALTER TYPE "public"."email_status" OWNER TO "postgres";


CREATE TYPE "public"."installment_status" AS ENUM (
    'pending',
    'paid',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."installment_status" OWNER TO "postgres";


CREATE TYPE "public"."invoice_type" AS ENUM (
    'installment_receipt',
    'final_recap'
);


ALTER TYPE "public"."invoice_type" OWNER TO "postgres";


CREATE TYPE "public"."media_type" AS ENUM (
    'image',
    'video'
);


ALTER TYPE "public"."media_type" OWNER TO "postgres";


CREATE TYPE "public"."offer_status" AS ENUM (
    'draft',
    'ready',
    'pending',
    'approved',
    'rejected',
    'archived'
);


ALTER TYPE "public"."offer_status" OWNER TO "postgres";


CREATE TYPE "public"."partner_payout_item_kind" AS ENUM (
    'sale',
    'adjustment'
);


ALTER TYPE "public"."partner_payout_item_kind" OWNER TO "postgres";


CREATE TYPE "public"."partner_payout_status" AS ENUM (
    'draft',
    'finalized',
    'paid',
    'cancelled',
    'failed'
);


ALTER TYPE "public"."partner_payout_status" OWNER TO "postgres";


CREATE TYPE "public"."partner_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."partner_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_plan_status" AS ENUM (
    'active',
    'completed',
    'cancelled',
    'past_due'
);


ALTER TYPE "public"."payment_plan_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_plan_type" AS ENUM (
    '2x',
    '3x',
    '4x'
);


ALTER TYPE "public"."payment_plan_type" OWNER TO "postgres";


CREATE TYPE "public"."payout_method" AS ENUM (
    'manual',
    'sepa',
    'stripe_connect'
);


ALTER TYPE "public"."payout_method" OWNER TO "postgres";


CREATE TYPE "public"."pending_partner_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."pending_partner_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_payouts_report"() RETURNS TABLE("total_bookings" bigint, "gross_total" numeric, "commission" numeric, "net_total" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.amount), 0) as gross_total,
        COALESCE(SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as commission,
        COALESCE(SUM(b.amount) - SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as net_total
    FROM
        bookings b
    JOIN
        partners p ON b.partner_id = p.id
    WHERE
        b.status = 'confirmed';
END;
$$;


ALTER FUNCTION "public"."admin_payouts_report"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_payouts_report_by_partner"("partner_uuid" "uuid") RETURNS TABLE("total_bookings" bigint, "gross_total" numeric, "commission" numeric, "net_total" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.amount), 0) as gross_total,
        COALESCE(SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as commission,
        COALESCE(SUM(b.amount) - SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as net_total
    FROM
        bookings b
    JOIN
        partners p ON b.partner_id = p.id
    WHERE
        b.status = 'confirmed'
        AND b.partner_id = partner_uuid;
END;
$$;


ALTER FUNCTION "public"."admin_payouts_report_by_partner"("partner_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."am_i_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = auth.uid() 
      AND is_admin = true
  );
END;
$$;


ALTER FUNCTION "public"."am_i_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_offer"("target_offer_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can approve offers.';
  END IF;

  -- Perform the update
  UPDATE offers
  SET 
    status = 'approved',
    is_approved = true,
    updated_at = NOW()
  WHERE id = target_offer_id;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."approve_offer"("target_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_expired_content"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Archive expired Offers (All partners)
    UPDATE public.offers
    SET status = 'archived'
    WHERE status = 'approved'
    AND event_end_date < NOW();

    -- Archive expired Community Content
    UPDATE public.community_content
    SET is_active = false
    WHERE is_active = true
    AND event_date < NOW();
END;
$$;


ALTER FUNCTION "public"."archive_expired_content"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bookings_before_ins_upd_bi"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  -- Timestamps
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  -- Currency par défaut en minuscules
  IF NEW.currency IS NULL THEN
    NEW.currency := 'eur';
  ELSE
    NEW.currency := lower(NEW.currency);
  END IF;

  -- Partner auto depuis offers si pas fourni
  IF (NEW.partner_id IS NULL OR NEW.partner_id = '00000000-0000-0000-0000-000000000000') THEN
    SELECT o.partner_id INTO v_partner_id
    FROM public.offers o
    WHERE o.id = NEW.offer_id;
    IF v_partner_id IS NOT NULL THEN
      NEW.partner_id := v_partner_id;
    END IF;
  END IF;

  -- Total auto si possible
  IF NEW.total_amount_cents IS NULL
     AND NEW.unit_amount_cents IS NOT NULL
     AND NEW.quantity IS NOT NULL THEN
    NEW.total_amount_cents := NEW.unit_amount_cents * NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bookings_before_ins_upd_bi"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bookings_fill_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.currency IS NULL THEN
    NEW.currency := 'EUR';
  END IF;

  IF (NEW.total_amount_cents IS NULL OR NEW.total_amount_cents = 0)
     AND NEW.unit_amount_cents IS NOT NULL
     AND NEW.quantity IS NOT NULL THEN
    NEW.total_amount_cents := NEW.unit_amount_cents * NEW.quantity;
  END IF;

  -- miroir pour agrégats
  IF NEW.total_amount_cents IS NOT NULL THEN
    NEW.amount_cents := NEW.total_amount_cents;
  END IF;

  RETURN NEW;
END$$;


ALTER FUNCTION "public"."bookings_fill_defaults"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bookings_fix_partner_after_upd_ai"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  SELECT o.partner_id INTO v_partner_id FROM public.offers o WHERE o.id = NEW.offer_id;
  IF v_partner_id IS NOT NULL AND NEW.partner_id IS DISTINCT FROM v_partner_id THEN
    UPDATE public.bookings b
      SET partner_id = v_partner_id
      WHERE b.id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."bookings_fix_partner_after_upd_ai"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bookings_set_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- si l'UI enregistre un snapshot pricing, on peut s'en servir pour unit
  IF NEW.unit_amount_cents IS NULL AND NEW.pricing_snapshot IS NOT NULL THEN
    NEW.unit_amount_cents := NULLIF((NEW.pricing_snapshot->>'unit_amount_cents')::int, 0);
  END IF;

  NEW.total_amount_cents := COALESCE(NEW.unit_amount_cents,0) * COALESCE(NEW.quantity,1);
  NEW.amount_cents := NEW.total_amount_cents;

  RETURN NEW;
END$$;


ALTER FUNCTION "public"."bookings_set_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_subscription_status"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Définir search_path à vide pour éviter les attaques d'injection de schéma
  SET search_path = '';
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."check_subscription_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_database"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_logs_count INT;
    deleted_partners_count INT;
BEGIN
    -- 1. Cleanup old logs (> 30 days)
    DELETE FROM public.email_logs
    WHERE created_at < now() - interval '30 days';
    
    GET DIAGNOSTICS deleted_logs_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old email logs', deleted_logs_count;

    -- 2. Cleanup orphaned partners (> 7 days)
    -- "Orphaned" means they exist in 'partners' but have no linked 'user_profiles'
    -- We use a CTE to identify them first to avoid complex subqueries in DELETEs
    
    CREATE TEMP TABLE IF NOT EXISTS temp_orphaned_partners AS
    SELECT p.id 
    FROM public.partners p
    LEFT JOIN public.user_profiles up ON p.id = up.partner_id
    WHERE up.id IS NULL 
    AND p.created_at < now() - interval '7 days'; -- Safety buffer

    -- Delete linked data for these partners
    
    -- Bookings
    DELETE FROM public.bookings
    WHERE partner_id IN (SELECT id FROM temp_orphaned_partners);
    
    -- Offer Media (linked via offers)
    DELETE FROM public.offer_media
    WHERE offer_id IN (
        SELECT id FROM public.offers WHERE partner_id IN (SELECT id FROM temp_orphaned_partners)
    );
    
    -- Offer Variants (linked via offers)
    DELETE FROM public.offer_variants
    WHERE offer_id IN (
        SELECT id FROM public.offers WHERE partner_id IN (SELECT id FROM temp_orphaned_partners)
    );
    
    -- Offers
    DELETE FROM public.offers
    WHERE partner_id IN (SELECT id FROM temp_orphaned_partners);
    
    -- Partners themselves
    DELETE FROM public.partners
    WHERE id IN (SELECT id FROM temp_orphaned_partners);
    
    GET DIAGNOSTICS deleted_partners_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned partners', deleted_partners_count;
    
    -- Cleanup temp table
    DROP TABLE IF EXISTS temp_orphaned_partners;

END;
$$;


ALTER FUNCTION "public"."cleanup_database"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" timestamp with time zone, "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid" DEFAULT NULL::"uuid", "p_external_id" "text" DEFAULT NULL::"text", "p_meeting_location" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_booking_id UUID;
  v_stock INT;
  v_existing_id UUID;
  v_partner_id UUID;
BEGIN

  -- 0. Get Partner ID from Offer to ensure data integrity
  SELECT partner_id INTO v_partner_id FROM offers WHERE id = p_offer_id;

  -- 1. Check Stock if Variant is involved
  IF p_variant_id IS NOT NULL THEN
    SELECT stock INTO v_stock FROM offer_variants WHERE id = p_variant_id;
    
    IF v_stock IS NOT NULL AND v_stock <= 0 THEN
      RAISE EXCEPTION 'Stock exhausted for this variant';
    END IF;

    -- Decrement Stock (Atomic)
    IF v_stock IS NOT NULL THEN
      UPDATE offer_variants SET stock = stock - 1 WHERE id = p_variant_id;
    END IF;
  END IF;

  -- 2. Check for an existing PENDING booking for this user/offer
  SELECT id INTO v_existing_id 
  FROM bookings 
  WHERE user_id = p_user_id 
    AND offer_id = p_offer_id 
    AND status = 'pending'
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
     -- UPDATE existing pending booking
     -- CRITICAL FIX: Always update partner_id to ensure it matches the offer
     UPDATE bookings 
     SET 
        status = p_status,
        source = p_source,
        amount = p_amount,
        partner_id = v_partner_id, -- Ensure partner is linked!
        variant_id = COALESCE(p_variant_id, variant_id),
        external_id = p_external_id,
        booking_date = p_booking_date,
        meeting_location = CASE 
            WHEN p_meeting_location IS NOT NULL AND TRIM(p_meeting_location) <> '' THEN p_meeting_location 
            ELSE meeting_location 
        END,
        updated_at = now()
     WHERE id = v_existing_id
     RETURNING id INTO v_booking_id;
  ELSE
     -- INSERT New Booking
     INSERT INTO bookings (
        user_id, offer_id, partner_id, booking_date, status, source, amount, variant_id, external_id, meeting_location
     ) VALUES (
        p_user_id, p_offer_id, v_partner_id, p_booking_date, p_status, p_source, p_amount, p_variant_id, p_external_id, p_meeting_location
     )
     RETURNING id INTO v_booking_id;
  END IF;

  -- 3. Return Success
  RETURN json_build_object('success', true, 'booking_id', v_booking_id);

END;
$$;


ALTER FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" timestamp with time zone, "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text", "p_meeting_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_member_rewards_backup"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  insert into public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level, last_activity_date
  ) values (
    new.id, 0, 0, 100, 'bronze', now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."create_member_rewards_backup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_member_rewards_simple"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.member_rewards (user_id, points_earned, points_spent, points_balance, tier_level)
  VALUES (NEW.id, 0, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer la création d'utilisateur si jamais ça échoue
    RAISE NOTICE 'member_rewards insert skipped: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_member_rewards_simple"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partner_payout"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  offer_category uuid;
  commission_rate numeric;
  custom_rate numeric;
  gross numeric;
  commission numeric;
  net numeric;
begin
  -- Récupérer la catégorie et le taux custom de l'offre
  select category_id, custom_commission_rate
  into offer_category, custom_rate
  from offers
  where id = new.offer_id;

  -- Déterminer le prix payé
  if new.price_paid is not null then
    gross := new.price_paid;
  else
    select op.amount
    into gross
    from offer_prices op
    where op.offer_id = new.offer_id
    limit 1;
  end if;

  if gross is null then
    return new;
  end if;

  -- Déterminer le taux de commission
  if custom_rate is not null then
    commission_rate := custom_rate;
  else
    select commission_rate
    into commission_rate
    from offer_categories
    where id = offer_category;
  end if;

  -- Calculs
  commission := gross * commission_rate;
  net := gross - commission;

  -- Insertion du reversement
  insert into partner_payouts (partner_id, gross_amount, commission_amount, net_amount, status, created_at)
  values (new.partner_id, gross, commission, net, 'pending', now());

  return new;
end;
$$;


ALTER FUNCTION "public"."create_partner_payout"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_payout_on_confirm"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  offer_price numeric;
  payout_amount numeric;
begin
  -- Vérifier si le statut passe bien à confirmed
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    -- Récupérer un prix de référence de l'offre (premier prix trouvé)
    select p.price into offer_price
    from offer_prices p
    where p.offer_id = new.offer_id
    limit 1;

    if offer_price is null then
      -- fallback si pas de prix trouvé → 0
      offer_price := 0;
    end if;

    -- Calcul du montant partenaire (80% → Nowme prend 20%)
    payout_amount := offer_price * 0.8;

    -- Créer une ligne dans partner_payouts
    insert into partner_payouts (partner_id, amount, status, booking_id)
    values (new.partner_id, payout_amount, 'pending', new.id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."create_payout_on_confirm"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_test_user"("user_email" "text", "user_password" "text", "first_name" "text", "last_name" "text", "phone" "text", "subscription_type" "text" DEFAULT 'free'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  user_uuid uuid := gen_random_uuid();
  profile_id uuid;
  current_timestamp timestamp with time zone := now();
BEGIN
  -- Désactiver temporairement les triggers pour éviter les problèmes de séquence
  SET session_replication_role = 'replica';
  
  -- 1. Insérer l'utilisateur dans auth.users sans définir confirmed_at
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    user_email,
    extensions.crypt(user_password, extensions.gen_salt('bf')),
    current_timestamp, -- email_confirmed_at (définit confirmed_at indirectement)
    current_timestamp, -- created_at
    current_timestamp, -- updated_at
    '{"provider": "email", "providers": ["email"]}', 
    jsonb_build_object(
      'first_name', first_name,
      'last_name', last_name,
      'phone', phone,
      'subscription_type', subscription_type
    ), 
    false
  );
  
  -- 2. Créer manuellement le profil utilisateur
  INSERT INTO public.user_profiles (
    user_id, first_name, last_name, phone, email, subscription_type
  ) VALUES (
    user_uuid, first_name, last_name, phone, user_email, subscription_type
  )
  RETURNING id INTO profile_id;
  
  -- 3. Créer manuellement les récompenses du membre
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level, last_activity_date
  ) VALUES (
    user_uuid, 0, 0, 100, 'bronze', current_timestamp
  );
  
  -- Réactiver les triggers
  SET session_replication_role = 'origin';
  
  RETURN user_uuid;
END;
$$;


ALTER FUNCTION "public"."create_test_user"("user_email" "text", "user_password" "text", "first_name" "text", "last_name" "text", "phone" "text", "subscription_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  insert into public.user_profiles (user_id, email, subscription_type, first_name)
  values (
    new.id,
    new.email,
    'discovery',
    'Invitée'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_working_test_user"("p_email" "text", "p_password" "text", "p_first_name" "text" DEFAULT 'Test'::"text", "p_last_name" "text" DEFAULT 'User'::"text", "p_phone" "text" DEFAULT '+33612345678'::"text", "p_subscription_type" "text" DEFAULT 'premium'::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
BEGIN
  -- Generate UUID for the new user
  user_uuid := gen_random_uuid();

  -- Insert into auth.users table
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user_uuid, p_email, p_first_name, p_last_name,
    p_phone, 'active', p_subscription_type, now(), now()
  )
  RETURNING id INTO profile_id;

  -- Insert into member_rewards (sans contrainte FK)
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level
  ) VALUES (
    profile_id, 0, 0, 0, 'bronze'
  );

  RETURN 'User created with ID: ' || user_uuid::text || ', Profile ID: ' || profile_id::text;
END;
$$;


ALTER FUNCTION "public"."create_working_test_user"("p_email" "text", "p_password" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_subscription_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount" numeric, "p_description" "text" DEFAULT 'Credit'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_wallet_id uuid;
    v_new_balance numeric;
    v_expires_at timestamptz;
BEGIN
    -- Logic: Set expiry to 6 months from NOW. 
    -- If wallet exists, this extends it. If new, sets it.
    v_expires_at := now() + interval '6 months';

    -- 1. Upsert Wallet
    INSERT INTO public.wallets (user_id, partner_id, balance, expires_at)
    VALUES (p_user_id, p_partner_id, p_amount, v_expires_at)
    ON CONFLICT (user_id, partner_id) 
    DO UPDATE SET 
        balance = public.wallets.balance + EXCLUDED.balance,
        expires_at = v_expires_at, -- Extend validity on top-up
        updated_at = now()
    RETURNING id, balance INTO v_wallet_id, v_new_balance;

    -- 2. Record Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id, type, amount_raw, amount_final, metadata
    ) VALUES (
        v_wallet_id, 'credit', p_amount, p_amount, jsonb_build_object('description', p_description)
    );

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet_id,
        'new_balance', v_new_balance,
        'expires_at', v_expires_at
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount" numeric, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_orders_fill_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Monnaie par défaut
  IF NEW.currency IS NULL THEN
    NEW.currency := 'EUR';
  END IF;

  -- Calcul du total si pas rempli
  IF (NEW.total_amount_cents IS NULL OR NEW.total_amount_cents = 0)
     AND NEW.unit_amount_cents IS NOT NULL
     AND NEW.quantity IS NOT NULL THEN
    NEW.total_amount_cents := NEW.unit_amount_cents * NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."customer_orders_fill_defaults"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount_raw" numeric, "p_description" "text" DEFAULT 'Consommation'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric;
    v_discount_percent integer;
    v_discount_amount numeric;
    v_final_amount numeric;
    v_partner_first_discount integer;
    v_partner_recurring_discount integer;
    v_has_transaction_today boolean;
BEGIN
    SELECT 
        first_visit_discount_percent, 
        recurring_discount_percent
    INTO 
        v_partner_first_discount, 
        v_partner_recurring_discount
    FROM public.partners 
    WHERE id = p_partner_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Partner not found');
    END IF;

    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id AND partner_id = p_partner_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found for this user');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.wallet_transactions t
        JOIN public.wallets w ON w.id = t.wallet_id
        WHERE w.partner_id = p_partner_id 
        AND w.user_id = p_user_id
        AND t.type = 'debit'
        AND t.created_at >= current_date
    ) INTO v_has_transaction_today;
    
    IF v_has_transaction_today THEN
        v_discount_percent := COALESCE(v_partner_recurring_discount, 0);
    ELSE
        v_discount_percent := COALESCE(v_partner_first_discount, 0);
    END IF;

    v_discount_amount := ROUND((p_amount_raw * v_discount_percent / 100.0), 2);
    v_final_amount := p_amount_raw - v_discount_amount;

    IF v_current_balance < v_final_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient balance',
            'required', v_final_amount,
            'balance', v_current_balance
        );
    END IF;

    INSERT INTO public.wallet_transactions (
        wallet_id, type, amount_raw, discount_applied_percent, discount_amount, amount_final, metadata
    ) VALUES (
        v_wallet_id, 'debit', p_amount_raw, v_discount_percent, v_discount_amount, v_final_amount, jsonb_build_object('description', p_description)
    );

    UPDATE public.wallets
    SET balance = balance - v_final_amount, last_transaction_at = now()
    WHERE id = v_wallet_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_current_balance - v_final_amount,
        'discount_applied', v_discount_percent,
        'final_amount', v_final_amount
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount_raw" numeric, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_offer_stock"("offer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.offers
  set stock = stock - 1
  where id = offer_id
    and has_stock = true
    and stock > 0;
end;
$$;


ALTER FUNCTION "public"."decrement_offer_stock"("offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_completely"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
BEGIN
    DELETE FROM auth.identities WHERE user_id = $1;
    DELETE FROM auth.sessions WHERE user_id = $1;
    DELETE FROM auth.mfa_factors WHERE user_id = $1;
    DELETE FROM auth.refresh_tokens WHERE user_id = $1;
    DELETE FROM auth.users WHERE id = $1;
END;
$_$;


ALTER FUNCTION "public"."delete_user_completely"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql_query" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;


ALTER FUNCTION "public"."exec_sql"("sql_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_inconsistent_subscription_statuses"() RETURNS TABLE("user_id" "uuid", "email" "text", "db_status" "text", "stripe_subscription_id" "text", "last_webhook_event_type" "text", "last_webhook_event_time" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH last_events AS (
    SELECT 
      customer_email,
      subscription_id,
      event_type,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY customer_email ORDER BY created_at DESC) AS rn
    FROM public.stripe_webhook_events
    WHERE customer_email IS NOT NULL
  )
  SELECT 
    up.id AS user_id,
    up.email,
    up.subscription_status AS db_status,
    up.stripe_subscription_id,
    le.event_type AS last_webhook_event_type,
    le.created_at AS last_webhook_event_time
  FROM public.user_profiles up
  LEFT JOIN last_events le ON le.customer_email = up.email AND le.rn = 1
  WHERE 
    (up.subscription_status = 'active' AND le.event_type = 'customer.subscription.deleted')
    OR
    (up.subscription_status = 'cancelled' AND le.event_type = 'checkout.session.completed' AND le.created_at > now() - interval '30 days')
    OR
    (up.subscription_status = 'cancelled' AND le.event_type = 'invoice.payment_succeeded' AND le.created_at > now() - interval '30 days');
$$;


ALTER FUNCTION "public"."find_inconsistent_subscription_statuses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_bookings_set_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- S'assurer d'une valeur par défaut
  IF NEW.currency IS NULL THEN
    NEW.currency := 'eur';
  END IF;

  -- Calculer total si unit et quantité sont présents
  IF NEW.unit_amount_cents IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.total_amount_cents := NEW.unit_amount_cents * NEW.quantity;
  END IF;

  -- Toujours maj updated_at
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_bookings_set_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_insert_partner_payout_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_commission_rate NUMERIC;
  v_total INT;
  v_commission INT;
  v_partner_earnings INT;
  v_partner_payout_id UUID;
BEGIN
  -- Vérifier que le booking est payé
  IF NEW.status = 'paid' THEN
    -- Récupérer le taux de commission du partenaire
    SELECT commission_rate
    INTO v_commission_rate
    FROM partners
    WHERE id = NEW.partner_id;

    -- Calcul du total
    v_total := COALESCE(NEW.total_amount_cents, NEW.unit_amount_cents * NEW.quantity, 0);
    v_commission := ROUND(v_total * COALESCE(v_commission_rate, 0.2)); -- défaut 20%
    v_partner_earnings := v_total - v_commission;

    -- Créer un partner_payout (entête) si inexistant pour ce partenaire + mois
    INSERT INTO partner_payouts (
      id, partner_id, status, period_start, period_end, created_at
    )
    VALUES (
      gen_random_uuid(),
      NEW.partner_id,
      'pending',
      date_trunc('month', NOW()),
      (date_trunc('month', NOW()) + interval '1 month - 1 day'),
      NOW()
    )
    ON CONFLICT (partner_id, period_start, period_end)
    DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_partner_payout_id;

    -- Insérer ou mettre à jour l’item lié
    INSERT INTO partner_payout_items (
      id, partner_payout_id, booking_id, total_amount_cents,
      commission_cents, partner_earnings_cents, created_at
    )
    VALUES (
      gen_random_uuid(),
      v_partner_payout_id,
      NEW.id,
      v_total,
      v_commission,
      v_partner_earnings,
      NOW()
    )
    ON CONFLICT (partner_payout_id, booking_id)
    DO UPDATE SET
      total_amount_cents = EXCLUDED.total_amount_cents,
      commission_cents = EXCLUDED.commission_cents,
      partner_earnings_cents = EXCLUDED.partner_earnings_cents,
      created_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_insert_partner_payout_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_subscriptions_set_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_subscriptions_set_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_webhook_events_set_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_webhook_events_set_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_monthly_partner_payouts"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_start date := date_trunc('month', now() - interval '1 month')::date;
  v_end   date := (date_trunc('month', now()) - interval '1 day')::date;
  v_log_id uuid;
  v_result jsonb;
BEGIN
  -- Vérif admin / service_role
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING HINT = 'Admin only';
  END IF;

  -- Insérer un log de départ
  INSERT INTO public.partner_payout_jobs_log(period_start, period_end)
  VALUES (v_start, v_end)
  RETURNING id INTO v_log_id;

  BEGIN
    -- Génération réelle (pas dry-run)
    v_result := public.generate_partner_payouts_for_period(v_start, v_end, 'eur', false);

    -- Marquer succès
    UPDATE public.partner_payout_jobs_log
    SET status = 'success',
        result = v_result,
        run_finished_at = now()
    WHERE id = v_log_id;

  EXCEPTION WHEN OTHERS THEN
    -- En cas d’erreur
    UPDATE public.partner_payout_jobs_log
    SET status = 'error',
        error = SQLERRM,
        run_finished_at = now()
    WHERE id = v_log_id;
    RAISE;
  END;
END;
$$;


ALTER FUNCTION "public"."generate_monthly_partner_payouts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_monthly_partner_payouts"("p_ref_date" "date" DEFAULT ((CURRENT_DATE - '1 day'::interval))::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_start date;
  v_end   date;
BEGIN
  -- Mois précédent basé sur p_ref_date
  v_start := date_trunc('month', p_ref_date - INTERVAL '1 month')::date;
  v_end   := (date_trunc('month', p_ref_date)::date - 1);

  RETURN public.generate_partner_payouts_for_period(v_start, v_end, 'eur', false);
END
$$;


ALTER FUNCTION "public"."generate_monthly_partner_payouts"("p_ref_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_partner_payout"("v_partner_id" "uuid", "v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_payout_id UUID;
BEGIN
  -- Create payout header
  INSERT INTO partner_payouts (
    id,
    partner_id,
    status,
    period_start,
    period_end,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_partner_id,
    'pending',
    v_period_start,
    v_period_end,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payout_id;

  -- Insert eligible bookings as items using partners.commission_rate
  INSERT INTO partner_payout_items (
    id,
    partner_payout_id,
    booking_id,
    total_amount_cents,
    commission_cents,
    partner_earnings_cents,
    created_at
  )
  SELECT
    gen_random_uuid(),
    v_payout_id,
    b.id,
    b.total_amount_cents,
    ROUND(b.total_amount_cents * COALESCE(p.commission_rate, 0.2))::int AS commission_cents,
    (b.total_amount_cents - ROUND(b.total_amount_cents * COALESCE(p.commission_rate, 0.2)))::int AS partner_earnings_cents,
    NOW()
  FROM bookings b
  JOIN partners p ON p.id = b.partner_id
  WHERE b.partner_id = v_partner_id
    AND b.status = 'paid'
    AND b.paid_at >= v_period_start
    AND b.paid_at < v_period_end;

  -- Update totals from aggregated items
  UPDATE partner_payouts p_out
  SET
    gross_amount_cents = COALESCE(agg.total_gross, 0),
    commission_amount_cents = COALESCE(agg.total_commission, 0),
    net_amount_cents = COALESCE(agg.total_net, 0),
    updated_at = NOW()
  FROM (
    SELECT
      partner_payout_id,
      SUM(total_amount_cents)     AS total_gross,
      SUM(commission_cents)       AS total_commission,
      SUM(partner_earnings_cents) AS total_net
    FROM partner_payout_items
    WHERE partner_payout_id = v_payout_id
    GROUP BY partner_payout_id
  ) agg
  WHERE p_out.id = agg.partner_payout_id
    AND p_out.id = v_payout_id;

  RETURN v_payout_id;
END;
$$;


ALTER FUNCTION "public"."generate_partner_payout"("v_partner_id" "uuid", "v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_partner_payout_items"("p_partner_payout_id" "uuid", "p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO partner_payout_items (
    partner_payout_id,
    booking_id,
    total_amount_cents,
    commission_cents,
    partner_earnings_cents,
    created_at,
    amount_cents
  )
  SELECT
    p_partner_payout_id,
    b.id,
    b.total_amount_cents,
    ROUND(b.total_amount_cents * COALESCE(p.commission_rate, 0.2))::int,
    (b.total_amount_cents - ROUND(b.total_amount_cents * COALESCE(p.commission_rate, 0.2)))::int,
    now(),
    b.total_amount_cents
  FROM bookings b
  JOIN partners p ON p.id = b.partner_id
  WHERE b.partner_id = p_partner_id
    AND b.status = 'paid'
    AND b.paid_at >= p_period_start
    AND b.paid_at < p_period_end
    AND NOT EXISTS (
      SELECT 1 FROM partner_payout_items pi WHERE pi.booking_id = b.id
    );
END;
$$;


ALTER FUNCTION "public"."generate_partner_payout_items"("p_partner_payout_id" "uuid", "p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_partner_payout_items_for"("p_payout_id" "uuid", "p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_payout public.partner_payouts;
  v_items jsonb := '[]'::jsonb;
  r RECORD;
  v_rate numeric;
  v_booking_cents bigint;
  v_commission_cents bigint;
BEGIN
  -- Vérif admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING HINT = 'Admin only';
  END IF;

  -- Récupération de l’entête
  SELECT * INTO v_payout
  FROM public.partner_payouts
  WHERE id = p_payout_id;

  IF v_payout.id IS NULL THEN
    RAISE EXCEPTION 'payout not found %', p_payout_id;
  END IF;

  -- Boucle sur les bookings du partenaire dans la période
  FOR r IN
    SELECT b.id AS booking_id,
           b.offer_id,
           COALESCE(b.total_amount_cents, b.unit_amount_cents * GREATEST(b.quantity,1)) AS booking_amount_cents,
           COALESCE(o.custom_commission_rate, p.commission_rate, 0.70) AS commission_rate,
           COALESCE(b.currency, v_payout.currency) AS currency
    FROM public.bookings b
    JOIN public.partners p ON p.id = b.partner_id
    LEFT JOIN public.offers o ON o.id = b.offer_id
    WHERE b.partner_id = v_payout.partner_id
      AND b.status = 'paid'
      AND b.paid_at >= v_payout.period_start
      AND b.paid_at <= v_payout.period_end
      AND NOT EXISTS (
        SELECT 1 FROM public.partner_payout_items i
        WHERE i.booking_id = b.id
          AND i.payout_id = p_payout_id
      )
  LOOP
    v_rate := COALESCE(r.commission_rate, 0.70);
    v_booking_cents := COALESCE(r.booking_amount_cents, 0);
    -- commission partenaire = montant * rate
    v_commission_cents := round((v_booking_cents * v_rate)::numeric)::bigint;

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'booking_id', r.booking_id,
      'offer_id', r.offer_id,
      'kind', 'sale',
      'currency', lower(r.currency),
      'booking_amount_cents', v_booking_cents,
      'partner_commission_rate', v_rate,
      'commission_amount_cents', v_commission_cents
    ));
  END LOOP;

  -- Si dry-run, on renvoie juste le JSON
  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'payout_id', p_payout_id,
      'dry_run', true,
      'items', v_items
    );
  END IF;

  -- Sinon on insère les items
  INSERT INTO public.partner_payout_items (
    id, payout_id, booking_id, offer_id, kind, currency,
    booking_amount_cents, partner_commission_rate, commission_amount_cents, created_at
  )
  SELECT
    gen_random_uuid(), p_payout_id,
    (elem->>'booking_id')::uuid,
    (elem->>'offer_id')::uuid,
    (elem->>'kind')::public.partner_payout_item_kind,
    (elem->>'currency')::text,
    (elem->>'booking_amount_cents')::bigint,
    (elem->>'partner_commission_rate')::numeric,
    (elem->>'commission_amount_cents')::bigint,
    now()
  FROM jsonb_array_elements(v_items) AS elem;

  -- Recalcul agrégats
  PERFORM public.recompute_partner_payout_aggregates(p_payout_id);

  RETURN jsonb_build_object(
    'payout_id', p_payout_id,
    'dry_run', false,
    'inserted_count', jsonb_array_length(v_items)
  );
END;
$$;


ALTER FUNCTION "public"."generate_partner_payout_items_for"("p_payout_id" "uuid", "p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_partner_payouts_for_month"("v_year" integer, "v_month" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_period_start timestamptz;
    v_period_end timestamptz;
BEGIN
    -- 1er jour du mois
    v_period_start := make_timestamptz(v_year, v_month, 1, 0, 0, 0);

    -- 1er jour du mois suivant
    v_period_end := (v_period_start + interval '1 month');

    -- Appel de la fonction générique
    PERFORM generate_partner_payouts_for_period(v_period_start, v_period_end);
END;
$$;


ALTER FUNCTION "public"."generate_partner_payouts_for_month"("v_year" integer, "v_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_partner_payouts_for_period"("v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_log_id uuid;
    v_partner RECORD;
    v_count int := 0;
BEGIN
    -- 1. Créer une entrée de log
    INSERT INTO partner_payout_jobs_log (period_start, period_end, status)
    VALUES (v_period_start, v_period_end, 'processing')
    RETURNING id INTO v_log_id;

    -- 2. Boucler sur chaque partenaire
    FOR v_partner IN
        SELECT id FROM partners
    LOOP
        BEGIN
            PERFORM generate_partner_payout(v_partner.id, v_period_start, v_period_end);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- On logge mais on continue avec les autres
            RAISE NOTICE 'Erreur sur partenaire %: %', v_partner.id, SQLERRM;
        END;
    END LOOP;

    -- 3. Mise à jour du log : succès
    UPDATE partner_payout_jobs_log
    SET
        status = 'completed',
        total_payouts = v_count,
        ended_at = now()
    WHERE id = v_log_id;

EXCEPTION WHEN OTHERS THEN
    -- 4. Mise à jour du log : échec global
    UPDATE partner_payout_jobs_log
    SET
        status = 'failed',
        error_message = SQLERRM,
        ended_at = now()
    WHERE id = v_log_id;

    RAISE;
END;
$$;


ALTER FUNCTION "public"."generate_partner_payouts_for_period"("v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_partner_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_partner_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hub_link"("hub_id_input" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    link TEXT;
BEGIN
    -- Only active subscribers
    IF NOT public.is_active_subscriber() THEN
         RAISE EXCEPTION 'Subscription active required';
    END IF;

    SELECT whatsapp_announcement_link INTO link
    FROM public.community_hubs
    WHERE id = hub_id_input;

    RETURN link;
END;
$$;


ALTER FUNCTION "public"."get_hub_link"("hub_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_claims"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT jsonb_build_object('role', (
    SELECT CASE 
      WHEN auth.role() = 'authenticated' THEN 'user'
      WHEN auth.role() = 'service_role' THEN 'admin'
      ELSE 'anonymous'
    END
  ));
$$;


ALTER FUNCTION "public"."get_my_claims"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_clients_secure"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT b.user_id
  FROM bookings b
  WHERE b.partner_id = (SELECT partner_id FROM user_profiles WHERE user_id = auth.uid());
$$;


ALTER FUNCTION "public"."get_my_clients_secure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_partner_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_partner_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_partner_id_secure"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_partner_id_secure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_safe_community_locations"() RETURNS TABLE("user_id" "uuid", "first_name" "text", "photo_url" "text", "safe_latitude" double precision, "safe_longitude" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.first_name,
    up.photo_url,
    -- Add random offset (approx 3-5km)
    -- 1 degree lat ~= 111km. 3km ~= 0.027 deg, 5km ~= 0.045 deg
    -- Formula: original + (random_between_0.027_and_0.045) * (random_direction)
    (up.latitude + (random() * (0.045 - 0.027) + 0.027) * (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END)) as safe_latitude,
    (up.longitude + (random() * (0.045 - 0.027) + 0.027) * (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END)) as safe_longitude
  FROM 
    user_profiles up
  WHERE 
    up.latitude IS NOT NULL 
    AND up.longitude IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."get_safe_community_locations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_squad_link"("squad_id_input" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    link TEXT;
    is_member BOOLEAN;
    squad_creator UUID;
    sub_status TEXT;
BEGIN
    -- Check subscription
    -- Check subscription
    IF NOT public.is_active_subscriber() THEN
        RAISE EXCEPTION 'Subscription active required';
    END IF;

    -- Get squad details
    SELECT whatsapp_temp_link, creator_id INTO link, squad_creator
    FROM public.micro_squads
    WHERE id = squad_id_input;

    -- Check if user is creator
    IF squad_creator = auth.uid() THEN
        RETURN link;
    END IF;

    -- Check if user is member
    SELECT EXISTS (
        SELECT 1 FROM public.squad_members
        WHERE squad_id = squad_id_input AND user_id = auth.uid()
    ) INTO is_member;

    IF is_member THEN
        RETURN link;
    ELSE
        -- Optionally allow viewing if just active? No, user said "reveal link" implies joining first?
        -- "Si une place est libre, la fille clique sur 'Participer' et l'app lui révèle le lien"
        -- This implies joining is prerequisite.
        RETURN NULL; 
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_squad_link"("squad_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("user_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid
  FROM auth.users
  WHERE email = user_email;
  
  RETURN uid; -- Returns NULL if not found
END;
$$;


ALTER FUNCTION "public"."get_user_id_by_email"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_event_counts"() RETURNS TABLE("status" "text", "count" bigint, "last_24h" bigint, "last_7d" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT 
    status,
    COUNT(*) AS count,
    COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') AS last_24h,
    COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS last_7d
  FROM public.stripe_webhook_events
  GROUP BY status
  ORDER BY count DESC;
$$;


ALTER FUNCTION "public"."get_webhook_event_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_webhook_event_type_stats"() RETURNS TABLE("event_type" "text", "total_count" bigint, "success_count" bigint, "failed_count" bigint, "success_rate" numeric, "last_received" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT 
    event_type,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE status = 'completed') AS success_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
    ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS success_rate,
    MAX(created_at) AS last_received
  FROM public.stripe_webhook_events
  GROUP BY event_type
  ORDER BY total_count DESC;
$$;


ALTER FUNCTION "public"."get_webhook_event_type_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_booking_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Vérifie que l’offre a du stock et décrémente
  update offers
  set stock = stock - 1
  where id = new.offer_id
    and has_stock = true
    and stock is not null
    and stock > 0;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_booking_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_checkout_completed"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET 
    subscription_status = 'active',
    stripe_customer_id = customer_id,
    stripe_subscription_id = subscription_id
  WHERE email = customer_email;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_checkout_completed"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_paid_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    payload JSONB;
BEGIN
    -- Check if status is 'paid' AND invoice hasn't been sent yet
    -- We also check TG_OP to be safe, though the trigger definition handles it.
    IF (NEW.status = 'paid' OR NEW.status = 'confirmed') AND (NEW.invoice_sent IS FALSE) THEN
       
       -- Construct payload
       payload := row_to_json(NEW);
       
       -- Call Edge Function
       PERFORM net.http_post(
           url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-confirmation-email',
           headers := jsonb_build_object(
               'Content-Type', 'application/json',
               -- We use a placeholder here. In production, this should be a secure key or rely on network restrictions.
               'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true) -- Attempt to pass context, or use anon key if public
           ),
           body := payload
       );
       
       -- CRITICAL: Update the flag immediately to prevent future triggers
       -- We prefer to do this cleanly. 
       -- WARNING: Updating the row *inside* an AFTER trigger might fire the trigger again if not careful.
       -- But we added the check `(NEW.invoice_sent IS FALSE)`.
       -- When we update to TRUE, the condition `OLD.invoice_sent IS FALSE AND NEW.invoice_sent IS TRUE` might be relevant if checking changes.
       -- But here we check `NEW.invoice_sent IS FALSE`.
       -- So the re-entrant call will verify `NEW.invoice_sent` (which is now TRUE) and skip the block.
       
       UPDATE "public"."bookings"
       SET invoice_sent = TRUE
       WHERE id = NEW.id;
       
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_paid_booking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_partner_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.welcome_sent IS FALSE THEN
        
        PERFORM net.http_post(
            url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-partner-approval-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                -- We assume the Function verifies its own security or we use ANON key with RLS logic if needed
                -- But usually triggers need Service Role.
                -- For now, we will send it without specific Auth and handle security in the function 
                -- or relies on the fact that only internal postgres can call this if network is restricted?
                -- No, Supabase Edge Functions are public.
                -- Let's put a placeholder.
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object('record', row_to_json(NEW))
        );
        
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_partner_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_payment_failed"("event_id" "text", "customer_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET subscription_status = 'payment_failed'
  WHERE stripe_customer_id = customer_id;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_payment_failed"("event_id" "text", "customer_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_payment_succeeded"("event" "json") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Logic to handle the payment succeeded event
    -- You can extract data from the event JSON and update your database accordingly
END;
$$;


ALTER FUNCTION "public"."handle_payment_succeeded"("event" "json") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_payment_succeeded"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET 
    subscription_status = 'active',
    stripe_customer_id = customer_id,
    stripe_subscription_id = subscription_id
  WHERE email = customer_email;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_payment_succeeded"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_stripe_subscription_webhook"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Cette fonction sera appelée automatiquement par le trigger
  -- Pas besoin de logique complexe ici
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_stripe_subscription_webhook"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_subscription_cancellation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Check if the status changed to 'cancelled' (and wasn't already 'cancelled')
    IF (NEW.subscription_status = 'cancelled' AND (OLD.subscription_status IS DISTINCT FROM 'cancelled')) THEN
        
        -- Fetch email from auth.users table
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = NEW.user_id;

        IF user_email IS NOT NULL THEN
            INSERT INTO public.emails (
                to_address,
                subject,
                content,
                status
            )
            VALUES (
                user_email,
                'Tu vas nous manquer... 💔',
                E'<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; color: #333; line-height: 1.6; }
  .btn { display: inline-block; padding: 12px 24px; background-color: #e11d48; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
  .btn:hover { background-color: #be123c; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="container">
    <div class="header">Quel dommage de te voir partir...</div>
    <p>Bonjour ' || COALESCE(NEW.first_name, 'Unknown') || E',</p>
    
    <p>Nous avons bien pris en compte l\'annulation de ton abonnement. Ton accès au Club restera actif jusqu\'à la fin de ta période en cours.</p>
    
    <p>Nous sommes tristes de te voir partir, mais nous respectons ton choix. Pour nous aider à nous améliorer, pourrais-tu prendre 30 secondes pour nous dire pourquoi ?</p>
    
    <a href="https://club.nowme.fr/feedback" class="btn" style="color: white;">Donner mon avis</a>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">On espère te revoir bientôt !<br>L\'équipe Nowme</p>
</div>
</body>
</html>',
                'pending'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_subscription_cancellation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_subscription_created"("event_id" "text", "customer_id" "text", "subscription_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$BEGIN
  -- Mettre à jour un seul utilisateur qui n'a pas encore de stripe_customer_id
  UPDATE user_profiles
  SET 
    stripe_customer_id = customer_id,
    stripe_subscription_id = subscription_id,
    subscription_status = 'pending'
  WHERE id = (
    SELECT id FROM user_profiles WHERE stripe_customer_id IS NULL LIMIT 1
  );

  -- Mettre à jour le statut de l'événement webhook
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE id = event_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur en cas d'échec
    UPDATE stripe_webhook_events
    SET status = 'failed', error = SQLERRM
    WHERE id = event_id;
    RAISE;
END;$$;


ALTER FUNCTION "public"."handle_subscription_created"("event_id" "text", "customer_id" "text", "subscription_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_subscription_created"("customer_id" "text", "subscription_id" "text", "event_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Trouver un utilisateur sans customer_id
  SELECT id INTO target_user_id
  FROM user_profiles
  WHERE stripe_customer_id IS NULL
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur éligible trouvé pour lier l’abonnement Stripe.';
  END IF;

  -- Mise à jour du profil utilisateur
  UPDATE user_profiles
  SET 
    stripe_customer_id = customer_id,
    stripe_subscription_id = subscription_id,
    subscription_status = 'pending'
  WHERE id = target_user_id;

  -- Marquer l’événement comme traité
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE id = event_id;

EXCEPTION
  WHEN OTHERS THEN
    UPDATE stripe_webhook_events
    SET status = 'failed', error = SQLERRM
    WHERE id = event_id;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_subscription_created"("customer_id" "text", "subscription_id" "text", "event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_subscription_deleted"("event_id" "text", "customer_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET subscription_status = 'cancelled'
  WHERE stripe_customer_id = customer_id;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_subscription_deleted"("event_id" "text", "customer_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_active_subscription"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_uuid AND subscription_status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."has_active_subscription"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_variant_stock"("variant_id_input" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.offer_variants
  SET stock = stock + 1
  WHERE id = variant_id_input;
END;
$$;


ALTER FUNCTION "public"."increment_variant_stock"("variant_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_subscriber"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."is_active_subscriber"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = auth.uid()
    and is_admin = true
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_secure"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_admin_secure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_partner"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.partners 
    WHERE user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_partner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_partner"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.user_id = uid
  );
$$;


ALTER FUNCTION "public"."is_partner"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_premium_member"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
    AND subscription_type = 'premium'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."is_premium_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_service_role"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN current_setting('role') = 'service_role';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."is_service_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_standard_user"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN NOT public.is_partner();
END;
$$;


ALTER FUNCTION "public"."is_standard_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_subscription_active"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  is_active BOOLEAN;
BEGIN
  SELECT 
    CASE 
      WHEN subscription_status = 'active' OR subscription_status = 'trial' THEN TRUE
      ELSE FALSE
    END INTO is_active
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(is_active, FALSE);
END;
$$;


ALTER FUNCTION "public"."is_subscription_active"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_profile_to_auth_user"("profile_email" "text", "auth_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Mettre à jour le profil avec le vrai user_id
  UPDATE user_profiles 
  SET user_id = auth_user_id,
      updated_at = now()
  WHERE email = profile_email 
    AND (user_id IS NULL OR user_id != auth_user_id);
  
  -- Retourner true si une ligne a été mise à jour
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."link_profile_to_auth_user"("profile_email" "text", "auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_booking_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into booking_events (booking_id, payload)
  values (new.id, row_to_json(new)::jsonb);
  return new;
end;
$$;


ALTER FUNCTION "public"."log_booking_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_email_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insère une ligne de log seulement si le statut change
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.email_logs (email_id, status, message, created_at)
    VALUES (NEW.id, NEW.status, COALESCE(NEW.error_log, 'Status updated'), now());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_email_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."policy_exists"("table_name" "text", "policy_name" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = table_name  -- Remove lower() to match exact table name
    AND policyname = policy_name
  );
END;
$$;


ALTER FUNCTION "public"."policy_exists"("table_name" "text", "policy_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_partner_payout_totals"("p_payout_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Met à jour à partir des agrégats; si aucun item, remet à 0
  UPDATE partner_payouts p
  SET
    gross_amount_cents      = COALESCE(agg.gross, 0),
    commission_amount_cents = COALESCE(agg.commission, 0),
    net_amount_cents        = COALESCE(agg.net, 0),
    total_gross_cents       = COALESCE(agg.gross, 0),
    total_net_cents         = COALESCE(agg.net, 0),
    updated_at              = NOW()
  FROM (
    SELECT
      partner_payout_id,
      SUM(total_amount_cents)::bigint        AS gross,
      SUM(commission_cents)::bigint          AS commission,
      SUM(partner_earnings_cents)::bigint    AS net
    FROM partner_payout_items
    WHERE partner_payout_id = p_payout_id
    GROUP BY partner_payout_id
  ) AS agg
  WHERE p.id = p_payout_id;

  IF NOT FOUND THEN
    UPDATE partner_payouts
    SET gross_amount_cents = 0,
        commission_amount_cents = 0,
        net_amount_cents = 0,
        total_gross_cents = 0,
        total_net_cents = 0,
        updated_at = NOW()
    WHERE id = p_payout_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."recalc_partner_payout_totals"("p_payout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_partner_payout_aggregates"("p_payout_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  WITH agg AS (
    SELECT
      COUNT(*)::int AS item_count,
      COALESCE(SUM(i.booking_amount_cents)::bigint,0) AS gross_amount_cents,
      COALESCE(SUM(i.commission_amount_cents)::bigint,0) AS commission_amount_cents
    FROM public.partner_payout_items i
    WHERE i.payout_id = p_payout_id
  )
  UPDATE public.partner_payouts p
  SET
    item_count = a.item_count,
    gross_amount_cents = a.gross_amount_cents::int,
    commission_amount_cents = a.commission_amount_cents::int,
    net_amount_cents = (a.gross_amount_cents - a.commission_amount_cents - COALESCE(p.fees_amount_cents,0))::int,
    updated_at = now()
  FROM agg a
  WHERE p.id = p_payout_id;
$$;


ALTER FUNCTION "public"."recompute_partner_payout_aggregates"("p_payout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_partner_payout_totals"("p_payout_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.partner_payouts p SET
    item_count = COALESCE(x.item_count,0),
    gross_amount_cents = COALESCE(x.gross,0),
    commission_amount_cents = COALESCE(x.commission,0),
    fees_amount_cents = COALESCE(x.fees,0),
    net_amount_cents = COALESCE(x.gross,0) - COALESCE(x.fees,0) - COALESCE(x.commission,0),
    updated_at = now()
  FROM (
    SELECT
      i.payout_id,
      COUNT(*) AS item_count,
      SUM(i.booking_amount_cents) AS gross,
      SUM(i.commission_amount_cents) AS commission,
      0::bigint AS fees -- placeholder si tu ajoutes des frais
    FROM public.partner_payout_items i
    WHERE i.payout_id = p_payout_id
    GROUP BY i.payout_id
  ) x
  WHERE p.id = x.payout_id;
END$$;


ALTER FUNCTION "public"."recompute_partner_payout_totals"("p_payout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_all_partner_payouts"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE partner_payouts p
  SET
    gross_amount_cents = COALESCE(sub.items_gross, 0),
    commission_amount_cents = COALESCE(sub.items_comm, 0),
    net_amount_cents = COALESCE(sub.items_net, 0),
    total_gross_cents = COALESCE(sub.items_gross, 0),
    total_net_cents = COALESCE(sub.items_net, 0),
    updated_at = NOW()
  FROM (
    SELECT 
      partner_payout_id,
      SUM(total_amount_cents) AS items_gross,
      SUM(commission_cents) AS items_comm,
      SUM(partner_earnings_cents) AS items_net
    FROM partner_payout_items
    GROUP BY partner_payout_id
  ) sub
  WHERE p.id = sub.partner_payout_id;
END;
$$;


ALTER FUNCTION "public"."refresh_all_partner_payouts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_partner_payouts"("p_payout_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE partner_payouts p
  SET
    gross_amount_cents = COALESCE(sub.items_gross, 0),
    commission_amount_cents = COALESCE(sub.items_comm, 0),
    net_amount_cents = COALESCE(sub.items_net, 0),
    total_gross_cents = COALESCE(sub.items_gross, 0),
    total_net_cents = COALESCE(sub.items_net, 0),
    updated_at = NOW()
  FROM (
    SELECT 
      partner_payout_id,
      SUM(total_amount_cents) AS items_gross,
      SUM(commission_cents) AS items_comm,
      SUM(partner_earnings_cents) AS items_net
    FROM partner_payout_items
    WHERE partner_payout_id = p_payout_id
    GROUP BY partner_payout_id
  ) sub
  WHERE p.id = sub.partner_payout_id;
END;
$$;


ALTER FUNCTION "public"."refresh_partner_payouts"("p_payout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_get_user_by_email"("p_email" "text") RETURNS TABLE("id" "uuid", "email" "text", "created_at" timestamp with time zone, "email_confirmed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at
  FROM 
    auth.users u
  WHERE
    u.email = p_email
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."safe_get_user_by_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_list_users"("p_page" integer DEFAULT 1, "p_per_page" integer DEFAULT 50, "p_email" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "email" "text", "created_at" timestamp with time zone, "email_confirmed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at
  FROM 
    auth.users u
  WHERE
    (p_email IS NULL OR u.email = p_email)
  ORDER BY 
    u.created_at DESC
  LIMIT 
    p_per_page
  OFFSET 
    (p_page - 1) * p_per_page;
END;
$$;


ALTER FUNCTION "public"."safe_list_users"("p_page" integer, "p_per_page" integer, "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_partner_reminders"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    partner_record RECORD;
    reminder_count INT := 0;
BEGIN
    -- Find partners created between 5 and 6 days ago (Day 5 target), who are not fully established
    -- "Not fully established" = No user_profile linked AND reminder_sent is FALSE
    
    FOR partner_record IN 
        SELECT p.id, p.contact_email, p.business_name, p.contact_name
        FROM public.partners p
        LEFT JOIN public.user_profiles up ON p.id = up.partner_id
        WHERE up.id IS NULL 
        AND p.reminder_sent IS FALSE
        AND p.created_at >= now() - interval '6 days'
        AND p.created_at <= now() - interval '5 days'
    LOOP
        -- Trigger Edge Function for each partner
        PERFORM net.http_post(
            url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-partner-expiration-reminder',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object('record', row_to_json(partner_record))
        );
        
        -- Update local flag immediately (though Edge Fn also does it, this prevents double send if job re-runs quickly)
        UPDATE public.partners SET reminder_sent = TRUE WHERE id = partner_record.id;
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Sent % reminders', reminder_count;
END;
$$;


ALTER FUNCTION "public"."send_partner_reminders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_partner_payout_items"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_partner_payout_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_subscriptions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_subscriptions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_partner_payout_items_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_payout_id uuid;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    v_payout_id := NEW.payout_id;
  ELSE
    v_payout_id := OLD.payout_id;
  END IF;

  IF v_payout_id IS NOT NULL THEN
    PERFORM public.recompute_partner_payout_totals(v_payout_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END$$;


ALTER FUNCTION "public"."trg_fn_partner_payout_items_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_payout_items_refresh"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM refresh_partner_payouts(
    COALESCE(NEW.partner_payout_id, OLD.partner_payout_id)
  );
  RETURN NULL; -- AFTER triggers peuvent retourner NULL
END; $$;


ALTER FUNCTION "public"."trg_payout_items_refresh"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_recompute_partner_payout_aggregates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recompute_partner_payout_aggregates(NEW.payout_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.payout_id IS DISTINCT FROM OLD.payout_id THEN
      IF OLD.payout_id IS NOT NULL THEN
        PERFORM public.recompute_partner_payout_aggregates(OLD.payout_id);
      END IF;
      IF NEW.payout_id IS NOT NULL THEN
        PERFORM public.recompute_partner_payout_aggregates(NEW.payout_id);
      END IF;
    ELSE
      PERFORM public.recompute_partner_payout_aggregates(NEW.payout_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_partner_payout_aggregates(OLD.payout_id);
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trg_recompute_partner_payout_aggregates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_partner_payout"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_payout_id uuid;
BEGIN
  v_payout_id := COALESCE(NEW.partner_payout_id, OLD.partner_payout_id);
  IF v_payout_id IS NOT NULL THEN
    PERFORM refresh_partner_payouts(v_payout_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_refresh_partner_payout"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
      BEGIN
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION "public"."trg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_send_confirmation_email"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check status transition
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid') THEN
     
     -- Direct call to Edge Function using pg_net
     -- We use the anon key or a dedicated key.
     -- Note: For this to work, you must replace PROJECT_REF and ANON_KEY/SERVICE_KEY
     -- For now, I will use a placeholder and ask User to verify or rely on the Trigger created via Dashboard if this fails.
     -- HOWEVER, Supabase provides `supabase_functions` schema often.
     
     -- Let's try the safest path: logging the event and assuming `pg_net` is configured.
     -- We'll use a direct net.http_post to the function URL.
     
     PERFORM net.http_post(
        url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-confirmation-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer CONSTANT_OR_ENV_VAR"}', -- This is the hard part in SQL
        body := row_to_json(NEW)::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_send_confirmation_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bookings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_bookings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_challenge_participants"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_challenges 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_challenges 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_challenge_participants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_participants"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE club_events 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE club_events 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_event_participants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_masterclass_participants"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE masterclasses 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.masterclass_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE masterclasses 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.masterclass_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_masterclass_participants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_partner_payout_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.partner_payouts p
  SET
    total_gross_cents = COALESCE((
      SELECT SUM(gross_amount_cents)
      FROM public.partner_payout_items i
      WHERE i.partner_payout_id = p.id
    ), 0),
    total_net_cents = COALESCE((
      SELECT SUM(net_amount_cents)
      FROM public.partner_payout_items i
      WHERE i.partner_payout_id = p.id
    ), 0),
    updated_at = now()
  WHERE p.id = NEW.partner_payout_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_partner_payout_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_plans_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_plans_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Updates the updated_at timestamp when a row is modified';



CREATE OR REPLACE FUNCTION "public"."update_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Mettre à jour les métadonnées de l'utilisateur
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.partners 
        WHERE user_id = NEW.user_id
      ) THEN 
        jsonb_set(
          COALESCE(raw_app_meta_data, '{}'::jsonb),
          '{role}',
          '"partner"'
        )
      ELSE 
        jsonb_set(
          COALESCE(raw_app_meta_data, '{}'::jsonb),
          '{role}',
          '"subscriber"'
        )
    END
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_role"() IS 'Met à jour le rôle utilisateur dans auth.users.raw_app_meta_data';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."partner_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "currency" "text" DEFAULT 'EUR'::"text",
    "notes" "text",
    "gross_amount_cents" integer,
    "commission_amount_cents" integer,
    "net_amount_cents" integer,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "item_count" integer DEFAULT 0 NOT NULL,
    "fees_amount_cents" bigint DEFAULT 0 NOT NULL,
    "generated_at" timestamp with time zone,
    "finalized_at" timestamp with time zone,
    "payout_reference" "text",
    "stripe_transfer_id" "text",
    "status" "public"."partner_payout_status" DEFAULT 'draft'::"public"."partner_payout_status" NOT NULL
);


ALTER TABLE "public"."partner_payouts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_partner_payout_header"("p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_currency" "text", "p_finalize" boolean DEFAULT false) RETURNS "public"."partner_payouts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_payout public.partner_payouts;
BEGIN
  -- Vérif admin / service_role
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING HINT = 'Admin only';
  END IF;

  -- Normaliser la devise
  p_currency := lower(p_currency);

  -- Tentative d'insertion
  INSERT INTO public.partner_payouts AS p (
    id, partner_id, period_start, period_end, currency,
    status, created_at, updated_at,
    item_count, gross_amount_cents, commission_amount_cents, net_amount_cents, fees_amount_cents,
    generated_at, finalized_at
  )
  VALUES (
    gen_random_uuid(), p_partner_id, p_period_start, p_period_end, p_currency,
    CASE WHEN p_finalize THEN 'finalized'::public.partner_payout_status ELSE 'draft'::public.partner_payout_status END,
    now(), now(),
    0, 0, 0, 0, 0,
    now(), CASE WHEN p_finalize THEN now() ELSE NULL END
  )
  ON CONFLICT (partner_id, period_start, period_end, currency)
  DO UPDATE
  SET updated_at = now()
  RETURNING * INTO v_payout;

  RETURN v_payout;
END;
$$;


ALTER FUNCTION "public"."upsert_partner_payout_header"("p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_currency" "text", "p_finalize" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_coordinates"() RETURNS "trigger"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.coordinates IS NOT NULL THEN
    -- Vérifier que les coordonnées sont dans des limites raisonnables pour l'Île-de-France
    IF (NEW.coordinates[0] < 48.1 OR NEW.coordinates[0] > 49.2 OR
        NEW.coordinates[1] < 1.4 OR NEW.coordinates[1] > 3.5) THEN
      RAISE EXCEPTION 'Les coordonnées doivent être dans la région Île-de-France';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_coordinates"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_coordinates"() IS 'Validates that coordinates are within Île-de-France region';



CREATE TABLE IF NOT EXISTS "public"."__supabase_migrations" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "applied_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."__supabase_migrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."__supabase_migrations" IS 'Table for tracking database migrations';



CREATE SEQUENCE IF NOT EXISTS "public"."__supabase_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."__supabase_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."__supabase_migrations_id_seq" OWNED BY "public"."__supabase_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."admin_newsletters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "scheduled_at" timestamp with time zone NOT NULL,
    "sent_at" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "target_filter" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."admin_newsletters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ambassador_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "location" "text" NOT NULL,
    "phone" "text",
    "availability_hours_per_week" integer NOT NULL,
    "motivation_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "ambassador_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."ambassador_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "excerpt" "text",
    "content" "text",
    "cover_image" "text",
    "category" "text",
    "author_name" "text" DEFAULT 'Team NowMe'::"text",
    "location_tags" "text"[] DEFAULT '{}'::"text"[],
    "published_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'published'::"text"
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "offer_id" "uuid",
    "booking_date" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "calendly_event_id" "text",
    "customer_email" "text",
    "external_id" "text",
    "source" "text" DEFAULT 'calendly'::"text",
    "partner_id" "uuid",
    "amount" numeric(10,2) DEFAULT 0,
    "currency" "text" DEFAULT 'EUR'::"text",
    "variant_id" "uuid",
    "feedback_email_sent_at" timestamp with time zone,
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "payment_intent_id" "text",
    "scheduled_at" timestamp with time zone,
    "meeting_location" "text",
    "cancelled_by_partner" boolean DEFAULT false,
    "penalty_amount" numeric DEFAULT 0,
    "invoice_sent" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON TABLE "public"."bookings" IS 'Bookings data';



COMMENT ON COLUMN "public"."bookings"."scheduled_at" IS 'The actual date/time of the appointment (e.g. from Calendly)';



COMMENT ON COLUMN "public"."bookings"."meeting_location" IS 'The address or link for the appointment (synced from Calendly)';



COMMENT ON COLUMN "public"."bookings"."updated_at" IS 'Timestamp of the last update to the booking';



CREATE TABLE IF NOT EXISTS "public"."cgp_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version_number" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT false
);


ALTER TABLE "public"."cgp_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_date" timestamp with time zone,
    CONSTRAINT "community_content_type_check" CHECK (("type" = ANY (ARRAY['announcement'::"text", 'kiff'::"text"])))
);


ALTER TABLE "public"."community_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_hubs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "city" "text",
    "whatsapp_announcement_link" "text",
    "is_read_only" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_hubs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "suggestion_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "stripe_customer_id" "text",
    "is_admin" boolean DEFAULT false,
    "partner_id" "uuid",
    "birth_date" "date",
    "acquisition_source" "text",
    "signup_goal" "text",
    "sub_auto_recap" boolean DEFAULT true,
    "sub_newsletter" boolean DEFAULT true,
    "selected_plan" "text",
    "signup_reminder_sent" boolean DEFAULT false,
    "reminder_step" integer DEFAULT 0,
    "last_reminder_sent_at" timestamp with time zone,
    "subscription_status" "text" DEFAULT 'inactive'::"text",
    "subscription_type" "text" DEFAULT 'monthly'::"text",
    "stripe_subscription_id" "text",
    "subscription_updated_at" timestamp with time zone,
    "terms_accepted_at" timestamp with time zone,
    "latitude" double precision,
    "longitude" double precision,
    "delivery_address" "text",
    "accepted_community_rules_at" timestamp with time zone,
    "whatsapp_number" "text",
    "is_ambassador" boolean DEFAULT false,
    "ambassador_start_date" timestamp with time zone,
    "ambassador_last_reminder_at" timestamp with time zone
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."stripe_customer_id" IS 'Stripe customer ID for the user';



COMMENT ON COLUMN "public"."user_profiles"."sub_auto_recap" IS 'User preference for receiving the weekly automated recap (Le Récap des Kiffs)';



COMMENT ON COLUMN "public"."user_profiles"."sub_newsletter" IS 'User preference for receiving the editorial newsletter (La Newsletter du Kiff)';



COMMENT ON COLUMN "public"."user_profiles"."ambassador_start_date" IS 'Date when the current ambassador mandate started (or was last renewed).';



COMMENT ON COLUMN "public"."user_profiles"."ambassador_last_reminder_at" IS 'Date when the last 5.5-month validity reminder was sent.';



CREATE OR REPLACE VIEW "public"."current_user_admin" AS
 SELECT "up"."user_id",
    "up"."is_admin",
    "u"."email"
   FROM ("public"."user_profiles" "up"
     JOIN "auth"."users" "u" ON (("u"."id" = "up"."user_id")))
  WHERE ("up"."user_id" = "auth"."uid"());


ALTER TABLE "public"."current_user_admin" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_email" "text" NOT NULL,
    "partner_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_payment_id" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_cents" integer,
    "status" "text"
);


ALTER TABLE "public"."customer_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_id" "uuid",
    "status" "text" NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "to_address" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_retry_at" timestamp without time zone,
    "retry_count" integer DEFAULT 0,
    "last_retry" timestamp with time zone,
    "error_log" "text",
    CONSTRAINT "emails_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"]))),
    CONSTRAINT "emails_to_address_check" CHECK (("to_address" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."emails" IS 'Table de suivi des emails envoyés';



COMMENT ON COLUMN "public"."emails"."to_address" IS 'Adresse email du destinataire';



COMMENT ON COLUMN "public"."emails"."subject" IS 'Sujet de l''email';



COMMENT ON COLUMN "public"."emails"."content" IS 'Contenu de l''email';



COMMENT ON COLUMN "public"."emails"."status" IS 'Statut de l''email (pending, sent, failed)';



COMMENT ON COLUMN "public"."emails"."error" IS 'Message d''erreur en cas d''échec';



COMMENT ON COLUMN "public"."emails"."sent_at" IS 'Date et heure d''envoi';



COMMENT ON COLUMN "public"."emails"."created_at" IS 'Date et heure de création';



COMMENT ON COLUMN "public"."emails"."next_retry_at" IS 'Date de la prochaine tentative';



COMMENT ON COLUMN "public"."emails"."retry_count" IS 'Nombre de tentatives d''envoi';



COMMENT ON COLUMN "public"."emails"."last_retry" IS 'Date de la dernière tentative';



COMMENT ON COLUMN "public"."emails"."error_log" IS 'Message d''erreur de la dernière tentative';



CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "category" "text" NOT NULL,
    "rating" integer,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "stripe_invoice_id" "text",
    "amount" numeric(10,2) NOT NULL,
    "pdf_url" "text",
    "type" "public"."invoice_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."micro_squads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hub_id" "uuid",
    "creator_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "date_event" timestamp with time zone NOT NULL,
    "max_participants" integer DEFAULT 8,
    "whatsapp_temp_link" "text",
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_official" boolean DEFAULT false,
    CONSTRAINT "micro_squads_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'full'::"text", 'finished'::"text"])))
);


ALTER TABLE "public"."micro_squads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migrations" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."migrations_id_seq" OWNED BY "public"."migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."newsletter_subscribers" (
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "source" "text" DEFAULT 'website'::"text"
);


ALTER TABLE "public"."newsletter_subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_name" "text",
    "parent_slug" "text",
    "slug" "text"
);


ALTER TABLE "public"."offer_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_id" "uuid",
    "url" "text" NOT NULL,
    "type" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "offer_media_type_check" CHECK (("type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."offer_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric NOT NULL,
    "discounted_price" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "stock" integer DEFAULT 0,
    "credit_amount" numeric(10,2) DEFAULT NULL::numeric,
    CONSTRAINT "offer_prices_check" CHECK ((("discounted_price" >= (0)::numeric) AND ("discounted_price" <= "price"))),
    CONSTRAINT "offer_prices_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."offer_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "coordinates" "point",
    "status" "public"."offer_status" DEFAULT 'draft'::"public"."offer_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_approved" boolean DEFAULT true,
    "calendly_url" "text",
    "category_id" "uuid",
    "commission_rate" numeric,
    "event_start_date" timestamp with time zone,
    "event_end_date" timestamp with time zone,
    "street_address" "text",
    "zip_code" "text",
    "department" "text",
    "city" "text",
    "image_url" "text",
    "booking_type" "text" DEFAULT 'calendly'::"text",
    "external_link" "text",
    "promo_code" "text",
    "cancellation_conditions" "text" DEFAULT 'Strict (Non remboursable)'::"text",
    "duration" integer DEFAULT 60,
    "cancellation_policy" "public"."cancellation_policy" DEFAULT 'flexible'::"public"."cancellation_policy" NOT NULL,
    "digital_product_file" "text",
    "is_online" boolean DEFAULT false,
    "service_zones" "jsonb" DEFAULT '[]'::"jsonb",
    "promo_conditions" "text",
    "duration_type" "text" DEFAULT 'lifetime'::"text",
    "validity_start_date" timestamp with time zone,
    "validity_end_date" timestamp with time zone,
    "is_official" boolean DEFAULT false,
    "installment_options" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "offers_booking_type_check" CHECK (("booking_type" = ANY (ARRAY['calendly'::"text", 'event'::"text", 'promo'::"text", 'purchase'::"text", 'wallet_pack'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."offers"."image_url" IS 'Public URL of the offer cover image';



COMMENT ON COLUMN "public"."offers"."booking_type" IS 'Type of booking: calendly, event (fixed date), or promo (external link)';



COMMENT ON COLUMN "public"."offers"."external_link" IS 'URL for external booking or promo offer';



COMMENT ON COLUMN "public"."offers"."promo_code" IS 'Promo code to display to the user';



COMMENT ON COLUMN "public"."offers"."cancellation_policy" IS 'flexible: 24h, moderate: 7 days, strict: 15 days, non_refundable: never';



COMMENT ON COLUMN "public"."offers"."service_zones" IS 'Array of served departments with fees: [{code: "75", fee: 10}, ...]';



COMMENT ON COLUMN "public"."offers"."installment_options" IS 'Array of allowed installment plans: 2x, 3x, 4x';



CREATE TABLE IF NOT EXISTS "public"."partner_cgp_acceptance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid",
    "cgp_version_id" "uuid",
    "accepted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."partner_cgp_acceptance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "read_status" boolean DEFAULT false,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text"
);


ALTER TABLE "public"."partner_notifications" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_payouts_summary" AS
 SELECT "p"."id",
    "p"."partner_id",
    "p"."status",
    "p"."period_start",
    "p"."period_end",
    "p"."currency",
    "p"."item_count",
    "p"."gross_amount_cents",
    "p"."commission_amount_cents",
    "p"."fees_amount_cents",
    "p"."net_amount_cents",
    "p"."generated_at",
    "p"."finalized_at",
    "p"."paid_at",
    "p"."payout_reference",
    "p"."stripe_transfer_id",
    "p"."created_at",
    "p"."updated_at"
   FROM "public"."partner_payouts" "p";


ALTER TABLE "public"."partner_payouts_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_name" "text",
    "contact_name" "text",
    "phone" "text",
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "logo_url" "text",
    "address" "text",
    "coordinates" "point",
    "social_media" "jsonb" DEFAULT '{}'::"jsonb",
    "opening_hours" "jsonb" DEFAULT '{}'::"jsonb",
    "calendly_url" "text",
    "stripe_account_id" "text",
    "payout_iban" "text",
    "contact_email" "text",
    "status" "public"."partner_status" DEFAULT 'pending'::"public"."partner_status" NOT NULL,
    "admin_notes" "text",
    "instagram" "text",
    "facebook" "text",
    "siret" "text",
    "commission_rate" numeric(10,2) DEFAULT 15 NOT NULL,
    "payout_method" "public"."payout_method" DEFAULT 'manual'::"public"."payout_method" NOT NULL,
    "settlement_day" integer DEFAULT 5 NOT NULL,
    "message" "text",
    "calendly_token" "text",
    "welcome_sent" boolean DEFAULT false,
    "notification_settings" "jsonb" DEFAULT '{"marketing": false, "new_booking": true, "booking_reminder": true, "booking_cancellation": true}'::"jsonb",
    "tva_intra" "text",
    "stripe_charges_enabled" boolean DEFAULT false,
    "reminder_sent" boolean DEFAULT false,
    "pending_penalties" numeric DEFAULT 0,
    "terms_accepted_at" timestamp with time zone,
    "user_id" "uuid",
    "cover_image_url" "text",
    "is_wallet_enabled" boolean DEFAULT false,
    "first_visit_discount_percent" integer DEFAULT 0,
    "recurring_discount_percent" integer DEFAULT 0,
    "pin_code_hash" "text",
    CONSTRAINT "partners_status_check" CHECK (("status" = ANY (ARRAY['pending'::"public"."partner_status", 'approved'::"public"."partner_status", 'rejected'::"public"."partner_status"])))
);


ALTER TABLE "public"."partners" OWNER TO "postgres";


COMMENT ON COLUMN "public"."partners"."business_name" IS 'Nom de l''entreprise - requis après approbation';



COMMENT ON COLUMN "public"."partners"."contact_name" IS 'Nom du contact - requis pour la demande initiale';



COMMENT ON COLUMN "public"."partners"."phone" IS 'Téléphone - requis pour la demande initiale';



COMMENT ON COLUMN "public"."partners"."website" IS 'Site web - optionnel';



COMMENT ON COLUMN "public"."partners"."description" IS 'Description commerciale (Pourquoi vous allez kiffer)';



COMMENT ON COLUMN "public"."partners"."logo_url" IS 'URL du logo - à compléter après approbation';



COMMENT ON COLUMN "public"."partners"."address" IS 'Adresse complète - à compléter après approbation';



COMMENT ON COLUMN "public"."partners"."coordinates" IS 'Coordonnées géographiques (latitude, longitude)';



COMMENT ON COLUMN "public"."partners"."social_media" IS 'Réseaux sociaux (JSON) - optionnel';



COMMENT ON COLUMN "public"."partners"."opening_hours" IS 'Horaires d''ouverture (JSON) - à compléter après approbation';



COMMENT ON COLUMN "public"."partners"."stripe_account_id" IS 'ID compte Stripe - configuré après approbation';



COMMENT ON COLUMN "public"."partners"."payout_iban" IS 'IBAN pour les paiements - configuré après approbation';



COMMENT ON COLUMN "public"."partners"."contact_email" IS 'Email du contact - requis pour la demande initiale';



COMMENT ON COLUMN "public"."partners"."status" IS 'Statut: pending (en attente), approved (approuvé), rejected (rejeté)';



COMMENT ON COLUMN "public"."partners"."siret" IS 'SIRET - à compléter après approbation';



COMMENT ON COLUMN "public"."partners"."message" IS 'Message de demande initiale';



COMMENT ON COLUMN "public"."partners"."notification_settings" IS 'Stores partner email notification preferences';



CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount_raw" numeric(10,2) NOT NULL,
    "discount_applied_percent" integer DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "amount_final" numeric(10,2) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "wallet_transactions_type_check" CHECK (("type" = ANY (ARRAY['credit'::"text", 'debit'::"text"])))
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "last_transaction_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    CONSTRAINT "wallets_balance_check" CHECK (("balance" >= (0)::numeric))
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_revenue_report" AS
 SELECT "p"."id" AS "partner_id",
    "p"."business_name",
    COALESCE("sum"(
        CASE
            WHEN ("t"."type" = 'credit'::"text") THEN "t"."amount_final"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_credits_purchased",
    COALESCE("sum"(
        CASE
            WHEN ("t"."type" = 'debit'::"text") THEN "t"."amount_final"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_consumed",
    "count"(DISTINCT "w"."user_id") AS "active_wallet_users"
   FROM (("public"."partners" "p"
     LEFT JOIN "public"."wallets" "w" ON (("w"."partner_id" = "p"."id")))
     LEFT JOIN "public"."wallet_transactions" "t" ON (("t"."wallet_id" = "w"."id")))
  GROUP BY "p"."id", "p"."business_name";


ALTER TABLE "public"."partner_revenue_report" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_installments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "status" "public"."installment_status" DEFAULT 'pending'::"public"."installment_status" NOT NULL,
    "stripe_invoice_id" "text",
    "stripe_payment_intent_id" "text",
    "paid_at" timestamp with time zone,
    "attempt_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_installments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_type" "public"."payment_plan_type" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "status" "public"."payment_plan_status" DEFAULT 'active'::"public"."payment_plan_status" NOT NULL,
    "stripe_schedule_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "total_amount_collected" numeric(10,2) DEFAULT 0 NOT NULL,
    "commission_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "commission_tva" numeric(10,2) DEFAULT 0 NOT NULL,
    "net_payout_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    "statement_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stripe_transfer_id" "text",
    CONSTRAINT "payouts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refund_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_requested" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    CONSTRAINT "refund_requests_amount_requested_check" CHECK (("amount_requested" > (0)::numeric))
);


ALTER TABLE "public"."refund_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."region_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "region" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notified" boolean DEFAULT false,
    CONSTRAINT "region_requests_email_check" CHECK (("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))
);


ALTER TABLE "public"."region_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."region_requests" IS 'Requests for Nowme availability in new regions';



COMMENT ON COLUMN "public"."region_requests"."email" IS 'Email address to notify when service becomes available';



COMMENT ON COLUMN "public"."region_requests"."region" IS 'Requested region (department or country)';



COMMENT ON COLUMN "public"."region_requests"."notified" IS 'Whether the user has been notified of availability';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."squad_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "squad_id" "uuid",
    "user_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."squad_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "product_id" "text",
    "price_id" "text",
    "status" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "latest_invoice_id" "text",
    "latest_payment_intent_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_constraints_status" AS
 WITH "fk_info" AS (
         SELECT "c"."conname" AS "constraint_name",
            "rel"."relname" AS "table_name",
            "array_agg"("a"."attname") AS "fk_columns",
            "cl"."relname" AS "referenced_table",
            "pg_get_constraintdef"("c"."oid") AS "definition",
                CASE "c"."confdeltype"
                    WHEN 'c'::"char" THEN 'CASCADE'::"text"
                    WHEN 'r'::"char" THEN 'RESTRICT'::"text"
                    WHEN 'n'::"char" THEN 'SET NULL'::"text"
                    WHEN 'a'::"char" THEN 'NO ACTION'::"text"
                    ELSE ("c"."confdeltype")::"text"
                END AS "on_delete_action"
           FROM ((("pg_constraint" "c"
             JOIN "pg_class" "rel" ON (("rel"."oid" = "c"."conrelid")))
             JOIN "pg_class" "cl" ON (("cl"."oid" = "c"."confrelid")))
             JOIN "pg_attribute" "a" ON ((("a"."attrelid" = "rel"."oid") AND ("a"."attnum" = ANY ("c"."conkey")))))
          WHERE (("c"."contype" = 'f'::"char") AND ("rel"."relnamespace" = ('"public"'::"regnamespace")::"oid"))
          GROUP BY "c"."conname", "rel"."relname", "cl"."relname", "c"."oid", "c"."confdeltype"
        ), "index_info" AS (
         SELECT "t"."relname" AS "table_name",
            "array_agg"("a"."attname") AS "indexed_columns"
           FROM (("pg_index" "i_1"
             JOIN "pg_class" "t" ON (("t"."oid" = "i_1"."indrelid")))
             JOIN "pg_attribute" "a" ON ((("a"."attrelid" = "t"."oid") AND ("a"."attnum" = ANY (("i_1"."indkey")::smallint[])))))
          WHERE (("i_1"."indisvalid" = true) AND ("i_1"."indisready" = true) AND ("t"."relnamespace" = ('"public"'::"regnamespace")::"oid"))
          GROUP BY "t"."relname", "i_1"."indexrelid"
        )
 SELECT "fk"."constraint_name",
    "fk"."table_name",
    "fk"."fk_columns",
    "fk"."referenced_table",
    "fk"."on_delete_action",
    "fk"."definition",
        CASE
            WHEN ("fk"."fk_columns" <@ COALESCE("i"."indexed_columns", '{}'::"name"[])) THEN '✅ Index présent'::"text"
            ELSE '⚠️ Manque index'::"text"
        END AS "index_check"
   FROM ("fk_info" "fk"
     LEFT JOIN "index_info" "i" ON (("fk"."table_name" = "i"."table_name")));


ALTER TABLE "public"."vw_constraints_status" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_rls_status" AS
 SELECT "p"."schemaname",
    "p"."tablename",
    "r"."rolname" AS "role",
    "p"."policyname",
    "p"."permissive",
    "p"."cmd" AS "command",
    "p"."qual" AS "using_expression",
    "p"."with_check" AS "with_check_expression"
   FROM ("pg_policies" "p"
     JOIN "pg_roles" "r" ON (("r"."rolname" = ANY ("p"."roles"))))
  WHERE ("p"."schemaname" = 'public'::"name")
  ORDER BY "p"."tablename", "p"."policyname", "r"."rolname";


ALTER TABLE "public"."vw_rls_status" OWNER TO "postgres";


ALTER TABLE ONLY "public"."__supabase_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."__supabase_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."__supabase_migrations"
    ADD CONSTRAINT "__supabase_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_newsletters"
    ADD CONSTRAINT "admin_newsletters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ambassador_applications"
    ADD CONSTRAINT "ambassador_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cgp_versions"
    ADD CONSTRAINT "cgp_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_content"
    ADD CONSTRAINT "community_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_hubs"
    ADD CONSTRAINT "community_hubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_suggestions"
    ADD CONSTRAINT "community_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."micro_squads"
    ADD CONSTRAINT "micro_squads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."offer_categories"
    ADD CONSTRAINT "offer_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_variants"
    ADD CONSTRAINT "offer_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_cgp_acceptance"
    ADD CONSTRAINT "partner_cgp_acceptance_partner_id_cgp_version_id_key" UNIQUE ("partner_id", "cgp_version_id");



ALTER TABLE ONLY "public"."partner_cgp_acceptance"
    ADD CONSTRAINT "partner_cgp_acceptance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_notifications"
    ADD CONSTRAINT "partner_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_partner_period_key" UNIQUE ("partner_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_installments"
    ADD CONSTRAINT "payment_installments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."region_requests"
    ADD CONSTRAINT "region_requests_email_region_key" UNIQUE ("email", "region");



ALTER TABLE ONLY "public"."region_requests"
    ADD CONSTRAINT "region_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."squad_members"
    ADD CONSTRAINT "squad_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."squad_members"
    ADD CONSTRAINT "squad_members_squad_id_user_id_key" UNIQUE ("squad_id", "user_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_partner_id_key" UNIQUE ("user_id", "partner_id");



CREATE INDEX "idx_bookings_created_at" ON "public"."bookings" USING "btree" ("created_at");



CREATE INDEX "idx_bookings_offer_id" ON "public"."bookings" USING "btree" ("offer_id");



CREATE INDEX "idx_bookings_partner_id" ON "public"."bookings" USING "btree" ("partner_id");



CREATE INDEX "idx_bookings_user_id" ON "public"."bookings" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_variant_id" ON "public"."bookings" USING "btree" ("variant_id");



CREATE INDEX "idx_community_suggestions_user_id" ON "public"."community_suggestions" USING "btree" ("user_id");



CREATE INDEX "idx_customer_orders_partner_id" ON "public"."customer_orders" USING "btree" ("partner_id");



CREATE INDEX "idx_customer_orders_stripe_payment_id" ON "public"."customer_orders" USING "btree" ("stripe_payment_id");



CREATE INDEX "idx_customer_orders_user_id" ON "public"."customer_orders" USING "btree" ("user_id");



CREATE INDEX "idx_emails_next_retry" ON "public"."emails" USING "btree" ("next_retry_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_emails_status" ON "public"."emails" USING "btree" ("status");



CREATE INDEX "idx_emails_to_address" ON "public"."emails" USING "btree" ("to_address");



CREATE INDEX "idx_installments_plan" ON "public"."payment_installments" USING "btree" ("plan_id");



CREATE INDEX "idx_installments_status" ON "public"."payment_installments" USING "btree" ("status");



CREATE INDEX "idx_offer_prices_offer_id" ON "public"."offer_variants" USING "btree" ("offer_id");



CREATE INDEX "idx_offers_category_id" ON "public"."offers" USING "btree" ("category_id");



CREATE INDEX "idx_offers_partner_id" ON "public"."offers" USING "btree" ("partner_id");



CREATE INDEX "idx_offers_status" ON "public"."offers" USING "btree" ("status");



CREATE INDEX "idx_partner_notifications_partner_id" ON "public"."partner_notifications" USING "btree" ("partner_id");



CREATE INDEX "idx_partner_notifications_read_status" ON "public"."partner_notifications" USING "btree" ("read_status");



CREATE INDEX "idx_partner_payouts_partner_id" ON "public"."partner_payouts" USING "btree" ("partner_id");



CREATE INDEX "idx_partner_payouts_partner_period" ON "public"."partner_payouts" USING "btree" ("partner_id", "period_start", "period_end");



CREATE INDEX "idx_partners_id" ON "public"."partners" USING "btree" ("id");



CREATE INDEX "idx_partners_message" ON "public"."partners" USING "gin" ("to_tsvector"('"french"'::"regconfig", "message")) WHERE ("message" IS NOT NULL);



CREATE INDEX "idx_partners_status" ON "public"."partners" USING "btree" ("status");



CREATE INDEX "idx_partners_stripe_account_id" ON "public"."partners" USING "btree" ("stripe_account_id");



CREATE INDEX "idx_partners_user_id" ON "public"."partners" USING "btree" ("user_id");



CREATE INDEX "idx_payment_plans_booking" ON "public"."payment_plans" USING "btree" ("booking_id");



CREATE INDEX "idx_payment_plans_user" ON "public"."payment_plans" USING "btree" ("user_id");



CREATE INDEX "idx_payouts_partner_id" ON "public"."payouts" USING "btree" ("partner_id");



CREATE INDEX "idx_payouts_period_end" ON "public"."payouts" USING "btree" ("period_end");



CREATE INDEX "idx_reviews_offer_id" ON "public"."reviews" USING "btree" ("offer_id");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_user" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_is_admin" ON "public"."user_profiles" USING "btree" ("is_admin");



CREATE INDEX "idx_user_profiles_partner_id" ON "public"."user_profiles" USING "btree" ("partner_id");



CREATE INDEX "idx_user_profiles_stripe_customer_id" ON "public"."user_profiles" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "offer_categories_parent_slug_slug_uniq" ON "public"."offer_categories" USING "btree" (COALESCE("parent_slug", ''::"text"), "slug");



CREATE INDEX "partner_payouts_idx_period" ON "public"."partner_payouts" USING "btree" ("period_start", "period_end");



CREATE UNIQUE INDEX "partners_ux_stripe_account" ON "public"."partners" USING "btree" ("stripe_account_id") WHERE ("stripe_account_id" IS NOT NULL);



CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE UNIQUE INDEX "subscriptions_ux_stripe_sub" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_subscriptions_user_active" ON "public"."subscriptions" USING "btree" ("user_id") WHERE ("status" = ANY (ARRAY['active'::"text", 'trialing'::"text"]));



CREATE OR REPLACE TRIGGER "customer_orders_fill_defaults_biu" BEFORE INSERT OR UPDATE ON "public"."customer_orders" FOR EACH ROW EXECUTE FUNCTION "public"."customer_orders_fill_defaults"();



CREATE OR REPLACE TRIGGER "customer_orders_set_updated_at" BEFORE UPDATE ON "public"."customer_orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "on_booking_paid" AFTER INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_paid_booking"();



CREATE OR REPLACE TRIGGER "on_partner_approved" AFTER UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."handle_partner_approval"();



CREATE OR REPLACE TRIGGER "on_subscription_cancelled" AFTER UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_subscription_cancellation"();



CREATE OR REPLACE TRIGGER "set_subscriber_role" AFTER INSERT OR UPDATE OF "user_id" ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_role"();

ALTER TABLE "public"."user_profiles" DISABLE TRIGGER "set_subscriber_role";



COMMENT ON TRIGGER "set_subscriber_role" ON "public"."user_profiles" IS 'Définit le rôle abonné lors de l''insertion/mise à jour';



CREATE OR REPLACE TRIGGER "t_partners_set_updated" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_customer_orders_updated_at" BEFORE UPDATE ON "public"."customer_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_subscriptions" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_subscriptions"();



CREATE OR REPLACE TRIGGER "trg_subscriptions_set_updated" BEFORE INSERT OR UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_subscriptions_set_updated"();



CREATE OR REPLACE TRIGGER "trg_subscriptions_touch_updated" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_log_email_status_change" AFTER UPDATE ON "public"."emails" FOR EACH ROW EXECUTE FUNCTION "public"."log_email_status_change"();



CREATE OR REPLACE TRIGGER "update_offers_updated_at" BEFORE UPDATE ON "public"."offers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_partners_updated_at" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_installments_updated_at" BEFORE UPDATE ON "public"."payment_installments" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_plans_updated_at"();



CREATE OR REPLACE TRIGGER "update_payment_plans_updated_at" BEFORE UPDATE ON "public"."payment_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_plans_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

ALTER TABLE "public"."user_profiles" DISABLE TRIGGER "update_user_profiles_updated_at";



CREATE OR REPLACE TRIGGER "update_wallets_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_partner_coordinates" BEFORE INSERT OR UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."validate_coordinates"();



ALTER TABLE ONLY "public"."ambassador_applications"
    ADD CONSTRAINT "ambassador_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ambassador_applications"
    ADD CONSTRAINT "ambassador_applications_user_id_fkey_profiles" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."offer_variants"("id") ON UPDATE CASCADE ON DELETE SET NULL;



COMMENT ON CONSTRAINT "bookings_variant_id_fkey" ON "public"."bookings" IS 'Link to offer variant';



ALTER TABLE ONLY "public"."community_suggestions"
    ADD CONSTRAINT "community_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id");



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."micro_squads"
    ADD CONSTRAINT "micro_squads_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."micro_squads"
    ADD CONSTRAINT "micro_squads_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."community_hubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offer_variants"
    ADD CONSTRAINT "offer_prices_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."offer_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."partner_cgp_acceptance"
    ADD CONSTRAINT "partner_cgp_acceptance_cgp_version_id_fkey" FOREIGN KEY ("cgp_version_id") REFERENCES "public"."cgp_versions"("id");



ALTER TABLE ONLY "public"."partner_cgp_acceptance"
    ADD CONSTRAINT "partner_cgp_acceptance_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_notifications"
    ADD CONSTRAINT "partner_notifications_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_installments"
    ADD CONSTRAINT "payment_installments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."payment_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_user_profile_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id");



ALTER TABLE ONLY "public"."squad_members"
    ADD CONSTRAINT "squad_members_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "public"."micro_squads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."squad_members"
    ADD CONSTRAINT "squad_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_partner_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Access All" ON "public"."refund_requests" USING (true);



CREATE POLICY "Active subscribers can create squads" ON "public"."micro_squads" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "creator_id") AND "public"."is_active_subscriber"()));



CREATE POLICY "Active subscribers can join squads" ON "public"."squad_members" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."is_active_subscriber"()));



CREATE POLICY "Admins can delete all profiles" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete any offer" ON "public"."offers" FOR DELETE TO "authenticated" USING ((( SELECT "user_profiles"."is_admin"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())) = true));



CREATE POLICY "Admins can insert hubs" ON "public"."community_hubs" TO "authenticated" USING ((("auth"."jwt"() ->> 'email'::"text") = 'rhodia@nowme.fr'::"text"));



CREATE POLICY "Admins can manage all media" ON "public"."offer_media" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage all payouts" ON "public"."payouts" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



CREATE POLICY "Admins can manage blog posts" ON "public"."blog_posts" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage community_content" ON "public"."community_content" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage newsletters" ON "public"."admin_newsletters" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage payouts" ON "public"."partner_payouts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can perform all actions" ON "public"."user_profiles" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update all offers" ON "public"."offers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update all profiles" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin_secure"());



CREATE POLICY "Admins can update any offer" ON "public"."offers" FOR UPDATE TO "authenticated" USING ((( SELECT "user_profiles"."is_admin"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())) = true)) WITH CHECK ((( SELECT "user_profiles"."is_admin"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())) = true));



CREATE POLICY "Admins can update applications" ON "public"."ambassador_applications" FOR UPDATE TO "authenticated" USING (((( SELECT "user_profiles"."is_admin"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())) = true) OR (("auth"."jwt"() ->> 'email'::"text") = 'rhodia@nowme.fr'::"text")));



CREATE POLICY "Admins can view all applications" ON "public"."ambassador_applications" FOR SELECT TO "authenticated" USING (((( SELECT "user_profiles"."is_admin"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())) = true) OR (("auth"."jwt"() ->> 'email'::"text") = 'rhodia@nowme.fr'::"text")));



CREATE POLICY "Admins can view all feedback" ON "public"."feedback" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



CREATE POLICY "Admins can view all offers" ON "public"."offers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all payment plans" ON "public"."payment_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all profiles" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin_secure"());



CREATE POLICY "Admins can view all refund requests" ON "public"."refund_requests" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ("public"."is_admin_secure"());



CREATE POLICY "Admins can view all suggestions" ON "public"."community_suggestions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view newsletter subscribers" ON "public"."newsletter_subscribers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins manage partners" ON "public"."partners" TO "authenticated" USING ("public"."is_admin_secure"());



CREATE POLICY "Allow authenticated users to delete migrations" ON "public"."__supabase_migrations" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert migrations" ON "public"."__supabase_migrations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read migrations" ON "public"."__supabase_migrations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update migrations" ON "public"."__supabase_migrations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can submit partner application" ON "public"."partners" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Anyone can subscribe to newsletter" ON "public"."newsletter_subscribers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view active CGP versions" ON "public"."cgp_versions" FOR SELECT USING (("active" = true));



CREATE POLICY "Blog posts are public" ON "public"."blog_posts" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "Categories are viewable by everyone" ON "public"."offer_categories" FOR SELECT USING (true);



CREATE POLICY "Creator can update their squads" ON "public"."micro_squads" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Enable insert for everyone" ON "public"."emails" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for everyone" ON "public"."region_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for own submissions" ON "public"."emails" FOR SELECT USING (true);



CREATE POLICY "Hubs are viewable by authenticated users" ON "public"."community_hubs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Members can leave squads" ON "public"."squad_members" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Offer media is viewable by everyone" ON "public"."offer_media" FOR SELECT USING (true);



CREATE POLICY "Partners can delete own offers" ON "public"."offers" FOR DELETE USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can delete their own offer media" ON "public"."offer_media" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."offers"
  WHERE (("offers"."id" = "offer_media"."offer_id") AND ("offers"."partner_id" IN ( SELECT "user_profiles"."partner_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Partners can delete their own offers" ON "public"."offers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."partner_id" = "offers"."partner_id") AND ("up"."user_id" = "auth"."uid"())))));



CREATE POLICY "Partners can insert offers" ON "public"."offers" FOR INSERT WITH CHECK (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can insert their own offers" ON "public"."offers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."partner_id" = "offers"."partner_id")))));



CREATE POLICY "Partners can insert variants for their offers" ON "public"."offer_variants" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."offers" "o"
     JOIN "public"."user_profiles" "up" ON (("up"."partner_id" = "o"."partner_id")))
  WHERE (("o"."id" = "offer_variants"."offer_id") AND ("up"."user_id" = "auth"."uid"())))));



CREATE POLICY "Partners can manage offer variants" ON "public"."offer_variants" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Partners can manage variants for their offers" ON "public"."offer_variants" USING ((EXISTS ( SELECT 1
   FROM ("public"."offers" "o"
     JOIN "public"."user_profiles" "up" ON (("up"."partner_id" = "o"."partner_id")))
  WHERE (("o"."id" = "offer_variants"."offer_id") AND ("up"."user_id" = "auth"."uid"())))));



CREATE POLICY "Partners can record acceptance" ON "public"."partner_cgp_acceptance" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "user_profiles"."user_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."partner_id" = "partner_cgp_acceptance"."partner_id"))));



CREATE POLICY "Partners can update own data" ON "public"."partners" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "user_profiles"."user_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."partner_id" = "partners"."id"))));



CREATE POLICY "Partners can update own notifications" ON "public"."partner_notifications" FOR UPDATE USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can update own offers" ON "public"."offers" FOR UPDATE USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can update their own offers" ON "public"."offers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."partner_id" = "offers"."partner_id")))));



CREATE POLICY "Partners can upload media for their own offers" ON "public"."offer_media" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."offers"
  WHERE (("offers"."id" = "offer_media"."offer_id") AND ("offers"."partner_id" IN ( SELECT "user_profiles"."partner_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Partners can view client profiles" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "public"."get_my_clients_secure"() AS "get_my_clients_secure")));



CREATE POLICY "Partners can view own notifications" ON "public"."partner_notifications" FOR SELECT USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can view own offers" ON "public"."offers" USING (("auth"."uid"() IN ( SELECT "user_profiles"."user_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."partner_id" = "offers"."partner_id"))));



CREATE POLICY "Partners can view own payouts" ON "public"."partner_payouts" FOR SELECT TO "authenticated" USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can view own payouts" ON "public"."payouts" FOR SELECT USING (("partner_id" IN ( SELECT "up"."partner_id"
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."partner_id" IS NOT NULL)))));



CREATE POLICY "Partners can view profiles of their clients" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("public"."get_my_partner_id"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."user_id" = "user_profiles"."user_id") AND ("bookings"."partner_id" = "public"."get_my_partner_id"()))))));



CREATE POLICY "Partners can view their customers' wallets" ON "public"."wallets" FOR SELECT USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can view their own acceptance" ON "public"."partner_cgp_acceptance" FOR SELECT USING (("auth"."uid"() IN ( SELECT "user_profiles"."user_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."partner_id" = "partner_cgp_acceptance"."partner_id"))));



CREATE POLICY "Partners can view their own bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING (("partner_id" = "public"."get_my_partner_id_secure"()));



CREATE POLICY "Partners can view their own offers" ON "public"."offers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."partner_id" = "offers"."partner_id")))));



CREATE POLICY "Partners can view transactions for their wallets" ON "public"."wallet_transactions" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."partner_id" IN ( SELECT "user_profiles"."partner_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Partners delete own media" ON "public"."offer_media" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."offers"
  WHERE (("offers"."id" = "offer_media"."offer_id") AND ("offers"."partner_id" IN ( SELECT "user_profiles"."partner_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Partners manage own data" ON "public"."partners" TO "authenticated" USING (("id" = "public"."get_my_partner_id_secure"()));



CREATE POLICY "Partners manage own media" ON "public"."offer_media" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."offers"
  WHERE (("offers"."id" = "offer_media"."offer_id") AND ("offers"."partner_id" IN ( SELECT "user_profiles"."partner_id"
           FROM "public"."user_profiles"
          WHERE ("user_profiles"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Public can view all offers" ON "public"."offers" FOR SELECT USING (true);



CREATE POLICY "Public can view offer variants" ON "public"."offer_variants" FOR SELECT USING (true);



CREATE POLICY "Public can view partners" ON "public"."partners" FOR SELECT USING (true);



CREATE POLICY "Public offer variants are viewable by everyone" ON "public"."offer_variants" FOR SELECT USING (true);



CREATE POLICY "Public offers are viewable by everyone" ON "public"."offers" FOR SELECT USING (("status" = 'approved'::"public"."offer_status"));



CREATE POLICY "Public offers are viewable by everyone." ON "public"."offers" FOR SELECT USING (true);



CREATE POLICY "Public partners are viewable by everyone" ON "public"."partners" FOR SELECT USING (("status" = 'approved'::"public"."partner_status"));



CREATE POLICY "Public read access" ON "public"."offer_media" FOR SELECT USING (true);



CREATE POLICY "Public read access for offer media" ON "public"."offer_media" FOR SELECT USING (true);



CREATE POLICY "Public read access for offer_variants" ON "public"."offer_variants" FOR SELECT USING (true);



CREATE POLICY "Public view approved partners" ON "public"."partners" FOR SELECT USING (("status" = 'approved'::"public"."partner_status"));



CREATE POLICY "Reviews are public" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Squad members are viewable by authenticated users" ON "public"."squad_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Squads are viewable by authenticated users" ON "public"."micro_squads" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Unified User Profile Access" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can create own refund requests" ON "public"."refund_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own reviews" ON "public"."reviews" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own suggestions" ON "public"."community_suggestions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own applications" ON "public"."ambassador_applications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own feedback" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own reviews" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "reviews"."booking_id") AND ("b"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage own profile" ON "public"."user_profiles" TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own reviews" ON "public"."reviews" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view active content" ON "public"."community_content" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can view own refund requests" ON "public"."refund_requests" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own applications" ON "public"."ambassador_applications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own installments" ON "public"."payment_installments" FOR SELECT USING (("plan_id" IN ( SELECT "payment_plans"."id"
   FROM "public"."payment_plans"
  WHERE ("payment_plans"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own invoices" ON "public"."invoices" FOR SELECT USING (("booking_id" IN ( SELECT "bookings"."id"
   FROM "public"."bookings"
  WHERE ("bookings"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own payment plans" ON "public"."payment_plans" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own transactions" ON "public"."wallet_transactions" FOR SELECT USING (("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own wallets" ON "public"."wallets" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."__supabase_migrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin full access partners" ON "public"."partners" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."admin_newsletters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ambassador_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_insert_own" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "bookings_select_own" ON "public"."bookings" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("partner_id" = "public"."get_my_partner_id"())));



ALTER TABLE "public"."cgp_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_hubs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_orders_admin_all" ON "public"."customer_orders" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "customer_orders_insert_own" ON "public"."customer_orders" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "customer_orders_own" ON "public"."customer_orders" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "customer_orders_select_own" ON "public"."customer_orders" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "customer_orders_service" ON "public"."customer_orders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "customer_orders_service_all" ON "public"."customer_orders" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "customer_orders_service_role" ON "public"."customer_orders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "customer_orders_update_own" ON "public"."customer_orders" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "customer_orders_user_select" ON "public"."customer_orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."micro_squads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offer_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offer_categories_read_all" ON "public"."offer_categories" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."offer_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offer_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_admin_select" ON "public"."customer_orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



CREATE POLICY "orders_user_insert" ON "public"."customer_orders" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "orders_user_select" ON "public"."customer_orders" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."partner_cgp_acceptance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partner_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partner_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_payouts_admin_all" ON "public"."partner_payouts" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "u"
  WHERE (("u"."user_id" = "auth"."uid"()) AND ("u"."is_admin" = true)))));



CREATE POLICY "partner_payouts_service_all" ON "public"."partner_payouts" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_installments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payouts_admin_select" ON "public"."partner_payouts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



CREATE POLICY "read_own_profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."refund_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."region_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."squad_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_select_own" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "subscriptions_service_all" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "update_own_profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_insert_own" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_profiles_select_unified" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (("public"."get_my_partner_id"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."user_id" = "user_profiles"."user_id") AND ("bookings"."partner_id" = "public"."get_my_partner_id"())))))));



CREATE POLICY "user_profiles_update_own" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."wallet_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_payouts_report"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_payouts_report"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_payouts_report"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_payouts_report_by_partner"("partner_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_payouts_report_by_partner"("partner_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_payouts_report_by_partner"("partner_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."am_i_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."am_i_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."am_i_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_offer"("target_offer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_offer"("target_offer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_offer"("target_offer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_expired_content"() TO "anon";
GRANT ALL ON FUNCTION "public"."archive_expired_content"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_expired_content"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bookings_before_ins_upd_bi"() TO "anon";
GRANT ALL ON FUNCTION "public"."bookings_before_ins_upd_bi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bookings_before_ins_upd_bi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bookings_fill_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."bookings_fill_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bookings_fill_defaults"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bookings_fix_partner_after_upd_ai"() TO "anon";
GRANT ALL ON FUNCTION "public"."bookings_fix_partner_after_upd_ai"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bookings_fix_partner_after_upd_ai"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bookings_set_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."bookings_set_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bookings_set_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_subscription_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_subscription_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_subscription_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_database"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_database"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_database"() TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" timestamp with time zone, "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text", "p_meeting_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" timestamp with time zone, "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text", "p_meeting_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" timestamp with time zone, "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text", "p_meeting_location" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_member_rewards_backup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_member_rewards_backup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_member_rewards_backup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_member_rewards_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_member_rewards_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_member_rewards_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_partner_payout"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_partner_payout"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_partner_payout"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_payout_on_confirm"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_payout_on_confirm"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_payout_on_confirm"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_test_user"("user_email" "text", "user_password" "text", "first_name" "text", "last_name" "text", "phone" "text", "subscription_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_test_user"("user_email" "text", "user_password" "text", "first_name" "text", "last_name" "text", "phone" "text", "subscription_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_test_user"("user_email" "text", "user_password" "text", "first_name" "text", "last_name" "text", "phone" "text", "subscription_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_working_test_user"("p_email" "text", "p_password" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_subscription_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_working_test_user"("p_email" "text", "p_password" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_subscription_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_working_test_user"("p_email" "text", "p_password" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_subscription_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount" numeric, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount" numeric, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount" numeric, "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_orders_fill_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."customer_orders_fill_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_orders_fill_defaults"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount_raw" numeric, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount_raw" numeric, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_partner_id" "uuid", "p_amount_raw" numeric, "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_offer_stock"("offer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_offer_stock"("offer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_offer_stock"("offer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_inconsistent_subscription_statuses"() TO "anon";
GRANT ALL ON FUNCTION "public"."find_inconsistent_subscription_statuses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_inconsistent_subscription_statuses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_bookings_set_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_bookings_set_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_bookings_set_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_insert_partner_payout_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_insert_partner_payout_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_insert_partner_payout_item"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_subscriptions_set_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_subscriptions_set_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_subscriptions_set_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_webhook_events_set_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_webhook_events_set_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_webhook_events_set_updated"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_monthly_partner_payouts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_monthly_partner_payouts"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_monthly_partner_payouts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_monthly_partner_payouts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_monthly_partner_payouts"("p_ref_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_monthly_partner_payouts"("p_ref_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_monthly_partner_payouts"("p_ref_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_partner_payout"("v_partner_id" "uuid", "v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_partner_payout"("v_partner_id" "uuid", "v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_partner_payout"("v_partner_id" "uuid", "v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_partner_payout_items"("p_partner_payout_id" "uuid", "p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_partner_payout_items"("p_partner_payout_id" "uuid", "p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_partner_payout_items"("p_partner_payout_id" "uuid", "p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_partner_payout_items_for"("p_payout_id" "uuid", "p_dry_run" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_partner_payout_items_for"("p_payout_id" "uuid", "p_dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_partner_payout_items_for"("p_payout_id" "uuid", "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_partner_payout_items_for"("p_payout_id" "uuid", "p_dry_run" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_partner_payouts_for_month"("v_year" integer, "v_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_partner_payouts_for_month"("v_year" integer, "v_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_partner_payouts_for_month"("v_year" integer, "v_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_partner_payouts_for_period"("v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_partner_payouts_for_period"("v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_partner_payouts_for_period"("v_period_start" timestamp with time zone, "v_period_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_partner_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_partner_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_partner_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hub_link"("hub_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_hub_link"("hub_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hub_link"("hub_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_clients_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_clients_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_clients_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_partner_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_partner_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_partner_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_partner_id_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_partner_id_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_partner_id_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_safe_community_locations"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_safe_community_locations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_safe_community_locations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_squad_link"("squad_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_squad_link"("squad_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_squad_link"("squad_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_event_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_event_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_event_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_webhook_event_type_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_webhook_event_type_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_webhook_event_type_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_booking_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_booking_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_booking_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_checkout_completed"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_checkout_completed"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_checkout_completed"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_paid_booking"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_paid_booking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_paid_booking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_partner_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_partner_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_partner_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_payment_failed"("event_id" "text", "customer_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_payment_failed"("event_id" "text", "customer_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_payment_failed"("event_id" "text", "customer_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_payment_succeeded"("event" "json") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_payment_succeeded"("event" "json") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_payment_succeeded"("event" "json") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_payment_succeeded"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_payment_succeeded"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_payment_succeeded"("event_id" "text", "customer_email" "text", "customer_id" "text", "subscription_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_stripe_subscription_webhook"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_stripe_subscription_webhook"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_stripe_subscription_webhook"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_subscription_cancellation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_subscription_cancellation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_subscription_cancellation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_subscription_created"("event_id" "text", "customer_id" "text", "subscription_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_subscription_created"("event_id" "text", "customer_id" "text", "subscription_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_subscription_created"("event_id" "text", "customer_id" "text", "subscription_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_subscription_created"("customer_id" "text", "subscription_id" "text", "event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_subscription_created"("customer_id" "text", "subscription_id" "text", "event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_subscription_created"("customer_id" "text", "subscription_id" "text", "event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_subscription_deleted"("event_id" "text", "customer_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_subscription_deleted"("event_id" "text", "customer_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_subscription_deleted"("event_id" "text", "customer_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_active_subscription"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_active_subscription"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_active_subscription"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_variant_stock"("variant_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_variant_stock"("variant_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_variant_stock"("variant_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_subscriber"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_subscriber"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_subscriber"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_partner"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_partner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_partner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_partner"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_partner"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_partner"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_premium_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_premium_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_premium_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_service_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_standard_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_standard_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_standard_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_subscription_active"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_subscription_active"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_subscription_active"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_profile_to_auth_user"("profile_email" "text", "auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."link_profile_to_auth_user"("profile_email" "text", "auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_profile_to_auth_user"("profile_email" "text", "auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_booking_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_booking_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_booking_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_email_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_email_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_email_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."policy_exists"("table_name" "text", "policy_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."policy_exists"("table_name" "text", "policy_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."policy_exists"("table_name" "text", "policy_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_partner_payout_totals"("p_payout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_partner_payout_totals"("p_payout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_partner_payout_totals"("p_payout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_partner_payout_aggregates"("p_payout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_partner_payout_aggregates"("p_payout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_partner_payout_aggregates"("p_payout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_partner_payout_totals"("p_payout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_partner_payout_totals"("p_payout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_partner_payout_totals"("p_payout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_all_partner_payouts"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_all_partner_payouts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_all_partner_payouts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_partner_payouts"("p_payout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_partner_payouts"("p_payout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_partner_payouts"("p_payout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_get_user_by_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_get_user_by_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_get_user_by_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_list_users"("p_page" integer, "p_per_page" integer, "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_list_users"("p_page" integer, "p_per_page" integer, "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_list_users"("p_page" integer, "p_per_page" integer, "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_partner_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_partner_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_partner_reminders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_partner_payout_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_partner_payout_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_partner_payout_items"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_partner_payout_items_recalc"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_partner_payout_items_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_partner_payout_items_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_payout_items_refresh"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_payout_items_refresh"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_payout_items_refresh"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_recompute_partner_payout_aggregates"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_recompute_partner_payout_aggregates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_recompute_partner_payout_aggregates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_partner_payout"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_partner_payout"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_partner_payout"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_send_confirmation_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_send_confirmation_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_send_confirmation_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bookings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bookings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bookings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_challenge_participants"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_challenge_participants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_challenge_participants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_participants"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_participants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_participants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_masterclass_participants"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_masterclass_participants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_masterclass_participants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_partner_payout_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_partner_payout_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_partner_payout_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_plans_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_plans_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_plans_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_role"() TO "service_role";



GRANT ALL ON TABLE "public"."partner_payouts" TO "anon";
GRANT ALL ON TABLE "public"."partner_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_payouts" TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_partner_payout_header"("p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_currency" "text", "p_finalize" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_partner_payout_header"("p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_currency" "text", "p_finalize" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_partner_payout_header"("p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_currency" "text", "p_finalize" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_partner_payout_header"("p_partner_id" "uuid", "p_period_start" timestamp with time zone, "p_period_end" timestamp with time zone, "p_currency" "text", "p_finalize" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_coordinates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_coordinates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_coordinates"() TO "service_role";



GRANT ALL ON TABLE "public"."__supabase_migrations" TO "anon";
GRANT ALL ON TABLE "public"."__supabase_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."__supabase_migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."__supabase_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."__supabase_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."__supabase_migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_newsletters" TO "anon";
GRANT ALL ON TABLE "public"."admin_newsletters" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_newsletters" TO "service_role";



GRANT ALL ON TABLE "public"."ambassador_applications" TO "anon";
GRANT ALL ON TABLE "public"."ambassador_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."ambassador_applications" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."cgp_versions" TO "anon";
GRANT ALL ON TABLE "public"."cgp_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."cgp_versions" TO "service_role";



GRANT ALL ON TABLE "public"."community_content" TO "anon";
GRANT ALL ON TABLE "public"."community_content" TO "authenticated";
GRANT ALL ON TABLE "public"."community_content" TO "service_role";



GRANT ALL ON TABLE "public"."community_hubs" TO "anon";
GRANT ALL ON TABLE "public"."community_hubs" TO "authenticated";
GRANT ALL ON TABLE "public"."community_hubs" TO "service_role";



GRANT ALL ON TABLE "public"."community_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."community_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."community_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."current_user_admin" TO "anon";
GRANT ALL ON TABLE "public"."current_user_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."current_user_admin" TO "service_role";



GRANT ALL ON TABLE "public"."customer_orders" TO "anon";
GRANT ALL ON TABLE "public"."customer_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_orders" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."micro_squads" TO "anon";
GRANT ALL ON TABLE "public"."micro_squads" TO "authenticated";
GRANT ALL ON TABLE "public"."micro_squads" TO "service_role";



GRANT ALL ON TABLE "public"."migrations" TO "anon";
GRANT ALL ON TABLE "public"."migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."offer_categories" TO "anon";
GRANT ALL ON TABLE "public"."offer_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."offer_categories" TO "service_role";



GRANT ALL ON TABLE "public"."offer_media" TO "anon";
GRANT ALL ON TABLE "public"."offer_media" TO "authenticated";
GRANT ALL ON TABLE "public"."offer_media" TO "service_role";



GRANT ALL ON TABLE "public"."offer_variants" TO "anon";
GRANT ALL ON TABLE "public"."offer_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."offer_variants" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."partner_cgp_acceptance" TO "anon";
GRANT ALL ON TABLE "public"."partner_cgp_acceptance" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_cgp_acceptance" TO "service_role";



GRANT ALL ON TABLE "public"."partner_notifications" TO "anon";
GRANT ALL ON TABLE "public"."partner_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."partner_payouts_summary" TO "anon";
GRANT ALL ON TABLE "public"."partner_payouts_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_payouts_summary" TO "service_role";



GRANT ALL ON TABLE "public"."partners" TO "anon";
GRANT ALL ON TABLE "public"."partners" TO "authenticated";
GRANT ALL ON TABLE "public"."partners" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



GRANT ALL ON TABLE "public"."partner_revenue_report" TO "anon";
GRANT ALL ON TABLE "public"."partner_revenue_report" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_revenue_report" TO "service_role";



GRANT ALL ON TABLE "public"."payment_installments" TO "anon";
GRANT ALL ON TABLE "public"."payment_installments" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_installments" TO "service_role";



GRANT ALL ON TABLE "public"."payment_plans" TO "anon";
GRANT ALL ON TABLE "public"."payment_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_plans" TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON TABLE "public"."refund_requests" TO "anon";
GRANT ALL ON TABLE "public"."refund_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_requests" TO "service_role";



GRANT ALL ON TABLE "public"."region_requests" TO "anon";
GRANT ALL ON TABLE "public"."region_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."region_requests" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."squad_members" TO "anon";
GRANT ALL ON TABLE "public"."squad_members" TO "authenticated";
GRANT ALL ON TABLE "public"."squad_members" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."vw_constraints_status" TO "anon";
GRANT ALL ON TABLE "public"."vw_constraints_status" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_constraints_status" TO "service_role";



GRANT ALL ON TABLE "public"."vw_rls_status" TO "anon";
GRANT ALL ON TABLE "public"."vw_rls_status" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_rls_status" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






