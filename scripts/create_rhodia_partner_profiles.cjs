const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// All rhodia+ accounts - we'll skip rhodia+abonne@example.com (test account)
const RHODIA_PARTNERS = [
    {
        email: 'rhodia+bonjourdrink@nowme.fr',
        business_name: 'Bonjour Drink',
        slug: 'bonjour-drink',
        description: `Bonjour Drink, c'est la box de boissons healthy et savoureuses livrée directement chez vous. Thés, infusions, lattes et boissons fonctionnelles soigneusement sélectionnés pour allier plaisir, bien-être et rituals de pause au quotidien.

Chaque box est une invitation à ralentir, à prendre soin de soi autour d'une boisson chaleureuse et bonne pour la santé.`,
        website: 'https://www.bonjourdrink.fr',
        instagram: '@bonjourdrink',
        contact_email: 'hello@bonjourdrink.fr',
        category_slug: 'produits', // food/beverage/products
    },
    {
        email: 'rhodia+darty@nowme.fr',
        business_name: 'Darty',
        slug: 'darty',
        description: `Darty, le spécialiste de l'électroménager et de l'électronique en France, vous propose des offres exclusives pour les membres du Club Nowme.

Du petit électroménager aux appareils high-tech, bénéficiez de tarifs préférentiels et du célèbre service après-vente Darty pour équiper votre quotidien en toute sérénité.`,
        website: 'https://www.darty.com',
        instagram: '@darty_fr',
        contact_email: 'partenaires@darty.com',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+asmc@nowme.fr',
        business_name: 'ASMC',
        slug: 'asmc',
        description: `ASMC est une enseigne spécialisée dans l'équipement outdoor, le sport et l'aventure. Vêtements techniques, chaussures de randonnée, matériel de camping : tout pour vos aventures en plein air.

Retrouvez une sélection exclusive de produits de grandes marques outdoor avec des avantages réservés aux membres Club Nowme.`,
        website: 'https://www.asmc.fr',
        instagram: '@asmc_france',
        contact_email: 'contact@asmc.fr',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+hairlust@nowme.fr',
        business_name: 'Hairlust',
        slug: 'hairlust',
        description: `Hairlust est une marque scandinave de soins capillaires naturels pensée pour sublimer tous les types de cheveux. Des shampoings aux compléments alimentaires pour la pousse des cheveux, leurs produits sont formulés avec des ingrédients clean et efficaces.

Parce que prendre soin de ses cheveux, c'est aussi prendre soin de soi.`,
        website: 'https://www.hairlust.fr',
        instagram: '@hairlust_france',
        contact_email: 'fr@hairlust.com',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+frenchmush@nowme.fr',
        business_name: 'French Mush',
        slug: 'french-mush',
        description: `French Mush propose des produits à base de champignons fonctionnels (lion's mane, reishi, chaga…) pour booster naturellement votre énergie, votre concentration et votre bien-être.

Poudres, capsules et lattes adaptogènes : une nouvelle façon de prendre soin de soi par la nature.`,
        website: 'https://www.frenchmush.fr',
        instagram: '@frenchmush',
        contact_email: 'hello@frenchmush.fr',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+lacouettefrancaise@nowme.fr',
        business_name: 'La Couette Française',
        slug: 'la-couette-francaise',
        description: `La Couette Française fabrique des couettes, oreillers et duvets haut de gamme, 100% fabriqués en France avec des matières naturelles et responsables. 

Dormez mieux, dormez éco-responsable. Chaque produit est conçu pour durer et vous offrir le meilleur confort nuit après nuit.`,
        website: 'https://www.lacouettefrancaise.fr',
        instagram: '@lacouettefrancaise',
        contact_email: 'contact@lacouettefrancaise.fr',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+fnac@nowme.fr',
        business_name: 'Fnac',
        slug: 'fnac',
        description: `La Fnac, c'est le spécialiste culturel et tech incontournable : livres, musique, cinéma, jeux vidéo, high-tech et appareils photo. 

En tant que membre Club Nowme, profitez d'offres et de remises exclusives pour nourrir votre curiosité et vos passions au meilleur prix.`,
        website: 'https://www.fnac.com',
        instagram: '@fnac',
        contact_email: 'partenaires@fnac.com',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+monbento@nowme.fr',
        business_name: 'monbento',
        slug: 'monbento',
        description: `monbento est une marque française qui crée des lunchboxes et accessoires design pour emporter ses repas faits maison partout. Pratique, stylé, éco-responsable : dites au revoir aux emballages jetables.

Parce que bien manger en déplacement, c'est aussi une façon de prendre soin de soi.`,
        website: 'https://www.monbento.com',
        instagram: '@monbento',
        contact_email: 'contact@monbento.com',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+maisondesfragrances@nowme.fr',
        business_name: 'Maison des Fragrances',
        slug: 'maison-des-fragrances',
        description: `La Maison des Fragrances vous invite dans l'univers envoûtant de la parfumerie. Découvrez une sélection de parfums d'exception, bougies et cosmétiques parfumés issus des plus belles maisons françaises et internationales.

Un voyage sensoriel pour vous, un cadeau d'exception pour celles que vous aimez.`,
        website: 'https://www.maisondesfragrances.com',
        instagram: '@maisondesfragrances',
        contact_email: 'contact@maisondesfragrances.com',
        category_slug: 'produits',
    },
    {
        email: 'rhodia+deesup@nowme.fr',
        business_name: 'Dee Sup',
        slug: 'dee-sup',
        description: `Dee Sup est une école de Stand-Up Paddle basée en Île-de-France. Cours pour débutants, sessions de yoga-SUP, balades guidées sur l'eau : une activité sportive et zen à la fois, idéale pour se ressourcer et se dépasser.

Rejoignez la communauté des riders et vivez une expérience unique sur l'eau.`,
        website: 'https://www.deesup.fr',
        instagram: '@deesup',
        contact_email: 'contact@deesup.fr',
        category_slug: 'sport-et-detente',
    },
    {
        email: 'rhodia+sportdecouverte@nowme.fr',
        business_name: 'Sport Découverte',
        slug: 'sport-decouverte',
        description: `Sport Découverte est la plateforme de référence pour réserver des activités sportives et de loisirs : karting, parachutisme, paintball, cours de pilotage, yoga, surf et bien plus encore.

Plus de 4 000 activités à travers toute la France pour sortir de votre zone de confort et vivre des expériences inoubliables.`,
        website: 'https://www.sport-decouverte.com',
        instagram: '@sportdecouverte',
        contact_email: 'contact@sport-decouverte.com',
        category_slug: 'sport-et-detente',
    },
];

