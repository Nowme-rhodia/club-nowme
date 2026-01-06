DO $$
DECLARE
    cols TEXT;
    cons TEXT;
BEGIN
    -- Get columns
    SELECT string_agg(column_name || '(' || data_type || ')', ', ') INTO cols
    FROM information_schema.columns 
    WHERE table_name = 'bookings' AND table_schema = 'public';

    -- Get constraints
    SELECT string_agg(constraint_name || '(' || constraint_type || ')', ', ') INTO cons
    FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND table_schema = 'public';

    RAISE EXCEPTION 'DEBUG BOOKINGS :: Cols: [%] :: Cons: [%]', cols, cons;
END $$;
