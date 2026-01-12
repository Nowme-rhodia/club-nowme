
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Gastronomie') THEN
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Gastronomie', NULL, 'transaction', 15, 15);
    END IF;
END $$;
