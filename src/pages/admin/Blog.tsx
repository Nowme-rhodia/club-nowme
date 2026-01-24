import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface BlogPost {
    id: string;
    slug: string;
    title: string;
    status: string;
    published_at: string;
    author_name: string;
}

export default function AdminBlog() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    async function fetchPosts() {
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .order('published_at', { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
            toast.error('Erreur lors du chargement des articles');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

        try {
            const { error } = await supabase
                .from('blog_posts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Article supprimé');
            fetchPosts();
        } catch (error) {
            console.error('Error deleting post:', error);
            toast.error('Erreur lors de la suppression');
        }
    }

    if (loading) return <div className="p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
                <Link
                    to="/admin/blog/new"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nouvel article
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auteur</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {posts.map((post) => (
                            <tr
                                key={post.id}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('a, button')) return;
                                    navigate(`/admin/blog/edit/${post.id}`);
                                }}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{post.title}</div>
                                    <div className="text-xs text-gray-500">/{post.slug}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {post.author_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {post.status === 'published' ? 'Publié' : 'Brouillon'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {post.published_at ? format(new Date(post.published_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <Link to={`/blog/${post.slug}`} target="_blank" className="text-gray-400 hover:text-gray-600" onClick={e => e.stopPropagation()}>
                                            <Eye className="w-5 h-5" />
                                        </Link>
                                        <Link to={`/admin/blog/edit/${post.id}`} className="text-blue-600 hover:text-blue-900" onClick={e => e.stopPropagation()}>
                                            <Edit className="w-5 h-5" />
                                        </Link>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
