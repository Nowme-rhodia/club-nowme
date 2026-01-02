DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_intent_id') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_intent_id TEXT;
    END IF;
END $$;
