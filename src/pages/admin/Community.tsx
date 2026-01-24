import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Layout,
    MessageSquare,
    Megaphone,
    Image as ImageIcon,
    Send,
    Trash2,
    Eye,
    EyeOff,
    Plus,
    Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- TYPES ---
interface CommunityContent {
    id: string;
    type: 'announcement' | 'kiff';
    title: string;
    content: string;
    image_url?: string;
    is_active: boolean;
    created_at: string;
}

interface Suggestion {
    id: string;
    suggestion_text: string;
    created_at: string;
    user_profiles: {
        email: string;
        first_name: string;
        last_name: string;
    };
}

// --- COMPONENTS ---

export default function AdminCommunity() {
    const [activeTab, setActiveTab] = useState<'content' | 'suggestions'>('content');
    const [contents, setContents] = useState<CommunityContent[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newContent, setNewContent] = useState({
        type: 'announcement' as 'announcement' | 'kiff',
        title: '',
        content: '',
        image_url: ''
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'content') {
                const { data, error } = await supabase
                    .from('community_content')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setContents(data || []);
            } else {
                const { data, error } = await supabase
                    .from('community_suggestions')
                    .select('*, user_profiles(email, first_name, last_name)')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setSuggestions(data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Erreur chargement données');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                const { error } = await supabase
                    .from('community_content')
                    .update(newContent as any)
                    .eq('id', editId);
                if (error) throw error;
                toast.success('Contenu mis à jour !');
            } else {
                const { error } = await supabase
                    .from('community_content')
                    .insert([newContent] as any);
                if (error) throw error;
                toast.success('Contenu publié !');
            }

            setShowForm(false);
            setEditId(null);
            setNewContent({ type: 'announcement', title: '', content: '', image_url: '' });
            fetchData();
        } catch (error) {
            console.error('Error saving content:', error);
            toast.error('Erreur sauvegarde');
        }
    };

    const handleEdit = (item: CommunityContent) => {
        setNewContent({
            type: item.type,
            title: item.title,
            content: item.content,
            image_url: item.image_url || ''
        });
        setEditId(item.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleActive = async (id: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('community_content')
                .update({ is_active: !currentState } as any)
                .eq('id', id);

            if (error) throw error;
            fetchData();
            toast.success('Statut mis à jour');
        } catch (error) {
            toast.error('Erreur mise à jour');
        }
    };

    const deleteContent = async (id: string) => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce contenu ?')) return;
        try {
            const { error } = await supabase
                .from('community_content')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchData();
            toast.success('Contenu supprimé');
        } catch (error) {
            toast.error('Erreur suppression');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion Communauté</h1>
                    <p className="text-gray-500">Gérez les annonces, les kiffs et écoutez vos membres.</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'content' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5" />
                        Contenu & Annonces
                    </div>
                    {activeTab === 'content' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'suggestions' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Boîte à Idées
                    </div>
                    {activeTab === 'suggestions' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {/* CONTENT TAB */}
            {activeTab === 'content' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setShowForm(!showForm);
                                setEditId(null);
                                setNewContent({ type: 'announcement', title: '', content: '', image_url: '' });
                            }}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Nouveau Contenu
                        </button>
                    </div>

                    {/* CREATE FORM */}
                    {showForm && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
                            <h3 className="text-lg font-bold mb-4">{editId ? 'Modifier la publication' : 'Créer une publication'}</h3>
                            <form onSubmit={handleCreateContent} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            value={newContent.type}
                                            onChange={(e) => setNewContent({ ...newContent, type: e.target.value as any })}
                                            className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                        >
                                            <option value="announcement">Annonce (Texte court / Alerte)</option>
                                            <option value="kiff">Kiff (Image + Article)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                                        <input
                                            type="text"
                                            value={newContent.title}
                                            onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {newContent.type === 'announcement' ? 'Message' : 'Contenu de l\'article'}
                                    </label>
                                    <textarea
                                        value={newContent.content}
                                        onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                                        rows={4}
                                        className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                        required
                                    />
                                </div>

                                {newContent.type === 'kiff' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                        <input
                                            type="url"
                                            value={newContent.image_url}
                                            onChange={(e) => setNewContent({ ...newContent, image_url: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                            placeholder="https://..."
                                        />
                                    </div>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            setEditId(null);
                                            setNewContent({ type: 'announcement', title: '', content: '', image_url: '' });
                                        }}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                                    >
                                        {editId ? 'Mettre à jour' : 'Publier'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* CONTENT LIST */}
                    <div className="grid gap-4">
                        {contents.map((item) => (
                            <div key={item.id} className={`bg-white p-4 rounded-xl border flex items-center gap-4 ${!item.is_active ? 'opacity-60 bg-gray-50' : 'border-gray-100 shadow-sm'}`}>
                                <div className={`p-3 rounded-lg ${item.type === 'announcement' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {item.type === 'announcement' ? <Megaphone className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                        {!item.is_active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactif</span>}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-1">{item.content}</p>
                                    <div className="text-xs text-gray-400 mt-1">Publié le {new Date(item.created_at).toLocaleDateString()}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleActive(item.id, item.is_active)}
                                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                                        title={item.is_active ? "Masquer" : "Afficher"}
                                    >
                                        {item.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                                        title="Modifier"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => deleteContent(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {contents.length === 0 && !loading && (
                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                                Aucun contenu pour le moment.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SUGGESTIONS TAB */}
            {activeTab === 'suggestions' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggestion</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {suggestions.map((sug) => (
                                <tr key={sug.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(sug.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {sug.user_profiles?.first_name} {sug.user_profiles?.last_name}
                                        </div>
                                        <div className="text-sm text-gray-500">{sug.user_profiles?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {sug.suggestion_text}
                                    </td>
                                </tr>
                            ))}
                            {suggestions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                        La boîte à idées est vide pour l'instant.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
