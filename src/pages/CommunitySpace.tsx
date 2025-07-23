import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  MapPin, 
  Star,
  Filter,
  Search,
  Bookmark,
  ThumbsUp,
  Send,
  Image,
  Link as LinkIcon
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface BonPlan {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  price?: number;
  discount?: string;
  image_url?: string;
  website_url?: string;
  author: {
    name: string;
    photo_url?: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

export default function CommunitySpace() {
  const { profile } = useAuth();
  const [bonPlans, setBonPlans] = useState<BonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newBonPlan, setNewBonPlan] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    price: '',
    discount: '',
    image_url: '',
    website_url: ''
  });

  const categories = [
    'Bien-être', 'Restaurant', 'Shopping', 'Culture', 'Sport', 
    'Beauté', 'Voyage', 'Loisirs', 'Autre'
  ];

  useEffect(() => {
    loadBonPlans();
  }, []);

  const loadBonPlans = async () => {
    try {
      // Simuler des données pour la démo
      const mockData: BonPlan[] = [
        {
          id: '1',
          title: 'Massage à -50% chez Zen Spa',
          description: 'J\'ai testé ce spa incroyable ! Massage californien divin, ambiance zen, et avec le code NOWME50 tu as -50%. J\'y retourne la semaine prochaine !',
          category: 'Bien-être',
          location: 'Paris 11e',
          price: 45,
          discount: '-50%',
          image_url: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=400',
          website_url: 'https://zen-spa-paris.fr',
          author: {
            name: 'Sophie M.',
            photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
          },
          likes_count: 24,
          comments_count: 8,
          is_liked: false,
          is_bookmarked: true,
          created_at: '2024-01-20T10:30:00Z'
        },
        {
          id: '2',
          title: 'Brunch de folie chez Café Bloom',
          description: 'Les meufs, ce brunch est DINGUE ! Avocat toast, pancakes fluffy, et le café est parfait. En plus c\'est photogénique à souhait 📸',
          category: 'Restaurant',
          location: 'Paris 3e',
          price: 28,
          author: {
            name: 'Emma L.',
            photo_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150'
          },
          likes_count: 31,
          comments_count: 12,
          is_liked: true,
          is_bookmarked: false,
          created_at: '2024-01-19T14:15:00Z'
        },
        {
          id: '3',
          title: 'Cours de poterie chez Terre & Feu',
          description: 'Atelier poterie génial ! La prof est super patiente, on repart avec sa création. Parfait pour déconnecter et créer quelque chose de ses mains ✨',
          category: 'Loisirs',
          location: 'Paris 18e',
          price: 65,
          author: {
            name: 'Julie R.',
            photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
          },
          likes_count: 18,
          comments_count: 5,
          is_liked: false,
          is_bookmarked: false,
          created_at: '2024-01-18T16:45:00Z'
        }
      ];
      
      setBonPlans(mockData);
    } catch (error) {
      console.error('Erreur chargement bons plans:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBonPlan.title || !newBonPlan.description || !newBonPlan.category) {
      toast.error('Remplis au moins le titre, la description et la catégorie !');
      return;
    }

    try {
      // Ici tu intégreras avec Supabase
      toast.success('Bon plan partagé ! Merci pour la communauté 💕');
      setShowCreateForm(false);
      setNewBonPlan({
        title: '',
        description: '',
        category: '',
        location: '',
        price: '',
        discount: '',
        image_url: '',
        website_url: ''
      });
      await loadBonPlans();
    } catch (error) {
      toast.error('Erreur lors du partage');
    }
  };

  const handleLike = async (bonPlanId: string) => {
    // Logique de like
    toast.success('💕');
  };

  const handleBookmark = async (bonPlanId: string) => {
    // Logique de bookmark
    toast.success('Sauvegardé !');
  };

  const filteredBonPlans = bonPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || plan.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Espace communautaire"
        description="Partagez vos bons plans et découvrez ceux de la communauté Nowme"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Nos bons plans entre copines 💕
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Partage tes découvertes et profite de celles des autres membres !
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Partager un bon plan
          </button>

          <div className="flex-1 flex gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Rechercher un bon plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-full border border-gray-300 focus:ring-primary focus:border-primary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 rounded-full border border-gray-300 focus:ring-primary focus:border-primary"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste des bons plans */}
        <div className="space-y-6">
          {filteredBonPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {plan.author.photo_url ? (
                    <img
                      src={plan.author.photo_url}
                      alt={plan.author.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {plan.author.name[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {plan.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{plan.author.name}</span>
                        <span>•</span>
                        <span>{new Date(plan.created_at).toLocaleDateString('fr-FR')}</span>
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {plan.category}
                        </span>
                      </div>
                    </div>
                    
                    {plan.discount && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        {plan.discount}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Image */}
                  {plan.image_url && (
                    <div className="mb-4">
                      <img
                        src={plan.image_url}
                        alt={plan.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Infos pratiques */}
                  <div className="flex items-center gap-6 mb-4 text-sm text-gray-600">
                    {plan.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{plan.location}</span>
                      </div>
                    )}
                    {plan.price && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{plan.price}€</span>
                      </div>
                    )}
                    {plan.website_url && (
                      <a
                        href={plan.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-primary-dark"
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span>Site web</span>
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(plan.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                          plan.is_liked 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${plan.is_liked ? 'fill-current' : ''}`} />
                        <span className="text-sm font-medium">{plan.likes_count}</span>
                      </button>

                      <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{plan.comments_count}</span>
                      </button>

                      <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors">
                        <Share2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Partager</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleBookmark(plan.id)}
                      className={`p-2 rounded-full transition-colors ${
                        plan.is_bookmarked 
                          ? 'bg-yellow-100 text-yellow-600' 
                          : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${plan.is_bookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Partager un bon plan
                </h2>

                <form onSubmit={handleCreateBonPlan} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre du bon plan *
                    </label>
                    <input
                      type="text"
                      value={newBonPlan.title}
                      onChange={(e) => setNewBonPlan({...newBonPlan, title: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Ex: Massage à -50% chez Zen Spa"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={newBonPlan.description}
                      onChange={(e) => setNewBonPlan({...newBonPlan, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Raconte-nous ton expérience, pourquoi tu recommandes..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catégorie *
                      </label>
                      <select
                        value={newBonPlan.category}
                        onChange={(e) => setNewBonPlan({...newBonPlan, category: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        required
                      >
                        <option value="">Choisir une catégorie</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Localisation
                      </label>
                      <input
                        type="text"
                        value={newBonPlan.location}
                        onChange={(e) => setNewBonPlan({...newBonPlan, location: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="Ex: Paris 11e"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prix (€)
                      </label>
                      <input
                        type="number"
                        value={newBonPlan.price}
                        onChange={(e) => setNewBonPlan({...newBonPlan, price: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="Ex: 45"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Réduction
                      </label>
                      <input
                        type="text"
                        value={newBonPlan.discount}
                        onChange={(e) => setNewBonPlan({...newBonPlan, discount: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="Ex: -50% ou Code NOWME50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Photo (URL)
                    </label>
                    <input
                      type="url"
                      value={newBonPlan.image_url}
                      onChange={(e) => setNewBonPlan({...newBonPlan, image_url: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site web
                    </label>
                    <input
                      type="url"
                      value={newBonPlan.website_url}
                      onChange={(e) => setNewBonPlan({...newBonPlan, website_url: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      Partager
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}