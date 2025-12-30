

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


CREATE TYPE "public"."email_status" AS ENUM (
    'pending',
    'sent',
    'failed'
);


ALTER TYPE "public"."email_status" OWNER TO "postgres";


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
    'rejected'
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


CREATE OR REPLACE FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" "text", "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid" DEFAULT NULL::"uuid", "p_external_id" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_stock integer;
    v_booking_id uuid;
    v_partner_id uuid;
BEGIN
    -- 0. Get Partner ID from Offer
    SELECT partner_id INTO v_partner_id FROM offers WHERE id = p_offer_id;

    -- 1. Check Stock if variant_id is provided
    IF p_variant_id IS NOT NULL THEN
        SELECT stock INTO v_stock
        FROM offer_variants
        WHERE id = p_variant_id
        FOR UPDATE; -- Lock the row

        IF v_stock IS NOT NULL AND v_stock <= 0 THEN
            RAISE EXCEPTION 'Stock épuisé pour cette option.';
        END IF;

        -- 2. Decrement Stock
        IF v_stock IS NOT NULL THEN
            UPDATE offer_variants
            SET stock = stock - 1
            WHERE id = p_variant_id;
        END IF;
    END IF;

    -- 3. Insert Booking with partner_id
    INSERT INTO bookings (
        user_id,
        offer_id,
        partner_id, -- Added this
        booking_date,
        status,
        source,
        amount,
        variant_id,
        external_id
    ) VALUES (
        p_user_id,
        p_offer_id,
        v_partner_id, -- Value from select
        p_booking_date::timestamp with time zone,
        p_status,
        p_source,
        p_amount,
        p_variant_id,
        p_external_id
    )
    RETURNING id INTO v_booking_id;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;


ALTER FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" "text", "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text") OWNER TO "postgres";


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
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  pid uuid;
BEGIN
  -- We select directly. Because of SECURITY DEFINER, this ignores "Unified reading permissions" on user_profiles.
  -- This BREAKS the recursion loop.
  SELECT partner_id INTO pid FROM user_profiles WHERE user_id = auth.uid();
  RETURN pid;
END;
$$;


ALTER FUNCTION "public"."get_my_partner_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_partner_id_secure"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_partner_id_secure"() OWNER TO "postgres";


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
    project_url TEXT;
    service_role_key TEXT;
    payload JSONB;
BEGIN
    -- Only trigger if status becomes 'paid' (or 'confirmed')
    -- Logic:
    -- 1. INSERT with status='paid'
    -- 2. UPDATE where OLD.status != 'paid' and NEW.status = 'paid'
    
    IF (TG_OP = 'INSERT' AND NEW.status IN ('paid', 'confirmed')) OR
       (TG_OP = 'UPDATE' AND OLD.status NOT IN ('paid', 'confirmed') AND NEW.status IN ('paid', 'confirmed')) THEN
       
       -- Construct payload (send the whole record)
       payload := row_to_json(NEW);
       
       -- Get secrets (Assuming they are set in Vault or we use a fixed URL/Key for now, 
       -- simpler approach for this migration is to use the known Edge Function URL structure)
       -- Note: In Supabase pure SQL, getting env vars is tricky without Vault.
       -- Users often hardcode the URL in the migration or use a config table.
       -- For safety, we will use the `net.http_post` securely.
       
       -- NOTE: You must replace 'REPLACE_ME_WITH_SERVICE_KEY' with your actual Service Role Key.
       -- Alternatively, if you have the key in vault: (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
       
       PERFORM net.http_post(
           url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-confirmation-email',
           headers := jsonb_build_object(
               'Content-Type', 'application/json',
               'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU5MTU4MSwiZXhwIjoyMDU0MTY3NTgxfQ.WXPj9YGH5H-rCYGzcgAUS0LTZGe9waDkJpxhQTrsqjI' 
           ),
           body := payload
       );
       
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_paid_booking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_partner_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- REPLACE THIS VALUE with your actual SUPABASE_SERVICE_ROLE_KEY from .env or Dashboard
    service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU5MTU4MSwiZXhwIjoyMDU0MTY3NTgxfQ.WXPj9YGH5H-rCYGzcgAUS0LTZGe9waDkJpxhQTrsqjI'; 
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.welcome_sent IS FALSE THEN
        
        PERFORM net.http_post(
            url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-partner-approval-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_key
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


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()),
    false
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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
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
    "variant_id" "uuid"
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "community_content_type_check" CHECK (("type" = ANY (ARRAY['announcement'::"text", 'kiff'::"text"])))
);


