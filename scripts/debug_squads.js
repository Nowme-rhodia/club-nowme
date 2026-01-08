import { createClient } from '@supabase/supabase-js';

// Helper to get env var
const getEnv = (key) => process.env[key] || process.env[`VITE_${key}`];

const url = getEnv('SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

if (!url || !key) {
    console.error('Missing credentials. URL:', !!url, 'Key:', !!key);
    // Don't exit, just try to continue to see what envs we have
    // process.exit(1);
    console.log("Envs:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

const supabase = createClient(url, key);

async function run() {
    // 1. Fetch data
    const { data: squads } = await supabase.from('micro_squads').select('*').eq('title', 'bik');
    const { data: hubs } = await supabase.from('community_hubs').select('*').ilike('name', '%Est Francilien%');

    if (!squads?.length || !hubs?.length) {
        console.log("Missing data");
        return;
    }

    const squad = squads[0];
    const hub = hubs[0];

    console.log("Squad Location:", squad.location);
    console.log("Hub Name:", hub.name);
    console.log("Hub City:", hub.city);

    // 2. Simulate MicroSquadList Logic
    const hubName = hub.name;
    const hubCity = hub.city;
    const textToScan = ((hubName || '') + ' ' + (hubCity || '')).toLowerCase();

    console.log("Text to scan:", textToScan);

    const deptMatches = textToScan.match(/\b(97\d|2A|2B|[0-9]{2})\b/g) || [];

    if (textToScan.includes('paris') || textToScan.includes('banlieue')) {
        deptMatches.push('75', '92', '93', '94');
    }
    if (textToScan.includes('est') || textToScan.includes('77') || textToScan.includes('91')) deptMatches.push('77', '91');
    if (textToScan.includes('ouest') || textToScan.includes('78') || textToScan.includes('95')) deptMatches.push('78', '95');

    const uniqueTargetDepts = [...new Set(deptMatches)];
    console.log("Target Depts:", uniqueTargetDepts);

    // Check match
    const location = squad.location || "";
    // Regex from component: /\b(97\d|2A|2B|[0-9]{2})[0-9]{3}\b/
    const eventDeptMatch = location.match(/\b(97\d|2A|2B|[0-9]{2})[0-9]{3}\b/);
    const eventDept = eventDeptMatch ? eventDeptMatch[1] : null;

    console.log("Event extracted Dept:", eventDept);

    const isMatch = eventDept && uniqueTargetDepts.includes(eventDept);
    console.log("Is Match?", isMatch);
}

run();
