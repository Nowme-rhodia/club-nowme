-- Migration: Add amount, currency, partner_id to bookings schema
-- Created at: 2025-12-27T13:00:00.000Z

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'partner_id') THEN
        ALTER TABLE bookings ADD COLUMN partner_id UUID REFERENCES partners(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'amount') THEN
        ALTER TABLE bookings ADD COLUMN amount NUMERIC(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'currency') THEN
        ALTER TABLE bookings ADD COLUMN currency TEXT DEFAULT 'EUR';
    END IF;
END $$;
