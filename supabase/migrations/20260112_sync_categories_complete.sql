
-- Sync Categories and Subcategories
DO $$
DECLARE
    main_cat_id UUID;
BEGIN

    -- Main Category: Bien-être et relaxation
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Bien-être et relaxation') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Bien-être et relaxation', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Centre de yoga, Pilates
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Centre de yoga, Pilates') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Centre de yoga, Pilates' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Centre de yoga, Pilates', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Institut de beauté, Esthétique
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Institut de beauté, Esthétique') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Institut de beauté, Esthétique' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Institut de beauté, Esthétique', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Naturopathe, Sophrologue
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Naturopathe, Sophrologue') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Naturopathe, Sophrologue' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Naturopathe, Sophrologue', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Réflexologie
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Réflexologie') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Réflexologie' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Réflexologie', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Salon de massage, Drainage lymphatique
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Salon de massage, Drainage lymphatique') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Salon de massage, Drainage lymphatique' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Salon de massage, Drainage lymphatique', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Sophrologie
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Sophrologie') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Sophrologie' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Sophrologie', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Spa et centre de bien-être
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Spa et centre de bien-être') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Spa et centre de bien-être' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Spa et centre de bien-être', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Thalassothérapie, Hammam
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Thalassothérapie, Hammam') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Bien-être et relaxation'
        WHERE name = 'Thalassothérapie, Hammam' AND (parent_name IS NULL OR parent_name <> 'Bien-être et relaxation');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Thalassothérapie, Hammam', 'Bien-être et relaxation', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Culture et divertissement
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Culture et divertissement') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Culture et divertissement', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Bars
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Bars') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Bars' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Bars', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Boîte de nuit
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Boîte de nuit') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Boîte de nuit' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Boîte de nuit', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: DJ, animateur de soirée
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'DJ, animateur de soirée') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'DJ, animateur de soirée' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('DJ, animateur de soirée', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Entreprise d'événementiel culturel
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Entreprise d''événementiel culturel') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Entreprise d''événementiel culturel' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Entreprise d''événementiel culturel', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Game room
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Game room') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Game room' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Game room', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: One (wo)man show
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'One (wo)man show') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'One (wo)man show' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('One (wo)man show', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Organisateur de concerts
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Organisateur de concerts') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Organisateur de concerts' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Organisateur de concerts', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Organisateur de soirées à thème
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Organisateur de soirées à thème') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Organisateur de soirées à thème' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Organisateur de soirées à thème', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Théâtre, salle de spectacle
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Théâtre, salle de spectacle') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Culture et divertissement'
        WHERE name = 'Théâtre, salle de spectacle' AND (parent_name IS NULL OR parent_name <> 'Culture et divertissement');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Théâtre, salle de spectacle', 'Culture et divertissement', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Développement personnel et coaching
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Développement personnel et coaching') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Développement personnel et coaching', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Coach de vie, Personnel
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Coach de vie, Personnel') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Coach de vie, Personnel' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Coach de vie, Personnel', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Coach parentalité
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Coach parentalité') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Coach parentalité' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Coach parentalité', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Coach sportif
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Coach sportif') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Coach sportif' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Coach sportif', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Facilitateur de cercle de parole
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Facilitateur de cercle de parole') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Facilitateur de cercle de parole' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Facilitateur de cercle de parole', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Hypnothérapeute
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Hypnothérapeute') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Hypnothérapeute' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Hypnothérapeute', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Praticien de médecine alternative
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Praticien de médecine alternative') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Praticien de médecine alternative' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Praticien de médecine alternative', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Psychologue
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Psychologue') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Psychologue' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Psychologue', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Sophrologue
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Sophrologue') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Sophrologue' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Sophrologue', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Thérapeute
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Thérapeute') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Développement personnel et coaching'
        WHERE name = 'Thérapeute' AND (parent_name IS NULL OR parent_name <> 'Développement personnel et coaching');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Thérapeute', 'Développement personnel et coaching', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Gastronomie & Art de la Table
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Gastronomie & Art de la Table') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Gastronomie & Art de la Table', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Brunchs & Food Tours
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Brunchs & Food Tours') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Gastronomie & Art de la Table'
        WHERE name = 'Brunchs & Food Tours' AND (parent_name IS NULL OR parent_name <> 'Gastronomie & Art de la Table');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Brunchs & Food Tours', 'Gastronomie & Art de la Table', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Cours de Cuisine
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Cours de Cuisine') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Gastronomie & Art de la Table'
        WHERE name = 'Cours de Cuisine' AND (parent_name IS NULL OR parent_name <> 'Gastronomie & Art de la Table');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Cours de Cuisine', 'Gastronomie & Art de la Table', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Dîners Privés
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Dîners Privés') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Gastronomie & Art de la Table'
        WHERE name = 'Dîners Privés' AND (parent_name IS NULL OR parent_name <> 'Gastronomie & Art de la Table');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Dîners Privés', 'Gastronomie & Art de la Table', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Oenologie & Dégustations
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Oenologie & Dégustations') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Gastronomie & Art de la Table'
        WHERE name = 'Oenologie & Dégustations' AND (parent_name IS NULL OR parent_name <> 'Gastronomie & Art de la Table');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Oenologie & Dégustations', 'Gastronomie & Art de la Table', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Loisirs et créativité
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Loisirs et créativité') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Loisirs et créativité', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Loisirs et créativité'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Loisirs et créativité');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Loisirs et créativité', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Atelier de création (poterie, couture, peinture)
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Atelier de création (poterie, couture, peinture)') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Loisirs et créativité'
        WHERE name = 'Atelier de création (poterie, couture, peinture)' AND (parent_name IS NULL OR parent_name <> 'Loisirs et créativité');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Atelier de création (poterie, couture, peinture)', 'Loisirs et créativité', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Atelier d'écriture
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Atelier d''écriture') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Loisirs et créativité'
        WHERE name = 'Atelier d''écriture' AND (parent_name IS NULL OR parent_name <> 'Loisirs et créativité');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Atelier d''écriture', 'Loisirs et créativité', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Club de lecture / Book Club
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Club de lecture / Book Club') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Loisirs et créativité'
        WHERE name = 'Club de lecture / Book Club' AND (parent_name IS NULL OR parent_name <> 'Loisirs et créativité');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Club de lecture / Book Club', 'Loisirs et créativité', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: École de musique / Organisation
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'École de musique / Organisation') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Loisirs et créativité'
        WHERE name = 'École de musique / Organisation' AND (parent_name IS NULL OR parent_name <> 'Loisirs et créativité');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('École de musique / Organisation', 'Loisirs et créativité', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: École de photographie
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'École de photographie') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Loisirs et créativité'
        WHERE name = 'École de photographie' AND (parent_name IS NULL OR parent_name <> 'Loisirs et créativité');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('École de photographie', 'Loisirs et créativité', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Studio de photographie
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Studio de photographie') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Loisirs et créativité'
        WHERE name = 'Studio de photographie' AND (parent_name IS NULL OR parent_name <> 'Loisirs et créativité');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Studio de photographie', 'Loisirs et créativité', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Mode et shopping
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Mode et shopping') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Mode et shopping', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Mode et shopping'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Mode et shopping');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Mode et shopping', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Créateur/trice de vêtements, accessoires
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Créateur/trice de vêtements, accessoires') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Mode et shopping'
        WHERE name = 'Créateur/trice de vêtements, accessoires' AND (parent_name IS NULL OR parent_name <> 'Mode et shopping');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Créateur/trice de vêtements, accessoires', 'Mode et shopping', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Organisateur d'atelier de seconde main
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Organisateur d''atelier de seconde main') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Mode et shopping'
        WHERE name = 'Organisateur d''atelier de seconde main' AND (parent_name IS NULL OR parent_name <> 'Mode et shopping');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Organisateur d''atelier de seconde main', 'Mode et shopping', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Personal shopper
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Personal shopper') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Mode et shopping'
        WHERE name = 'Personal shopper' AND (parent_name IS NULL OR parent_name <> 'Mode et shopping');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Personal shopper', 'Mode et shopping', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Produits
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Produits') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Produits', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Produits'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Produits');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Produits', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Accessoires de yoga / sport
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Accessoires de yoga / sport') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Produits'
        WHERE name = 'Accessoires de yoga / sport' AND (parent_name IS NULL OR parent_name <> 'Produits');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Accessoires de yoga / sport', 'Produits', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Beauté et hygiène, cosmétique
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Beauté et hygiène, cosmétique') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Produits'
        WHERE name = 'Beauté et hygiène, cosmétique' AND (parent_name IS NULL OR parent_name <> 'Produits');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Beauté et hygiène, cosmétique', 'Produits', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Box bien-être
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Box bien-être') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Produits'
        WHERE name = 'Box bien-être' AND (parent_name IS NULL OR parent_name <> 'Produits');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Box bien-être', 'Produits', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Services à domicile
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Services à domicile') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Services à domicile', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Services à domicile'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Services à domicile');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Services à domicile', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Assistant personnel
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Assistant personnel') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Services à domicile'
        WHERE name = 'Assistant personnel' AND (parent_name IS NULL OR parent_name <> 'Services à domicile');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Assistant personnel', 'Services à domicile', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Chef privé
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Chef privé') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Services à domicile'
        WHERE name = 'Chef privé' AND (parent_name IS NULL OR parent_name <> 'Services à domicile');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Chef privé', 'Services à domicile', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Coiffure à domicile
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Coiffure à domicile') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Services à domicile'
        WHERE name = 'Coiffure à domicile' AND (parent_name IS NULL OR parent_name <> 'Services à domicile');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Coiffure à domicile', 'Services à domicile', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Esthétique à domicile
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Esthétique à domicile') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Services à domicile'
        WHERE name = 'Esthétique à domicile' AND (parent_name IS NULL OR parent_name <> 'Services à domicile');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Esthétique à domicile', 'Services à domicile', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Massage à domicile
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Massage à domicile') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Services à domicile'
        WHERE name = 'Massage à domicile' AND (parent_name IS NULL OR parent_name <> 'Services à domicile');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Massage à domicile', 'Services à domicile', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Spiritualité et énergie
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Spiritualité et énergie') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Spiritualité et énergie', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Spiritualité et énergie'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Spiritualité et énergie');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Spiritualité et énergie', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Astrologue/tarologue et autres pratiques
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Astrologue/tarologue et autres pratiques') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Spiritualité et énergie'
        WHERE name = 'Astrologue/tarologue et autres pratiques' AND (parent_name IS NULL OR parent_name <> 'Spiritualité et énergie');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Astrologue/tarologue et autres pratiques', 'Spiritualité et énergie', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Magnétiseur
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Magnétiseur') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Spiritualité et énergie'
        WHERE name = 'Magnétiseur' AND (parent_name IS NULL OR parent_name <> 'Spiritualité et énergie');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Magnétiseur', 'Spiritualité et énergie', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Sport et activités physiques
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Sport et activités physiques') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Sport et activités physiques', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Sport et activités physiques'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Sport et activités physiques');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Sport et activités physiques', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Activités sur glace (ex: patinoire)
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Activités sur glace (ex: patinoire)') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Sport et activités physiques'
        WHERE name = 'Activités sur glace (ex: patinoire)' AND (parent_name IS NULL OR parent_name <> 'Sport et activités physiques');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Activités sur glace (ex: patinoire)', 'Sport et activités physiques', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Activités terrestres
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Activités terrestres') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Sport et activités physiques'
        WHERE name = 'Activités terrestres' AND (parent_name IS NULL OR parent_name <> 'Sport et activités physiques');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Activités terrestres', 'Sport et activités physiques', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Activités nautiques (aquagym, natation)
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Activités nautiques (aquagym, natation)') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Sport et activités physiques'
        WHERE name = 'Activités nautiques (aquagym, natation)' AND (parent_name IS NULL OR parent_name <> 'Sport et activités physiques');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Activités nautiques (aquagym, natation)', 'Sport et activités physiques', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Coach sportif
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Coach sportif') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Sport et activités physiques'
        WHERE name = 'Coach sportif' AND (parent_name IS NULL OR parent_name <> 'Sport et activités physiques');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Coach sportif', 'Sport et activités physiques', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Salle de danse
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Salle de danse') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Sport et activités physiques'
        WHERE name = 'Salle de danse' AND (parent_name IS NULL OR parent_name <> 'Sport et activités physiques');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Salle de danse', 'Sport et activités physiques', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Salle de sport
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Salle de sport') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Sport et activités physiques'
        WHERE name = 'Salle de sport' AND (parent_name IS NULL OR parent_name <> 'Sport et activités physiques');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Salle de sport', 'Sport et activités physiques', 'transaction', 15, 15);
    END IF;
    
    -- Main Category: Voyages et expériences
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Voyages et expériences') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Voyages et expériences', NULL, 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Autre
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Autre') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Autre' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Autre', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Activités insolites
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Activités insolites') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Activités insolites' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Activités insolites', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Agence de voyage
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Agence de voyage') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Agence de voyage' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Agence de voyage', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Guide touristique
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Guide touristique') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Guide touristique' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Guide touristique', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Hôtels / Maisons d'hôte
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Hôtels / Maisons d''hôte') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Hôtels / Maisons d''hôte' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Hôtels / Maisons d''hôte', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Organisateur de retraites bien-être
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Organisateur de retraites bien-être') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Organisateur de retraites bien-être' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Organisateur de retraites bien-être', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Séjours culturels
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Séjours culturels') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Séjours culturels' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Séjours culturels', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
    -- Subcategory: Séjours à la nature
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = 'Séjours à la nature') THEN
        UPDATE public.offer_categories
        SET parent_name = 'Voyages et expériences'
        WHERE name = 'Séjours à la nature' AND (parent_name IS NULL OR parent_name <> 'Voyages et expériences');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('Séjours à la nature', 'Voyages et expériences', 'transaction', 15, 15);
    END IF;
    
END $$;

