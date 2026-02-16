
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const partners = [
    { name: 'Hairlust FR', category: 'Beauté', email: 'rhodia+hairlust@nowme.fr' },
    { name: 'Maison des Fragrances', category: 'Beauté', email: 'rhodia+maisondesfragrances@nowme.fr' },
    { name: 'Bonjour Drink', category: 'Bien-être', email: 'rhodia+bonjourdrink@nowme.fr' },
    { name: 'French Mush', category: 'Santé', email: 'rhodia+frenchmush@nowme.fr' },
    { name: 'La Couette Française', category: 'Maison', email: 'rhodia+lacouettefrancaise@nowme.fr' },
    { name: 'Deesup', category: 'Maison', email: 'rhodia+deesup@nowme.fr' },
    { name: 'Darty', category: 'Maison', email: 'rhodia+darty@nowme.fr' },
    { name: 'Fnac', category: 'Culture', email: 'rhodia+fnac@nowme.fr' },
    { name: 'MonBento', category: 'Lifestyle', email: 'rhodia+monbento@nowme.fr' },
    { name: 'Sport Découverte', category: 'Loisirs', email: 'rhodia+sportdecouverte@nowme.fr' },
    { name: 'ASMC', category: 'Loisirs', email: 'rhodia+asmc@nowme.fr' }
];

async function generateTempPassword() {
    return "NowmePartenaire2026!";
}

async function createPartner(partner) {
    console.log(`\n🚀 Processing ${partner.name}...`);

    // 1. Check if user already exists
    const { data: existingUser } = await supabase.rpc('get_user_id_by_email', {
        user_email: partner.email
    });

    let userId = existingUser;
    let isNewUser = false;

    if (!userId) {
        console.log(`   Creating Auth User for ${partner.email}...`);
        const password = await generateTempPassword();
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: partner.email,
            password: password,
            email_confirm: true,
            user_metadata: {
                first_name: 'Partenaire',
                last_name: partner.name
            }
        });

        if (authError) {
            console.error(`❌ Error creating auth user for ${partner.name}:`, authError.message);
            return;
        }
        userId = authData.user.id;
        isNewUser = true;
        console.log(`   ✅ Auth User created (ID: ${userId})`);
    } else {
        console.log(`   ℹ️ Auth User already exists (ID: ${userId})`);
    }

    // 2. Check/Create Partner Record
    const { data: existingPartner } = await supabase
        .from('partners')
        .select('id')
        .eq('contact_email', partner.email)
        .single();

    let partnerId = existingPartner?.id;

    if (!partnerId) {
        console.log(`   Creating Partner record...`);
        const { data: newPartner, error: partnerError } = await supabase
            .from('partners')
            .insert({
                business_name: partner.name,
                contact_name: `Responsable ${partner.name}`,
                contact_email: partner.email,
                description: `Catégorie: ${partner.category}`, // Added category to description instead
                status: 'approved',
                admin_notes: 'Affiliation Partner - Created via Script'
            })
            .select('id')
            .single();

        if (partnerError) {
            console.error(`❌ Error creating partner record for ${partner.name}:`, partnerError.message);
            return;
        }
        partnerId = newPartner.id;
        console.log(`   ✅ Partner record created (ID: ${partnerId})`);
    } else {
        console.log(`   ℹ️ Partner record already exists (ID: ${partnerId})`);
    }

    // 3. Link User Profile
    console.log(`   Linking User Profile...`);
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            user_id: userId,
            first_name: 'Partenaire',
            last_name: partner.name,
            email: partner.email,
            partner_id: partnerId
        }, { onConflict: 'user_id' });

    if (profileError) {
        console.error(`❌ Error updating profile for ${partner.name}:`, profileError.message);
    } else {
        console.log(`   ✅ Profile linked successfully`);
    }
}

async function main() {
    console.log('🏁 Starting Batch Partner Creation...');
    for (const partner of partners) {
        await createPartner(partner);
    }
    console.log('\n🎉 Batch Creation Complete!');
}

main().catch(console.error);
