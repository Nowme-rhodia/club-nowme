-- ======================================
-- A) ENUMS (exemple : partner_request_status)
-- ======================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_request_status') THEN
    CREATE TYPE public.partner_request_status AS ENUM ('draft','submitted','approved','rejected');
  END IF;
END $$;

-- ======================================
-- B) COLONNES / FKs / INDEX CLÉS
-- ======================================

-- ------- customer_orders : rattacher à l'utilisateur + timestamps -------
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_orders_user_id_fkey'
  ) THEN
    ALTER TABLE public.customer_orders
      ADD CONSTRAINT customer_orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Timestamps (si absents)
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_customer_orders_user_id ON public.customer_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_partner_id ON public.customer_orders(partner_id);

-- ------- bookings : indexes usuels (sélectivité & intégrité) -------
-- (Tes UNIQUE existent sans doute déjà, on garde idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_checkout_session
  ON public.bookings (stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_payment_intent
  ON public.bookings (stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON public.bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_offer_id ON public.bookings(offer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- ------- partner_payouts / items : indexes FKs -------
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_id ON public.partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payout_items_payout_id ON public.partner_payout_items(partner_payout_id);
CREATE INDEX IF NOT EXISTS idx_partner_payout_items_booking_id ON public.partner_payout_items(booking_id);

-- ------- offers : indexes FKs -------
CREATE INDEX IF NOT EXISTS idx_offers_partner_id ON public.offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_category_id ON public.offers(category_id);

-- ------- user_profiles / liens fréquents -------
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- ======================================
-- C) FONCTIONS & TRIGGERS
-- ======================================

-- -- updated_at générique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_set_updated_at'
  ) THEN
    CREATE FUNCTION public.trg_set_updated_at()
    RETURNS trigger AS $fn$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

-- -- bookings : compléter total & currency par défaut
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'bookings_fill_defaults'
  ) THEN
    CREATE FUNCTION public.bookings_fill_defaults()
    RETURNS trigger AS $fn$
    BEGIN
      -- currency par défaut
      IF NEW.currency IS NULL THEN
        NEW.currency := 'EUR';
      END IF;

      -- total = unit * quantity si absent/0
      IF (NEW.total_amount_cents IS NULL OR NEW.total_amount_cents = 0)
         AND NEW.unit_amount_cents IS NOT NULL
         AND NEW.quantity IS NOT NULL THEN
        NEW.total_amount_cents := NEW.unit_amount_cents * NEW.quantity;
      END IF;

      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

-- -- TRIGGERS bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bookings_set_updated_at') THEN
    CREATE TRIGGER bookings_set_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bookings_fill_defaults_biu') THEN
    CREATE TRIGGER bookings_fill_defaults_biu
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.bookings_fill_defaults();
  END IF;
END $$;

-- -- stripe_webhook_events : updated_at auto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'stripe_webhook_events_set_updated_at') THEN
    CREATE TRIGGER stripe_webhook_events_set_updated_at
    BEFORE UPDATE ON public.stripe_webhook_events
    FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END $$;

-- -- Recalcul d’entête payouts quand items changent
-- (attend la fonction refresh_partner_payouts, ci-dessous)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'refresh_partner_payouts'
  ) THEN
    CREATE FUNCTION public.refresh_partner_payouts(p_payout_id uuid)
    RETURNS void AS $fn$
    BEGIN
      UPDATE public.partner_payouts p
      SET
        gross_amount_cents      = COALESCE(s.items_gross, 0),
        commission_amount_cents = COALESCE(s.items_comm, 0),
        net_amount_cents        = COALESCE(s.items_net, 0),
        updated_at              = now()
      FROM (
        SELECT partner_payout_id,
               SUM(total_amount_cents)       AS items_gross,
               SUM(commission_cents)         AS items_comm,
               SUM(partner_earnings_cents)   AS items_net
        FROM public.partner_payout_items
        WHERE partner_payout_id = p_payout_id
        GROUP BY partner_payout_id
      ) s
      WHERE p.id = s.partner_payout_id;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_payout_items_refresh'
  ) THEN
    CREATE FUNCTION public.trg_payout_items_refresh()
    RETURNS trigger AS $fn$
    BEGIN
      PERFORM public.refresh_partner_payouts(
        COALESCE(NEW.partner_payout_id, OLD.partner_payout_id)
      );
      RETURN NULL; -- AFTER-row ok
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payout_items_aiud_refresh') THEN
    CREATE TRIGGER payout_items_aiud_refresh
    AFTER INSERT OR UPDATE OR DELETE ON public.partner_payout_items
    FOR EACH ROW EXECUTE FUNCTION public.trg_payout_items_refresh();
  END IF;