async function main() {
    // Get all categories
    const { data: categories } = await supabase
        .from('offer_categories')
        .select('id, name, slug, parent_name, parent_slug');

    const categoryBySlug = {};
    categories.forEach(c => categoryBySlug[c.slug] = c);

    console.log('Available categories:', categories.map(c => c.slug).join(', '));

    // Get all user_profiles for rhodia+ emails
    const emails = RHODIA_PARTNERS.map(p => p.email);
    const { data: users, error: userErr } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('email', emails);

    if (userErr) { console.error('Error fetching users:', userErr); return; }

    const userByEmail = {};
    users.forEach(u => userByEmail[u.email] = u);

    // Check which ones already have a partner profile
    const userIds = users.map(u => u.id);
    const { data: existingPartners } = await supabase
        .from('partners')
        .select('id, user_id, business_name')
        .in('user_id', userIds);

    const existingUserIds = new Set((existingPartners || []).map(p => p.user_id));
    console.log(`\nExisting partner profiles: ${existingPartners?.length || 0}`);
    existingPartners?.forEach(p => console.log(`  - ${p.business_name}`));

    // Insert missing partner profiles
    let createdCount = 0;
    let skippedCount = 0;

    for (const partnerData of RHODIA_PARTNERS) {
        const user = userByEmail[partnerData.email];
        if (!user) {
            console.error(`\n⚠️  No user found in user_profiles for ${partnerData.email}`);
            continue;
        }

        if (existingUserIds.has(user.id)) {
            console.log(`\n⏩ Skipping ${partnerData.business_name} - already has a partner profile`);
            skippedCount++;
            continue;
        }

        // 1. Ensure auth.user exists and sync IDs
        let authUserId = user.id;
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(user.id);

        if (authErr && authErr.status === 404) {
            console.log(`\n⚙️  Syncing auth.users ID for ${partnerData.email}`);
            // Find the user by email in auth.users
            const { data: authUsersList } = await supabase.auth.admin.listUsers();
            const existingAuthUser = authUsersList?.users?.find(u => u.email === partnerData.email);

            if (existingAuthUser) {
                console.log(`Found matching auth.user with ID ${existingAuthUser.id}. Updating user_profile...`);
                // We can't simply update the ID column of user_profiles because it might be a primary key, 
                // but let's try. Supabase allows it if no foreign key constraints block it.
                const { error: updateErr } = await supabase
                    .from('user_profiles')
                    .update({ id: existingAuthUser.id })
                    .eq('email', partnerData.email);

                if (updateErr) {
                    console.error(`❌ Failed to update user_profile ID:`, updateErr.message);
                    // If updating ID fails, let's just use the auth ID for the partner table anyway
                } else {
                    console.log(`✅ Synced user_profile ID`);
                }
                authUserId = existingAuthUser.id;
                user.id = authUserId;
            } else {
                // If totally missing, create it
                console.log(`\n⚙️  Creating auth.users entry for ${partnerData.email}`);
                const { error: createAuthErr } = await supabase.auth.admin.createUser({
                    email: partnerData.email,
                    email_confirm: true,
                    password: 'NowmePartner2026!',
                    user_metadata: { first_name: partnerData.business_name, last_name: 'Partenaire' }
                });

                if (createAuthErr) {
                    console.error(`❌ Failed to create auth user for ${partnerData.email}:`, createAuthErr.message);
                    continue;
                }

                // Fetch the new one
                const { data: newAuthData } = await supabase.auth.admin.listUsers();
                const newAuthUser = newAuthData?.users?.find(u => u.email === partnerData.email);
                if (newAuthUser) {
                    await supabase.from('user_profiles').update({ id: newAuthUser.id }).eq('email', partnerData.email);
                    authUserId = newAuthUser.id;
                    user.id = authUserId;
                }
            }
        }

        // Find the category ID
        const cat = categoryBySlug[partnerData.category_slug];
        const mainCategoryId = cat ? cat.id : null;

        let currentSlug = `${partnerData.slug}-france`;
        let success = false;
        let attempts = 0;

        while (!success && attempts < 3) {
            const insertData = {
                user_id: user.id,
                business_name: partnerData.business_name,
                slug: currentSlug,
                description: partnerData.description,
                website: partnerData.website,
                instagram: partnerData.instagram,
                contact_email: partnerData.contact_email,
                status: 'approved',
                main_category_id: mainCategoryId,
                commission_rate: 15,
                commission_model: 'fixed',
                payout_method: 'manual',
                settlement_day: 5,
                welcome_sent: true,
                notification_settings: {
                    new_booking: true,
                    booking_reminder: true,
                    booking_cancellation: true,
                    marketing: false
                },
            };

            const { data: created, error: insertErr } = await supabase
                .from('partners')
                .insert(insertData)
                .select('id, business_name, slug')
                .single();

            if (insertErr) {
                if (insertErr.code === '23505' && insertErr.message.includes('slug')) {
                    console.log(`⚠️  Slug conflict for ${partnerData.business_name} with slug ${currentSlug}. Trying another...`);
                    currentSlug = `${partnerData.slug}-${Math.floor(Math.random() * 1000)}-france`;
                    attempts++;
                } else {
                    console.error(`\n❌ Error creating ${partnerData.business_name}:`, insertErr.message);
                    break;
                }
            } else {
                console.log(`\n✅ Created ${created.business_name} (slug: ${created.slug})`);
                createdCount++;
                success = true;
            }
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped: ${skippedCount}`);
}

main();
