import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const categories = [
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
            { name: "Coach sportif", slug: "coach-sportif" },
            { name: "Facilitateur de cercle de parole", slug: "facilitateur-de-cercle-de-parole" },
            { name: "Hypnothérapeute", slug: "hypnotherapeute" },
            { name: "Praticien de médecine alternative", slug: "praticien-de-medecine-alternative" },
            { name: "Psychologue", slug: "psychologue" },
            { name: "Thérapeute", slug: "therapeute" }
        ]
    },
    {
        name: "Loisirs et créativité",
        slug: "loisirs-et-creativite",
        subcategories: [
            { name: "Autre", slug: "autre-loisirs-et-creativite" },
            { name: "Atelier de création (poterie, couture, peinture)", slug: "atelier-de-creation-poterie-couture-peinture" },
            { name: "Atelier d'écriture", slug: "atelier-decriture" },
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
            { name: "Magnétiseur", slug: "magnetiseur" },
            { name: "Méditation", slug: "meditation" }
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

async function syncCategories() {
    console.log('Syncing categories...');

    for (const cat of categories) {
        // Upsert parent
        const { error: catError } = await supabase
            .from('offer_categories')
            .upsert({
                slug: cat.slug,
                name: cat.name,
                parent_slug: null,
                parent_name: null
            }, { onConflict: 'slug' });

        if (catError) {
            console.error(`Error upserting category ${cat.name}:`, catError);
            continue;
        }

        // Upsert subcategories
        if (cat.subcategories) {
            for (const sub of cat.subcategories) {
                const { error: subError } = await supabase
                    .from('offer_categories')
                    .upsert({
                        slug: sub.slug,
                        name: sub.name,
                        parent_slug: cat.slug,
                        parent_name: cat.name
                    }, { onConflict: 'slug' });

                if (subError) {
                    console.error(`Error upserting subcategory ${sub.name}:`, subError);
                } else {
                    // console.log(`Synced ${sub.name}`);
                }
            }
        }
    }
    console.log('Categories sync complete.');
}

syncCategories();