ALTER TABLE "public"."community_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "suggestion_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_suggestions" OWNER TO "postgres";


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
    CONSTRAINT "offers_booking_type_check" CHECK (("booking_type" = ANY (ARRAY['calendly'::"text", 'event'::"text", 'promo'::"text", 'purchase'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."offers"."image_url" IS 'Public URL of the offer cover image';



COMMENT ON COLUMN "public"."offers"."booking_type" IS 'Type of booking: calendly, event (fixed date), or promo (external link)';



COMMENT ON COLUMN "public"."offers"."external_link" IS 'URL for external booking or promo offer';



COMMENT ON COLUMN "public"."offers"."promo_code" IS 'Promo code to display to the user';



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
    CONSTRAINT "partners_status_check" CHECK (("status" = ANY (ARRAY['pending'::"public"."partner_status", 'approved'::"public"."partner_status", 'rejected'::"public"."partner_status"])))
);


ALTER TABLE "public"."partners" OWNER TO "postgres";


COMMENT ON COLUMN "public"."partners"."business_name" IS 'Nom de l''entreprise - requis après approbation';



COMMENT ON COLUMN "public"."partners"."contact_name" IS 'Nom du contact - requis pour la demande initiale';



COMMENT ON COLUMN "public"."partners"."phone" IS 'Téléphone - requis pour la demande initiale';



COMMENT ON COLUMN "public"."partners"."website" IS 'Site web - optionnel';



COMMENT ON COLUMN "public"."partners"."description" IS 'Description détaillée - à compléter après approbation';



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
    "sub_newsletter" boolean DEFAULT true
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."stripe_customer_id" IS 'Stripe customer ID for the user';



COMMENT ON COLUMN "public"."user_profiles"."sub_auto_recap" IS 'User preference for receiving the weekly automated recap (Le Récap des Kiffs)';



COMMENT ON COLUMN "public"."user_profiles"."sub_newsletter" IS 'User preference for receiving the editorial newsletter (La Newsletter du Kiff)';



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



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_content"
    ADD CONSTRAINT "community_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_suggestions"
    ADD CONSTRAINT "community_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_categories"
    ADD CONSTRAINT "offer_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_variants"
    ADD CONSTRAINT "offer_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_partner_period_key" UNIQUE ("partner_id", "period_start", "period_end");



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."region_requests"
    ADD CONSTRAINT "region_requests_email_region_key" UNIQUE ("email", "region");



ALTER TABLE ONLY "public"."region_requests"
    ADD CONSTRAINT "region_requests_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_customer_orders_partner_id" ON "public"."customer_orders" USING "btree" ("partner_id");



CREATE INDEX "idx_customer_orders_stripe_payment_id" ON "public"."customer_orders" USING "btree" ("stripe_payment_id");



CREATE INDEX "idx_customer_orders_user_id" ON "public"."customer_orders" USING "btree" ("user_id");



CREATE INDEX "idx_emails_next_retry" ON "public"."emails" USING "btree" ("next_retry_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_emails_status" ON "public"."emails" USING "btree" ("status");



CREATE INDEX "idx_emails_to_address" ON "public"."emails" USING "btree" ("to_address");



CREATE INDEX "idx_offer_prices_offer_id" ON "public"."offer_variants" USING "btree" ("offer_id");



CREATE INDEX "idx_offers_category_id" ON "public"."offers" USING "btree" ("category_id");



CREATE INDEX "idx_offers_partner_id" ON "public"."offers" USING "btree" ("partner_id");



CREATE INDEX "idx_partner_payouts_partner_id" ON "public"."partner_payouts" USING "btree" ("partner_id");



CREATE INDEX "idx_partner_payouts_partner_period" ON "public"."partner_payouts" USING "btree" ("partner_id", "period_start", "period_end");



CREATE INDEX "idx_partners_message" ON "public"."partners" USING "gin" ("to_tsvector"('"french"'::"regconfig", "message")) WHERE ("message" IS NOT NULL);



CREATE INDEX "idx_partners_status" ON "public"."partners" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_user" ON "public"."subscriptions" USING "btree" ("user_id");



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



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

ALTER TABLE "public"."user_profiles" DISABLE TRIGGER "update_user_profiles_updated_at";



CREATE OR REPLACE TRIGGER "validate_partner_coordinates" BEFORE INSERT OR UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."validate_coordinates"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."offer_variants"("id");



ALTER TABLE ONLY "public"."community_suggestions"
    ADD CONSTRAINT "community_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id");



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offer_media"
    ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offer_variants"
    ADD CONSTRAINT "offer_prices_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."offer_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete all profiles" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete any offer" ON "public"."offers" FOR DELETE TO "authenticated" USING ((( SELECT "user_profiles"."is_admin"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())) = true));



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



CREATE POLICY "Admins can view all offers" ON "public"."offers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all profiles" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin_secure"());



CREATE POLICY "Admins can view all suggestions" ON "public"."community_suggestions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."is_admin" = true)))));



CREATE POLICY "Admins manage partners" ON "public"."partners" TO "authenticated" USING ("public"."is_admin_secure"());



CREATE POLICY "Allow authenticated users to delete migrations" ON "public"."__supabase_migrations" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert migrations" ON "public"."__supabase_migrations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read migrations" ON "public"."__supabase_migrations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update migrations" ON "public"."__supabase_migrations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can submit partner application" ON "public"."partners" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Enable insert for everyone" ON "public"."emails" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for everyone" ON "public"."region_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for own submissions" ON "public"."emails" FOR SELECT USING (true);



CREATE POLICY "Partners can delete own offers" ON "public"."offers" FOR DELETE USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



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



CREATE POLICY "Partners can update own data" ON "public"."partners" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "user_profiles"."user_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."partner_id" = "partners"."id"))));



CREATE POLICY "Partners can update own offers" ON "public"."offers" FOR UPDATE USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can update their own offers" ON "public"."offers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."partner_id" = "offers"."partner_id")))));



