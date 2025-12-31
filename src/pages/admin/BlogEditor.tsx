import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Image as ImageIcon, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

interface BlogPostForm {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    cover_image: string;
    category: string;
    author_name: string;
    status: 'draft' | 'published';
    location_tags: string[]; // ['Paris', '75001']
}

interface Offer {
    id: string;
    title: string;
    offer_categories: { name: string } | null;
}

export default function BlogEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<BlogPostForm>({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        cover_image: '',
        category: '',
        author_name: 'Team NowMe',
        status: 'draft',
        location_tags: [],
    });

    // Offer picker state
    const [showOfferPicker, setShowOfferPicker] = useState(false);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [offerSearch, setOfferSearch] = useState('');

    // Initial load
    useEffect(() => {
        if (id) {
            loadPost(id);
        }
        loadOffers();
    }, [id]);

    async function loadPost(postId: string) {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) {
            toast.error('Erreur chargement article');
            navigate('/admin/blog');
        } else if (data) {
            setFormData({
                title: data.title,
                slug: data.slug,
                excerpt: data.excerpt || '',
                content: data.content || '',
                cover_image: data.cover_image || '',
                category: data.category || '',
                author_name: data.author_name || 'Rhodia',
                status: data.status as 'draft' | 'published',
                location_tags: data.location_tags || [],
            });
        }
    }

    async function loadOffers() {
        const { data } = await supabase
            .from('offers')
            .select('id, title, offer_categories(name)')
            .limit(50);
        setOffers(data || []);
    }

    // Word count logic
    const wordCount = useMemo(() => {
        return formData.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    }, [formData.content]);

    const isWordCountValid = wordCount >= 300;

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('blog-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, cover_image: data.publicUrl }));
            toast.success('Image téléchargée avec succès !');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Erreur lors du téléchargement de l\'image');
        } finally {
            setUploading(false);
            // Reset input so duplicate uploads of same file can trigger change
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    function insertMarkdown(prefix: string, suffix: string) {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = formData.content;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newContent = `${before}${prefix}${selection}${suffix}${after}`;

        setFormData(prev => ({ ...prev, content: newContent }));

        // Restore focus and cursor
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(
                    start + prefix.length,
                    end + prefix.length
                );
            }
        }, 0);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                updated_at: new Date().toISOString(),
            };

            if (id) {
                const { error } = await supabase
                    .from('blog_posts')
                    .update(payload)
                    .eq('id', id);
                if (error) throw error;
                toast.success('Article mis à jour');
            } else {
                const { error } = await supabase
                    .from('blog_posts')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Article créé');
            }
            navigate('/admin/blog');
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setLoading(false);
        }
    }

    function insertOffer(offerId: string) {
        const shortcode = `\n\n[offer:${offerId}]\n\n`;
        setFormData(prev => ({
            ...prev,
            content: prev.content + shortcode
        }));
        setShowOfferPicker(false);
        toast.success('Offre insérée !');
    }

    const filteredOffers = offers.filter(o =>
        o.title.toLowerCase().includes(offerSearch.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/blog')} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {id ? 'Modifier l\'article' : 'Nouvel article'}
                    </h1>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors flex items-center disabled:opacity-50"
                >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Column */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="draft">Brouillon</option>
                                    <option value="published">Publié</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags Localisation (séparés par des virgules)</label>
                                <input
                                    type="text"
                                    placeholder="Paris, 75011, Ile-de-France"
                                    value={formData.location_tags.join(', ')}
                                    onChange={e => setFormData(prev => ({ ...prev, location_tags: e.target.value.split(',').map(t => t.trim()) }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Duplicate block removed */}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Image de couverture</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.cover_image}
                                    placeholder="https://... ou téléchargez une image"
                                    onChange={e => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="p-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center min-w-[42px]"
                                >
                                    {uploading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                                    ) : (
                                        <ImageIcon className="w-5 h-5 text-gray-500" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Résumé SEO</label>
                            <textarea
                                value={formData.excerpt}
                                onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                                rows={3}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm relative">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-gray-700">Contenu (Markdown)</label>
                            <div className="flex items-center gap-4">
                                {/* Word Counter */}
                                <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${isWordCountValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {wordCount} mots
                                </span>
                                <button
                                    onClick={() => setShowOfferPicker(!showOfferPicker)}
                                    className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                                >
                                    + Ajouter une offre
                                </button>
                            </div>
                        </div>

                        {/* Formatting Toolbar */}
                        <div className="flex bg-gray-50 p-2 rounded-t-lg border border-b-0 border-gray-200 gap-2 mb-0">
                            <button onClick={() => insertMarkdown('**', '**')} className="p-1 hover:bg-white rounded font-bold w-8" title="Gras">B</button>
                            <button onClick={() => insertMarkdown('*', '*')} className="p-1 hover:bg-white rounded italic w-8 font-serif" title="Italique">I</button>
                            <button onClick={() => insertMarkdown('### ', '')} className="p-1 hover:bg-white rounded font-bold w-8 text-sm" title="Titre 3">H3</button>
                            <button onClick={() => insertMarkdown('- ', '')} className="p-1 hover:bg-white rounded w-8" title="Liste">•</button>
                        </div>

                        {/* Offer Picker Dropdown */}
                        {showOfferPicker && (
                            <div className="absolute right-6 top-16 z-10 w-64 bg-white border shadow-xl rounded-lg p-2 max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-white pb-2 border-b mb-2">
                                    <div className="relative">
                                        <Search className="w-3 h-3 absolute left-2 top-2 text-gray-400" />
                                        <input
                                            className="w-full pl-7 pr-2 py-1 text-sm border rounded"
                                            placeholder="Chercher une offre..."
                                            value={offerSearch}
                                            onChange={e => setOfferSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {filteredOffers.map(offer => (
                                    <button
                                        key={offer.id}
                                        onClick={() => insertOffer(offer.id)}
                                        className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded truncate"
                                    >
                                        {offer.title}
                                    </button>
                                ))}
                            </div>
                        )}

                        <textarea
                            ref={textareaRef}
                            value={formData.content}
                            onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            rows={20}
                            className="w-full px-4 py-2 border rounded-b-lg rounded-t-none  focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm -mt-2"
                        />
                    </div>
                </div>

                {/* Preview Column */}
                <div className="space-y-6">
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 min-h-[500px]">
                        <h2 className="text-xl font-bold mb-4 text-gray-400 uppercase tracking-widest">Prévisualisation</h2>

                        <div className="prose prose-pink max-w-none bg-white p-8 rounded-xl shadow-sm">
                            <h1>{formData.title}</h1>
                            {formData.cover_image && (
                                <img src={formData.cover_image} alt="Cover" className="w-full h-48 object-cover rounded-lg mb-4" />
                            )}
                            <div className="flex gap-2 mb-4">
                                {formData.location_tags.map(tag => (
                                    <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">{tag}</span>
                                ))}
                            </div>
                            <ReactMarkdown>
                                {formData.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
