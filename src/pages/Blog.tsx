import React, { useEffect, useState } from 'react';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Calendar, User, ArrowRight, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    cover_image: string;
    author_name: string;
    published_at: string;
}

export default function Blog() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    async function fetchPosts() {
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('status', 'published')
                .order('published_at', { ascending: false });

            if (error) throw error;
            if (data) setPosts(data);
        } catch (error) {
            console.error('Error fetching posts:', error);
            // Fallback/Silent error or toast if critical
        } finally {
            setLoading(false);
        }
    }

    async function handleSubscribe(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('newsletter_subscribers')
                .insert([{ email, source: 'blog_footer' }]);

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.success('Tu es déjà inscrite !');
                } else {
                    throw error;
                }
            } else {
                toast.success('Inscription réussie ! Bienvenue dans la mif.');
                setEmail('');
            }
        } catch (error) {
            console.error('Error subscribing:', error);
            toast.error('Une erreur est survenue. Réessaie plus tard.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Blog - Le Club NowMe"
                description="Retrouvez nos articles, astuces et inspirations pour kiffer votre quotidien."
            />

            {/* Hero Section */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
                    <div className="flex justify-center mb-4">
                        <Breadcrumbs items={[{ label: 'Blog' }]} />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                        Le Blog <span className="text-primary">NowMe</span>
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Inspiration, lifestyle, bons plans... Tout ce qu'il faut pour pimenter ton quotidien et lâcher prise.
                    </p>
                </div>
            </div>

            {/* Blog Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {posts.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">Aucun article pour le moment. Reviens vite !</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => (
                            <article
                                key={post.id}
                                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col h-full"
                            >
                                {/* Image */}
                                <div className="relative h-48 sm:h-56 overflow-hidden group">
                                    <img
                                        src={post.cover_image || 'https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&q=80'}
                                        alt={post.title}
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80';
                                            e.currentTarget.onerror = null;
                                        }}
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-primary backdrop-blur-sm shadow-sm">
                                            <Tag className="w-3 h-3 mr-1" />
                                            {post.category || 'Lifestyle'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-6 flex flex-col">
                                    <div className="flex items-center text-sm text-gray-500 mb-3 space-x-4">
                                        <div className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1.5" />
                                            {format(new Date(post.published_at), 'd MMM yyyy', { locale: fr })}
                                        </div>
                                        <div className="flex items-center">
                                            <User className="w-4 h-4 mr-1.5" />
                                            {post.author_name}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                        <Link to={`/blog/${post.slug}`}>
                                            {post.title}
                                        </Link>
                                    </h3>

                                    <p className="text-gray-600 mb-4 line-clamp-3 text-sm flex-1">
                                        {post.excerpt}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-400 font-medium">
                                            {/* Placeholder read time, could be calculated from content length */}
                                            5 min de lecture
                                        </span>
                                        <Link
                                            to={`/blog/${post.slug}`}
                                            className="text-primary font-medium text-sm inline-flex items-center hover:text-primary-dark transition-colors"
                                        >
                                            Lire la suite <ArrowRight className="w-4 h-4 ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {/* Newsletter / CTA */}
                <div className="mt-16 bg-primary rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden relative">
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                            Ne rate plus aucune miette !
                        </h2>
                        <p className="text-pink-100 mb-8 mb-8">
                            Inscris-toi à la newsletter pour recevoir nos derniers articles et les offres exclusives directement dans ta boîte mail.
                        </p>
                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="ton@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="px-6 py-3 rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 w-full"
                            />
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-8 py-3 bg-white text-primary font-bold rounded-full hover:bg-pink-50 transition-colors shadow-lg whitespace-nowrap disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                {submitting ? '...' : "Je m'inscris"}
                            </button>
                        </form>
                    </div>

                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10" />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-10" />
                </div>
            </div>
        </div>
    );
}