CREATE POLICY "Partners can view client profiles" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "public"."get_my_clients_secure"() AS "get_my_clients_secure")));



CREATE POLICY "Partners can view own offers" ON "public"."offers" USING (("auth"."uid"() IN ( SELECT "user_profiles"."user_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."partner_id" = "offers"."partner_id"))));



CREATE POLICY "Partners can view own payouts" ON "public"."partner_payouts" FOR SELECT TO "authenticated" USING (("partner_id" IN ( SELECT "user_profiles"."partner_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can view their own offers" ON "public"."offers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."partner_id" = "offers"."partner_id")))));



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



CREATE POLICY "Public offers are viewable by everyone." ON "public"."offers" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."offer_media" FOR SELECT USING (true);



CREATE POLICY "Public read access for offer_variants" ON "public"."offer_variants" FOR SELECT USING (true);



CREATE POLICY "Public view approved partners" ON "public"."partners" FOR SELECT USING (("status" = 'approved'::"public"."partner_status"));



CREATE POLICY "Unified User Profile Access" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own suggestions" ON "public"."community_suggestions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own profile" ON "public"."user_profiles" TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view active content" ON "public"."community_content" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."__supabase_migrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin full access partners" ON "public"."partners" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."admin_newsletters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_insert_own" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "bookings_select_own" ON "public"."bookings" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("partner_id" = "public"."get_my_partner_id"())));



ALTER TABLE "public"."community_content" ENABLE ROW LEVEL SECURITY;


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



ALTER TABLE "public"."partner_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_payouts_admin_all" ON "public"."partner_payouts" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "u"
  WHERE (("u"."user_id" = "auth"."uid"()) AND ("u"."is_admin" = true)))));



CREATE POLICY "partner_payouts_service_all" ON "public"."partner_payouts" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payouts_admin_select" ON "public"."partner_payouts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."is_admin" = true)))));



ALTER TABLE "public"."region_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_select_own" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "subscriptions_service_all" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_insert_own" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_profiles_select_unified" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (("public"."get_my_partner_id"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."user_id" = "user_profiles"."user_id") AND ("bookings"."partner_id" = "public"."get_my_partner_id"())))))));



CREATE POLICY "user_profiles_update_own" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



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



GRANT ALL ON FUNCTION "public"."approve_offer"("target_offer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_offer"("target_offer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_offer"("target_offer_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" "text", "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" "text", "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_booking"("p_user_id" "uuid", "p_offer_id" "uuid", "p_booking_date" "text", "p_status" "text", "p_source" "text", "p_amount" numeric, "p_variant_id" "uuid", "p_external_id" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."customer_orders_fill_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."customer_orders_fill_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_orders_fill_defaults"() TO "service_role";



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



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."community_content" TO "anon";
GRANT ALL ON TABLE "public"."community_content" TO "authenticated";
GRANT ALL ON TABLE "public"."community_content" TO "service_role";



GRANT ALL ON TABLE "public"."community_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."community_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."community_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."customer_orders" TO "anon";
GRANT ALL ON TABLE "public"."customer_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_orders" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON TABLE "public"."migrations" TO "anon";
GRANT ALL ON TABLE "public"."migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."partner_payouts_summary" TO "anon";
GRANT ALL ON TABLE "public"."partner_payouts_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_payouts_summary" TO "service_role";



GRANT ALL ON TABLE "public"."partners" TO "anon";
GRANT ALL ON TABLE "public"."partners" TO "authenticated";
GRANT ALL ON TABLE "public"."partners" TO "service_role";



GRANT ALL ON TABLE "public"."region_requests" TO "anon";
GRANT ALL ON TABLE "public"."region_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."region_requests" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



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






