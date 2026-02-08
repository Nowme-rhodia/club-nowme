
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const slugs = [
        'on-zappe-cupidon-soiree-entre-copines-le-13-nowme-en-ligne',
        'veux-tu-t-epouser-conferences-dinner-gala-et-spa-nowme-serris',
        'karaoke-blind-test-massage-nowme-paris',
        'girlz-day-out-nowme-paris-1',
        'sejour-thailande-novembre-2026'
    ];

    let output = '--- PRICES ANALYSIS ---\n';

    const { data: offers, error } = await supabase
        .from('offers')
        .select('id, title, slug')
        .in('slug', slugs);

    if (error) {
        console.error('Error fetching offers:', error.message);
        return;
    }

    const offerIds = offers.map(o => o.id);
    const { data: variants, error: varError } = await supabase
        .from('offer_variants')
        .select('offer_id, name, price, discounted_price')
        .in('offer_id', offerIds);

    if (varError) {
        console.error("Variants error:", varError.message);
        return;
    }

    /* 
       Logic:
       If 'discounted_price' exists, it is the member price. 'price' is the public price.
       If 'discounted_price' is null, maybe member price is same as public? Or maybe it's not set.
       We will list whatever we have.
    */

    for (const offer of offers) {
        const offerVariants = variants.filter(v => v.offer_id === offer.id);
        output += `\nOffer: ${offer.title} (${offer.slug})\n`;
        if (offerVariants.length === 0) {
            output += "  No variants found.\n";
        } else {
            offerVariants.forEach(v => {
                output += `  Variant: ${v.name || 'Default'}\n`;
                output += `    Public Price: ${v.price}€\n`;
                output += `    Member Price: ${v.discounted_price !== null ? v.discounted_price : 'N/A'}€\n`;
            });
        }
    }

    fs.writeFileSync('price_analysis.txt', output);
    console.log("Analysis written to price_analysis.txt");
}

main();