END $$;

-- ======================================
-- D) RLS : ACTIVER & POLICIES (idempotentes)
-- ======================================

-- -- Activer RLS (sans casser si déjà actif)
ALTER TABLE public.bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payout_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders         ENABLE ROW LEVEL SECURITY;

-- -- BOOKINGS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_select_own') THEN
    CREATE POLICY bookings_select_own
      ON public.bookings FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='bookings_select_partner') THEN
    CREATE POLICY bookings_select_partner
      ON public.bookings FOR SELECT TO authenticated
      USING (partner_id IN (
        SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='bookings_insert_own') THEN
    CREATE POLICY bookings_insert_own
      ON public.bookings FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='bookings_update_own') THEN
    CREATE POLICY bookings_update_own
      ON public.bookings FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='bookings_service_role') THEN
    CREATE POLICY bookings_service_role
      ON public.bookings AS PERMISSIVE FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -- PARTNER_PAYOUTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_payouts' AND policyname='partner_payouts_select_own') THEN
    CREATE POLICY partner_payouts_select_own
      ON public.partner_payouts FOR SELECT TO authenticated
      USING (partner_id IN (
        SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_payouts' AND policyname='partner_payouts_service_role') THEN
    CREATE POLICY partner_payouts_service_role
      ON public.partner_payouts FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -- PARTNER_PAYOUT_ITEMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_payout_items' AND policyname='payout_items_select_own') THEN
    CREATE POLICY payout_items_select_own
      ON public.partner_payout_items FOR SELECT TO authenticated
      USING (partner_payout_id IN (
        SELECT id FROM public.partner_payouts
        WHERE partner_id IN (SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid())
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_payout_items' AND policyname='payout_items_service_role') THEN
    CREATE POLICY payout_items_service_role
      ON public.partner_payout_items FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -- SUBSCRIPTIONS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='subscriptions_select_own') THEN
    CREATE POLICY subscriptions_select_own
      ON public.subscriptions FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='subscriptions_service_role') THEN
    CREATE POLICY subscriptions_service_role
      ON public.subscriptions FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -- STRIPE_WEBHOOK_EVENTS (admin only + service_role)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stripe_webhook_events' AND policyname='stripe_webhook_events_admin') THEN
    CREATE POLICY stripe_webhook_events_admin
      ON public.stripe_webhook_events FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = auth.uid() AND up.is_admin = true
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stripe_webhook_events' AND policyname='stripe_webhook_events_service_role') THEN
    CREATE POLICY stripe_webhook_events_service_role
      ON public.stripe_webhook_events FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -- CUSTOMER_ORDERS (user-scope)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_orders' AND policyname='customer_orders_select_own') THEN
    CREATE POLICY customer_orders_select_own
      ON public.customer_orders FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_orders' AND policyname='customer_orders_insert_own') THEN
    CREATE POLICY customer_orders_insert_own
      ON public.customer_orders FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_orders' AND policyname='customer_orders_service_role') THEN
    CREATE POLICY customer_orders_service_role
      ON public.customer_orders FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ======================================
-- E) VUES DIAGNOSTIC
-- ======================================

-- Vue FKs + index (détecte "⚠️ Manque index")
CREATE OR REPLACE VIEW public.vw_constraints_status AS
SELECT 
    c.conname AS constraint_name,
    t.relname AS table_name,
    array_agg(a.attname) AS fk_columns,
    r.relname AS referenced_table,
    CASE c.confdeltype
      WHEN 'c' THEN 'CASCADE'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'a' THEN 'NO ACTION'
      ELSE c.confdeltype::text
    END AS on_delete_action,
    pg_get_constraintdef(c.oid) AS definition,
    CASE
        WHEN i.indexrelid IS NOT NULL THEN '✅ Index présent'
        ELSE '⚠️ Manque index'
    END AS index_check
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_class r ON r.oid = c.confrelid
JOIN pg_attribute a ON a.attnum = ANY (c.conkey) AND a.attrelid = t.oid
LEFT JOIN pg_index i ON i.indrelid = t.oid AND i.indkey::int[] @> c.conkey
WHERE c.contype = 'f'
  AND t.relnamespace = 'public'::regnamespace
GROUP BY c.conname, t.relname, r.relname, c.confdeltype, c.oid, i.indexrelid
ORDER BY t.relname, c.conname;

-- Vue RLS : état des policies par table
CREATE OR REPLACE VIEW public.vw_rls_status AS
SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd AS command,
  p.qual  AS using_expression,
  p.with_check AS with_check_expression
FROM pg_policies p
WHERE p.schemaname = 'public'
ORDER BY p.tablename, p.policyname;

-- Tables sans aucune policy (utile en RLS activé)
CREATE OR REPLACE VIEW public.vw_tables_without_policies AS
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
AND NOT EXISTS (
  SELECT 1 FROM pg_policies p
  WHERE p.schemaname='public' AND p.tablename=t.tablename
)
ORDER BY t.tablename;

-- ======================================
-- F) PACK DIAGNOSTIC RAPIDE (requêtes prêtes)
-- ======================================

