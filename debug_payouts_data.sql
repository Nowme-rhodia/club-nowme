SELECT 
    b.id, 
    b.status, 
    b.amount, 
    b.booking_date,
    o.title as offer_title,
    ov.price as variant_price
FROM 
    bookings b
LEFT JOIN offers o ON b.offer_id = o.id
LEFT JOIN offer_variants ov ON b.offer_id = ov.offer_id
LIMIT 20;
