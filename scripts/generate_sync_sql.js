
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Load Code Categories (Manual Copy from categories.ts to avoid TS compilation issues)
// In a real scenario we might compile/import, but for this script we duplicate the structure for speed.
const codeCategories = [
    {
        name: "Bien-être et relaxation",
        slug: "bien-etre-et-relaxation",
        subcategories: [
            { name: "Autre", slug: "autre-bien-etre" },
            { name: "Centre de yoga, Pilates", slug: "centre-de-yoga-pilates" },
            { name: "Institut de beauté, Esthétique", slug: "institut-de-beaute-esthetique" },
            { name: "Naturopathe, Sophrologue", slug: "naturopathe-sophrologue" },
            { name: "Réflexologie", slug: "reflexologie" },
            { name: "Salon de massage, Drainage lymphatique", slug: "salon-de-massage-drainage-lymphatique" },
            { name: "Sophrologie", slug: "sophrologie" },
            { name: "Spa et centre de bien-être", slug: "spa-et-centre-de-bien-etre" },
            { name: "Thalassothérapie, Hammam", slug: "thalassotherapie-hammam" }
        ]
    },
    {
        name: "Culture et divertissement",
        slug: "culture-et-divertissement",
        subcategories: [
            { name: "Autre", slug: "autre-culture-et-divertissement" },
            { name: "Bars", slug: "bars" },
            { name: "Boîte de nuit", slug: "boite-de-nuit" },
            { name: "DJ, animateur de soirée", slug: "dj-animateur-de-soiree" },
            { name: "Entreprise d'événementiel culturel", slug: "entreprise-devenementiel-culturel" },
            { name: "Game room", slug: "game-room" },
            { name: "One (wo)man show", slug: "one-wo-man-show" },
            { name: "Organisateur de concerts", slug: "organisateur-de-concerts" },
            { name: "Organisateur de soirées à thème", slug: "organisateur-de-soirees-a-theme" },
            { name: "Théâtre, salle de spectacle", slug: "theatre-salle-de-spectacle" }
        ]
    },
    {
        name: "Développement personnel et coaching",
        slug: "developpement-personnel-et-coaching",
        subcategories: [
            { name: "Autre", slug: "autre-developpement-personnel" },
            { name: "Coach de vie, Personnel", slug: "coach-de-vie-personnel" },
            { name: "Coach parentalité", slug: "coach-parentalite" },
            { name: "Coach sportif", slug: "coach-sportif" },
            { name: "Facilitateur de cercle de parole", slug: "facilitateur-de-cercle-de-parole" },
            { name: "Hypnothérapeute", slug: "hypnotherapeute" },
            { name: "Praticien de médecine alternative", slug: "praticien-de-medecine-alternative" },
            { name: "Psychologue", slug: "psychologue" },
            { name: "Sophrologue", slug: "sophrologue" },
            { name: "Thérapeute", slug: "therapeute" }
        ]
    },
    {
        name: "Gastronomie & Art de la Table",
        slug: "gastronomie-et-art-de-la-table",
        subcategories: [
            { name: "Brunchs & Food Tours", slug: "brunchs-food-tours" },
            { name: "Cours de Cuisine", slug: "cours-de-cuisine" },
            { name: "Dîners Privés", slug: "diners-prives" },
            { name: "Oenologie & Dégustations", slug: "oenologie-degustations" }
        ]
    },
    {
        name: "Loisirs et créativité",
        slug: "loisirs-et-creativite",
        subcategories: [
            { name: "Autre", slug: "autre-loisirs-et-creativite" },
            { name: "Atelier de création (poterie, couture, peinture)", slug: "atelier-de-creation-poterie-couture-peinture" },
            { name: "Atelier d'écriture", slug: "atelier-decriture" },
            { name: "Club de lecture / Book Club", slug: "club-de-lecture-book-club" },
            { name: "École de musique / Organisation", slug: "ecole-de-musique-organisation" },
            { name: "École de photographie", slug: "ecole-de-photographie" },
            { name: "Studio de photographie", slug: "studio-de-photographie" }
        ]
    },
    {
        name: "Mode et shopping",
        slug: "mode-et-shopping",
        subcategories: [
            { name: "Autre", slug: "autre-mode-et-shopping" },
            { name: "Créateur/trice de vêtements, accessoires", slug: "createur-de-vetements-accessoires" },
            { name: "Organisateur d'atelier de seconde main", slug: "organisateur-datelier-de-seconde-main" },
            { name: "Personal shopper", slug: "personal-shopper" }
        ]
    },
    {
        name: "Produits",
        slug: "produits",
        subcategories: [
            { name: "Autre", slug: "autre-produits" },
            { name: "Accessoires de yoga / sport", slug: "accessoires-de-yoga-sport" },
            { name: "Beauté et hygiène, cosmétique", slug: "beaute-et-hygiene-cosmetique" },
            { name: "Box bien-être", slug: "box-bien-etre" }
        ]
    },
    {
        name: "Services à domicile",
        slug: "services-a-domicile",
        subcategories: [
            { name: "Autre", slug: "autre-services-a-domicile" },
            { name: "Assistant personnel", slug: "assistant-personnel" },
            { name: "Chef privé", slug: "chef-prive" },
            { name: "Coiffure à domicile", slug: "coiffure-a-domicile" },
            { name: "Esthétique à domicile", slug: "esthetique-a-domicile" },
            { name: "Massage à domicile", slug: "massage-a-domicile" }
        ]
    },
    {
        name: "Spiritualité et énergie",
        slug: "spiritualite-et-energie",
        subcategories: [
            { name: "Autre", slug: "autre-spiritualite-et-energie" },
            { name: "Astrologue/tarologue et autres pratiques", slug: "astrologue-tarologue-et-autres-pratiques" },
            { name: "Magnétiseur", slug: "magnetiseur" }
        ]
    },
    {
        name: "Sport et activités physiques",
        slug: "sport-et-activites-physiques",
        subcategories: [
            { name: "Autre", slug: "autre-sport" },
            { name: "Activités sur glace (ex: patinoire)", slug: "activites-sur-glace" },
            { name: "Activités terrestres", slug: "activites-terrestres" },
            { name: "Activités nautiques (aquagym, natation)", slug: "activites-nautiques" },
            { name: "Coach sportif", slug: "coach-sportif-sport" },
            { name: "Salle de danse", slug: "salle-de-danse" },
            { name: "Salle de sport", slug: "salle-de-sport" }
        ]
    },
    {
        name: "Voyages et expériences",
        slug: "voyages-et-experiences",
        subcategories: [
            { name: "Autre", slug: "autre-voyages" },
            { name: "Activités insolites", slug: "activites-insolites" },
            { name: "Agence de voyage", slug: "agence-de-voyage" },
            { name: "Guide touristique", slug: "guide-touristique" },
            { name: "Hôtels / Maisons d'hôte", slug: "hotels-maisons-dhote" },
            { name: "Organisateur de retraites bien-être", slug: "organisateur-de-retraites-bien-etre" },
            { name: "Séjours culturels", slug: "sejours-culturels" },
            { name: "Séjours à la nature", slug: "sejours-a-la-nature" }
        ]
    }
];