-- Schéma & index d’une table
-- 1) Colonnes
-- (remplace 'bookings' par la table voulue)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 2) Index
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'bookings'
ORDER BY indexname;

-- 3) Contraintes (PK/FK/UNIQUE)
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid = 'public.bookings'::regclass
ORDER BY conname;

-- Stripe idempotence
-- Derniers events failed/processing
SELECT stripe_event_id, event_type, status, error_message, received_at
FROM public.stripe_webhook_events
WHERE status IN ('failed','processing')
ORDER BY received_at DESC
LIMIT 50;

-- Top event_type
SELECT event_type, COUNT(*) AS cnt
FROM public.stripe_webhook_events
GROUP BY event_type
ORDER BY cnt DESC
LIMIT 20;

-- Bookings (intégrité & doublons)
-- 1) bookings paid sans payment_intent
SELECT id, status, stripe_checkout_session_id, stripe_payment_intent_id
FROM public.bookings
WHERE status = 'paid' AND stripe_payment_intent_id IS NULL;

-- 2) Doublons payment_intent_id
SELECT stripe_payment_intent_id, COUNT(*) AS n
FROM public.bookings
WHERE stripe_payment_intent_id IS NOT NULL
GROUP BY stripe_payment_intent_id
HAVING COUNT(*) > 1;

-- 3) Cohérence total = unit * quantity
SELECT id, unit_amount_cents, quantity, total_amount_cents,
       (unit_amount_cents * quantity) AS expected_total
FROM public.bookings
WHERE unit_amount_cents IS NOT NULL AND quantity IS NOT NULL
  AND total_amount_cents IS NOT NULL
  AND total_amount_cents <> (unit_amount_cents * quantity)
LIMIT 50;

-- Payouts (agrégats période + partenaire)
WITH params AS (
  SELECT '2025-09-01'::timestamptz AS p_start,
         '2025-10-01'::timestamptz AS p_end
)
SELECT p.id, p.partner_id, p.status,
       p.gross_amount_cents, p.commission_amount_cents, p.net_amount_cents,
       COUNT(i.*) AS nb_items
FROM public.partner_payouts p
LEFT JOIN public.partner_payout_items i ON i.partner_payout_id = p.id
JOIN params ON p.period_start = params.p_start AND p.period_end = params.p_end
GROUP BY p.id, p.partner_id, p.status,
         p.gross_amount_cents, p.commission_amount_cents, p.net_amount_cents
ORDER BY p.partner_id;

-- Détail items pour un payout (remplacer <<PAID_UUID>>)
SELECT i.*
FROM public.partner_payout_items i
WHERE i.partner_payout_id = '00000000-0000-0000-0000-000000000000';

-- RLS : policies par table cible
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bookings','partner_payouts','partner_payout_items','subscriptions','stripe_webhook_events','customer_orders')
ORDER BY tablename, policyname;

-- Tables public sans policy
SELECT * FROM public.vw_tables_without_policies;

-- ======================================
-- G) CRON (optionnel)
-- ======================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Planifier la génération mensuelle (ex. 1er du mois à 04:00)
-- (nécessite une fonction generate_monthly_partner_payouts())
-- Ajuster le nom si déjà pris.
SELECT cron.schedule(
  'generate-monthly-payouts',
  '0 4 1 * *',
  $$ SELECT generate_monthly_partner_payouts(); $$
);
