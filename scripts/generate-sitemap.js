
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Need to insure dotenv is installed or load from .env manually if usually handled by Vite

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://nowme.fr';

// Static routes
const STATIC_ROUTES = [
    '/',
    '/tous-les-kiffs',
    '/abonnement',
    '/communaute',
    '/blog',
    '/qui-sommes-nous',
    '/devenir-partenaire',
    '/guide-public'
];

async function generateSitemap() {
    console.log('🗺️  Generating Sitemap...');

    let routes = [...STATIC_ROUTES];

    // 1. Fetch Offers
    console.log('   Fetching offers...');
    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, updated_at')
        .eq('status', 'approved');

    if (offersError) console.error('Error fetching offers:', offersError);
    else {
        offers.forEach(offer => {
            routes.push(`/offres/${offer.id}`);
        });
        console.log(`   ✅ Added ${offers.length} offers`);
    }

    // 2. Fetch Blog Posts
    console.log('   Fetching blog posts...');
    const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('slug, updated_at')
        .eq('status', 'published');

    if (postsError) console.error('Error fetching blog posts:', postsError);
    else {
        posts.forEach(post => {
            routes.push(`/blog/${post.slug}`);
        });
        console.log(`   ✅ Added ${posts.length} blog posts`);
    }

    // 3. Fetch Partners (Public Profiles)
    console.log('   Fetching partners...');
    const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, updated_at')
        .eq('status', 'approved');

    if (partnersError) console.error('Error fetching partners:', partnersError);
    else {
        partners.forEach(partner => {
            routes.push(`/partenaire/${partner.id}`);
        });
        console.log(`   ✅ Added ${partners.length} partners`);
    }

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

    // Write to public/sitemap.xml
    const publicPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(publicPath, sitemap);

    console.log(`✅ Sitemap created at ${publicPath}`);
    console.log(`   Total URLs: ${routes.length}`);
}

generateSitemap().catch(console.error);
