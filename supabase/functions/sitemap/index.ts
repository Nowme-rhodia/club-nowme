
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Sitemap Edge Function Invoked")

const BASE_URL = 'https://club.nowme.fr'

// Initial static routes
const STATIC_ROUTES = [
    '/',
    '/tous-les-kiffs',
    '/abonnement',
    '/communaute',
    '/blog',
    '/qui-sommes-nous',
    '/devenir-partenaire',
    '/guide-public'
]

interface Offer {
    slug: string | null;
    updated_at: string;
}

interface BlogPost {
    slug: string | null;
    updated_at: string;
}

interface Partner {
    slug: string | null;
    updated_at: string;
}

Deno.serve(async (req) => {
    // 1. Initialize Supabase Client
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    try {
        let routes = [...STATIC_ROUTES]

        // 2. Fetch Active Offers
        const { data: offers, error: offersError } = await supabaseClient
            .from('offers')
            .select('slug, updated_at')
            .eq('status', 'approved')

        if (offersError) console.error("Error fetching offers:", offersError)
        if (offers) {
            (offers as Offer[]).forEach(offer => {
                if (offer.slug) routes.push(`/offres/${offer.slug}`)
            })
        }

        // 3. Fetch Published Blog Posts
        const { data: posts, error: postsError } = await supabaseClient
            .from('blog_posts')
            .select('slug, updated_at')
            .eq('status', 'published')

        if (postsError) console.error("Error fetching posts:", postsError)
        if (posts) {
            (posts as BlogPost[]).forEach(post => {
                if (post.slug) routes.push(`/blog/${post.slug}`)
            })
        }

        // 4. Fetch Active Partners
        const { data: partners, error: partnersError } = await supabaseClient
            .from('partners')
            .select('slug, updated_at')
            .eq('status', 'approved')

        if (partnersError) console.error("Error fetching partners:", partnersError)
        if (partners) {
            (partners as Partner[]).forEach(partner => {
                if (partner.slug) routes.push(`/partenaire/${partner.slug}`)
            })
        }

        // 5. Build XML
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`

        // 6. Return XML Response
        return new Response(sitemap, {
            headers: {
                "Content-Type": "application/xml",
                "Cache-Control": "public, max-age=3600, s-maxage=3600" // Cache for 1 hour
            }
        })

    } catch (err: any) {
        console.error("Sitemap Generation Error:", err)
        return new Response(`Error generating sitemap: ${err.message}`, { status: 500 })
    }
})
