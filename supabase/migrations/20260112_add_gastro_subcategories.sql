
DO $$
BEGIN
    -- Ensure "Gastronomie & Art de la Table" exists (it should)
    
    -- Boulangerie
    IF NOT EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Boulangerie') THEN
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Boulangerie', 'Gastronomie & Art de la Table', 'transaction', 15, 15);
    ELSE
        UPDATE public.offer_categories SET parent_name = 'Gastronomie & Art de la Table' WHERE name = 'Boulangerie';
    END IF;

    -- Épicerie
    IF NOT EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Épicerie') THEN
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Épicerie', 'Gastronomie & Art de la Table', 'transaction', 15, 15);
    ELSE
         UPDATE public.offer_categories SET parent_name = 'Gastronomie & Art de la Table' WHERE name = 'Épicerie';
    END IF;

    -- Restaurants
    IF NOT EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Restaurants') THEN
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Restaurants', 'Gastronomie & Art de la Table', 'transaction', 15, 15);
    ELSE
         UPDATE public.offer_categories SET parent_name = 'Gastronomie & Art de la Table' WHERE name = 'Restaurants';
    END IF;

END $$;
