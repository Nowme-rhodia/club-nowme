
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkHistory() {
    const userId = '693b751f-6b94-4886-a65e-edf6fd1ef354';

    // 1. Get History sorted by date
    const { data: history, error } = await supabase
        .from('reward_history')
        .select('created_at, amount, type, reason, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log("--- HISTORIQUE DES TRANSACTIONS ---");
    let balance = 0;
    let credit = 0;

    history.forEach(h => {
        balance += h.amount;
        const isUnlock = h.metadata?.credit_eur;
        if (isUnlock) credit += h.metadata.credit_eur;

        console.log(`[${new Date(h.created_at).toLocaleTimeString()}] ${h.type.toUpperCase()}: ${h.amount}pts | Reason: ${h.reason} | CreditAdded: ${isUnlock ? h.metadata.credit_eur + '€' : '0€'}`);
    });

    console.log("-----------------------------------");
    console.log(`TOTAL POINTS SOLDE: ${balance}`);
    console.log(`TOTAL CAGNOTTE EUR: ${credit}€`);

    // Verify DB State
    const { data: dbState } = await supabase.from('member_rewards').select('*').eq('user_id', userId).single();
    console.log("DB STATE:", dbState);
}

checkHistory().catch(console.error)
