import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
    console.log('🔍 Analyze Duplicate Partners...');

    // 1. Fetch all partners
    const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, contact_email, created_at, business_name, status');

    if (partnersError) {
        console.error('Error fetching partners:', partnersError);
        return;
    }

    // 2. Fetch used partner_ids from user_profiles
    const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .not('partner_id', 'is', null);

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
    }

    const usedPartnerIds = new Set(profiles.map(p => p.partner_id));

    // 3. Group by email
    const partnersByEmail = {};
    partners.forEach(p => {
        const email = (p.contact_email || '').toLowerCase().trim();
        if (!email) return;
        if (!partnersByEmail[email]) partnersByEmail[email] = [];
        partnersByEmail[email].push(p);
    });

    // 4. Find duplicates
    let duplicateGroups = 0;
    let cleanableCount = 0;

    console.log('\n--- Duplicates Report ---');
    for (const [email, list] of Object.entries(partnersByEmail)) {
        if (list.length > 1) {
            duplicateGroups++;
            console.log(`\nEmail: ${email} (${list.length} records)`);

            const used = list.filter(p => usedPartnerIds.has(p.id));
            const unused = list.filter(p => !usedPartnerIds.has(p.id));

            if (used.length > 0) {
                console.log(`  ✅ Linked to users: ${used.map(p => `${p.id} (${p.status})`).join(', ')}`);
            } else {
                console.log(`  ⚠️ No linked users found.`);
            }

            if (unused.length > 0) {
                console.log(`  ❌ Candidates for deletion (Not linked):`);
                unused.forEach(p => {
                    console.log(`     - ID: ${p.id}, Status: ${p.status}, Created: ${p.created_at}, Name: ${p.business_name}`);
                });
                cleanableCount += unused.length;
            } else {
                console.log(`  ℹ️ All duplicates are linked to users. Manual review needed.`);
            }
        }
    }

    console.log('\n-------------------------');
    console.log(`Total duplicate groups: ${duplicateGroups}`);
    console.log(`Total records safe to delete: ${cleanableCount}`);
}

main().catch(console.error);
