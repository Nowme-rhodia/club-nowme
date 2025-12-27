SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_name IN ('bookings', 'offers', 'offer_variants', 'partners')
    AND table_schema = 'public'
ORDER BY 
    table_name, 
    ordinal_position;
