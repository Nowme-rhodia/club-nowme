-- Debug migration to inspect bookings table structure
-- We use RAISE EXCEPTION to return the data to the client

DO $$
DECLARE
    cols TEXT;
    cons TEXT;
BEGIN
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ') 
    INTO cols
    FROM information_schema.columns 
    WHERE table_name = 'bookings';

    SELECT string_agg(constraint_name, ', ')
    INTO cons
    FROM information_schema.table_constraints
    WHERE table_name = 'bookings';

    RAISE EXCEPTION 'DEBUG INFO: Columns: [%] Constraints: [%]', cols, cons;
END $$;
