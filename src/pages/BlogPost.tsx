import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Calendar, User, ArrowLeft, ArrowRight, Tag, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { BlogOfferCard } from '../components/BlogOfferCard';

interface BlogPost {
    title: string;
    excerpt: string;
    content: string;
    cover_image: string;
    author_name: string;
    published_at: string;
    category: string;
    location_tags: string[];
}

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Helper to split content by shortcode
    const contentParts = useMemo(() => {
        if (!post?.content) return [];
        // Regex matches [offer:UUID]
        const regex = /\[offer:([a-f0-9-]+)\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(post.content)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: post.content.slice(lastIndex, match.index)
                });
            }
            // Add the offer
            parts.push({
                type: 'offer',
                offerId: match[1]
            });
            lastIndex = regex.lastIndex;
        }
        // Add remaining text
        if (lastIndex < post.content.length) {
            parts.push({
                type: 'text',
                content: post.content.slice(lastIndex)
            });
        }
        return parts;
    }, [post?.content]);

    useEffect(() => {
        async function fetchPost() {
            if (!slug) return;
            try {
                // Using maybeSingle() to avoid 406 error if not found or filtered by RLS
                const { data, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .eq('slug', slug)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setPost(data);
                } else {
                    // If no data returned (404 or RLS hidden), redirect
                    console.log('Post not found or access denied (Draft?)');
                    navigate('/blog');
                }
            } catch (error) {
                console.error('Error fetching post:', error);
                navigate('/blog');
            } finally {
                setLoading(false);
            }
        }
        fetchPost();
    }, [slug, navigate]);

    async function handleSubscribe(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;

        setSubmitting(true);
        try {
            // @ts-ignore - Ignoring type error on insert for now
            const { error } = await supabase
                .from('newsletter_subscribers')
                .insert([{ email, source: 'blog_post_footer' }]);

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.success('Tu es déjà inscrite !');
                } else {
                    throw error;
                }
            } else {
                toast.success('Inscription réussie !');
                setEmail('');
            }
        } catch (error) {
            console.error('Error subscribing:', error);
            toast.error('Une erreur est survenue.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    if (!post) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <SEO
                title={`${post.title} - Blog NowMe`}
                description={post.excerpt}
                image={post.cover_image || ''}
            />
            {/* Structured Data (JSON-LD) for Blog Post */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "BlogPosting",
                    "headline": post.title,
                    "description": post.excerpt,
                    "image": post.cover_image || 'https://images.unsplash.com/photo-1544367563-12123d8965cd',
                    "datePublished": post.published_at,
                    "author": {
                        "@type": "Person",
                        "name": post.author_name || "L'équipe Nowme"
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "Nowme",
                        "logo": {
                            "@type": "ImageObject",
                            "url": "https://i.imgur.com/or3q8gE.png"
                        }
                    },
                    "mainEntityOfPage": {
                        "@type": "WebPage",
                        "@id": window.location.href
                    }
                })}
            </script>

            {/* Hero Image */}
            <div className="w-full h-[40vh] sm:h-[50vh] relative bg-gray-900">
                <img
                    src={post.cover_image || 'https://images.unsplash.com/photo-1544367563-12123d8965cd'}
                    alt={post.title}
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover transition-opacity duration-500"
                    onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                    onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80';
                        e.currentTarget.onerror = null; // Prevent infinite loop
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
                <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
                    <Breadcrumbs
                        items={[
                            { label: 'Blog', path: '/blog' },
                            { label: post.title }
                        ]}
                        className="mb-6"
                    />
                    <Link to="/blog" className="inline-flex items-center text-gray-500 hover:text-primary mb-8 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Retour au blog
                    </Link>

                    <div className="flex flex-wrap gap-4 items-center mb-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-50 text-primary">
                            <Tag className="w-3 h-3 mr-1" />
                            {post.category || 'Article'}
                        </span>
                        {post.location_tags && post.location_tags.length > 0 && post.location_tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                                <MapPin className="w-3 h-3 mr-1" />
                                {tag}
                            </span>
                        ))}
                        <span className="flex items-center text-gray-500 text-sm">
                            <Calendar className="w-4 h-4 mr-1.5" />
                            {format(new Date(post.published_at), 'd MMMM yyyy', { locale: fr })}
                        </span>
                        <span className="flex items-center text-gray-500 text-sm">
                            <User className="w-4 h-4 mr-1.5" />
                            {post.author_name}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 leading-tight">
                        {post.title}
                    </h1>

                    <div className="prose prose-pink prose-lg max-w-none">
                        {contentParts.map((part, index) => {
                            if (part.type === 'offer') {
                                return <BlogOfferCard key={index} offerId={part.offerId} />;
                            }
                            return (
                                <ReactMarkdown key={index} components={{
                                    blockquote: ({ node, ...props }) => (
                                        <div className="bg-pink-50 border-l-4 border-primary p-6 my-8 rounded-r-xl not-italic">
                                            <div className="font-semibold text-gray-900 mb-2">💡 Le conseil de la rédac</div>
                                            <div className="text-gray-700 m-0">
                                                {props.children}
                                            </div>
                                        </div>
                                    )
                                }}>
                                    {part.content}
                                </ReactMarkdown>
                            );
                        })}
                    </div>

                    {/* Club CTA */}
                    <div className="mt-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 sm:p-10 text-center text-white relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571388208497-71bedc66e932')] bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-700" />

                        <div className="relative z-10">
                            <h3 className="text-2xl sm:text-3xl font-bold mb-4">Envie de passer de la théorie à la pratique ?</h3>
                            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                                Rejoins le Club NowMe et accède à des expériences exclusives, une communauté bienveillante et des avantages chez nos partenaires.
                            </p>
                            <Link
                                to="/subscription"
                                className="inline-flex items-center px-8 py-4 rounded-full bg-primary text-white font-bold hover:bg-primary-dark transform hover:scale-105 transition-all shadow-lg shadow-pink-500/30"
                            >
                                Je découvre le Club
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                            <p className="mt-4 text-sm text-gray-400">Sans engagement. 1er mois à 12,99€</p>
                        </div>
                    </div>
                </div>

                {/* Newsletter form */}
                <div className="mt-12 bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center border-t-4 border-primary">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Cet article t'a plu ?</h3>
                    <p className="text-gray-600 mb-8">Rejoins la mif NowMe et reçois nos meilleures pépites directement par mail.</p>
                    <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="ton@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="px-6 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary-dark transition-colors shadow-lg whitespace-nowrap disabled:opacity-75"
                        >
                            Je m'abonne
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