// 2. Load DB Categories
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'db_categories.json');
const dbCategories = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 3. Generate SQL
let sql = `
-- Sync Categories and Subcategories
DO $$
DECLARE
    main_cat_id UUID;
BEGIN
`;

codeCategories.forEach(cat => {
    // 3.1 Ensure Main Category
    sql += `
    -- Main Category: ${cat.name}
    -- Check if exists
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = '${cat.name.replace(/'/g, "''")}') THEN
        -- Optional: Update if needed, but for main cats usually we just ensure existence
        NULL;
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('${cat.name.replace(/'/g, "''")}', NULL, 'transaction', 15, 15);
    END IF;
    `;

    // 3.2 Ensure Subcategories
    cat.subcategories.forEach(sub => {
        sql += `
    -- Subcategory: ${sub.name}
    IF EXISTS (SELECT 1 FROM public.offer_categories WHERE name = '${sub.name.replace(/'/g, "''")}') THEN
        UPDATE public.offer_categories
        SET parent_name = '${cat.name.replace(/'/g, "''")}'
        WHERE name = '${sub.name.replace(/'/g, "''")}' AND (parent_name IS NULL OR parent_name <> '${cat.name.replace(/'/g, "''")}');
    ELSE
        INSERT INTO public.offer_categories (name, parent_name, commission_model, rate_first_order, rate_recurring)
        VALUES ('${sub.name.replace(/'/g, "''")}', '${cat.name.replace(/'/g, "''")}', 'transaction', 15, 15);
    END IF;
    `;
    });
});

sql += `
END $$;
`;

console.log(sql);
