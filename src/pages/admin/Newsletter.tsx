import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Calendar, 
  Users, 
  Eye, 
  Edit3, 
  Trash2,
  Plus,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Newsletter {
  id: string;
  title: string;
  content: string;
  scheduled_date: string;
  status: 'draft' | 'scheduled' | 'sent';
  recipients_count: number;
  open_rate?: number;
  click_rate?: number;
  created_at: string;
}

interface BonPlan {
  id: string;
  title: string;
  description: string;
  category: string;
  author_name: string;
  likes_count: number;
  created_at: string;
}

export default function Newsletter() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [bonPlans, setBonPlans] = useState<BonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBonPlans, setSelectedBonPlans] = useState<string[]>([]);
  const [newNewsletter, setNewNewsletter] = useState({
    title: '',
    content: '',
    scheduled_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Simuler des données pour la démo
      const mockNewsletters: Newsletter[] = [
        {
          id: '1',
          title: 'Kiff du jour - 20 janvier 2024',
          content: 'Découvre les meilleurs bons plans partagés par la communauté...',
          scheduled_date: '2024-01-20T08:00:00Z',
          status: 'sent',
          recipients_count: 1247,
          open_rate: 68.5,
          click_rate: 12.3,
          created_at: '2024-01-19T15:30:00Z'
        },
        {
          id: '2',
          title: 'Kiff du jour - 21 janvier 2024',
          content: 'Massage zen, brunch de folie et cours de poterie...',
          scheduled_date: '2024-01-21T08:00:00Z',
          status: 'scheduled',
          recipients_count: 1251,
          created_at: '2024-01-20T16:45:00Z'
        }
      ];

      const mockBonPlans: BonPlan[] = [
        {
          id: '1',
          title: 'Massage à -50% chez Zen Spa',
          description: 'Spa incroyable avec code NOWME50',
          category: 'Bien-être',
          author_name: 'Sophie M.',
          likes_count: 24,
          created_at: '2024-01-20T10:30:00Z'
        },
        {
          id: '2',
          title: 'Brunch de folie chez Café Bloom',
          description: 'Brunch photogénique et délicieux',
          category: 'Restaurant',
          author_name: 'Emma L.',
          likes_count: 31,
          created_at: '2024-01-19T14:15:00Z'
        }
      ];

      setNewsletters(mockNewsletters);
      setBonPlans(mockBonPlans);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyNewsletter = () => {
    const today = new Date();
    const title = `Kiff du jour - ${format(today, 'dd MMMM yyyy', { locale: fr })}`;
    
    // Sélectionner automatiquement les bons plans les plus populaires
    const topBonPlans = bonPlans
      .sort((a, b) => b.likes_count - a.likes_count)
      .slice(0, 3);

    const content = generateNewsletterContent(topBonPlans);
    
    setNewNewsletter({
      title,
      content,
      scheduled_date: format(new Date(today.setHours(8, 0, 0, 0)), "yyyy-MM-dd'T'HH:mm")
    });
    
    setSelectedBonPlans(topBonPlans.map(plan => plan.id));
    setShowCreateForm(true);
  };

  const generateNewsletterContent = (plans: BonPlan[]) => {
    const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
    
    return `
# Ton kiff du ${today} 💕

Salut ma belle !

Voici les pépites du jour partagées par tes copines de la communauté :

${plans.map((plan, index) => `
## ${index + 1}. ${plan.title}

${plan.description}

**Catégorie :** ${plan.category}  
**Partagé par :** ${plan.author_name}  
**💕 ${plan.likes_count} likes**

---
`).join('')}

## 🎯 Rappel du jour

N'oublie pas : tu mérites de kiffer ! Prends 5 minutes aujourd'hui pour faire quelque chose qui te fait du bien.

## 📱 Partage tes découvertes

Tu as testé un endroit génial ? Partage-le dans l'espace communautaire pour faire profiter tes copines !

[Partager un bon plan](https://club.nowme.fr/community-space)

Kiffe bien ta journée ! ✨

L'équipe Nowme 💕

---

*Tu reçois cet email car tu es abonnée à Nowme Club. [Se désabonner](https://club.nowme.fr/unsubscribe)*
    `.trim();
  };

  const handleCreateNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Ici tu intégreras avec Supabase
      console.log('Création newsletter:', newNewsletter);
      console.log('Bons plans sélectionnés:', selectedBonPlans);
      
      // Simuler la création
      const newId = Date.now().toString();
      const newsletter: Newsletter = {
        id: newId,
        title: newNewsletter.title,
        content: newNewsletter.content,
        scheduled_date: newNewsletter.scheduled_date,
        status: 'scheduled',
        recipients_count: 1250, // Nombre d'abonnées
        created_at: new Date().toISOString()
      };
      
      setNewsletters([newsletter, ...newsletters]);
      setShowCreateForm(false);
      setNewNewsletter({ title: '', content: '', scheduled_date: '' });
      setSelectedBonPlans([]);
      
    } catch (error) {
      console.error('Erreur création newsletter:', error);
    }
  };

  const handleSendNow = async (newsletterId: string) => {
    try {
      // Logique d'envoi immédiat
      console.log('Envoi newsletter:', newsletterId);
      
      setNewsletters(newsletters.map(n => 
        n.id === newsletterId 
          ? { ...n, status: 'sent' as const, recipients_count: 1250 }
          : n
      ));
      
    } catch (error) {
      console.error('Erreur envoi newsletter:', error);
    }
  };

  const getStatusIcon = (status: Newsletter['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'scheduled':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Edit3 className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: Newsletter['status']) => {
    switch (status) {
      case 'sent': return 'Envoyée';
      case 'scheduled': return 'Programmée';
      default: return 'Brouillon';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Newsletter quotidienne</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez la newsletter quotidienne "Kiff du jour"
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <button
          onClick={generateDailyNewsletter}
          className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Générer le kiff du jour
        </button>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Newsletter personnalisée
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-primary mr-3" />
            <div>
              <p className="text-sm text-gray-500">Abonnées</p>
              <p className="text-2xl font-bold text-gray-900">1,250</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <Mail className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Taux d'ouverture</p>
              <p className="text-2xl font-bold text-gray-900">68.5%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <Eye className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Taux de clic</p>
              <p className="text-2xl font-bold text-gray-900">12.3%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <Send className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Envoyées ce mois</p>
              <p className="text-2xl font-bold text-gray-900">20</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des newsletters */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Newsletters récentes</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {newsletters.map((newsletter) => (
            <div key={newsletter.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(newsletter.status)}
                    <h3 className="text-lg font-medium text-gray-900">
                      {newsletter.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      newsletter.status === 'sent' ? 'bg-green-100 text-green-700' :
                      newsletter.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getStatusLabel(newsletter.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>
                      📅 {format(new Date(newsletter.scheduled_date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </span>
                    <span>👥 {newsletter.recipients_count} destinataires</span>
                    {newsletter.open_rate && (
                      <span>📧 {newsletter.open_rate}% d'ouverture</span>
                    )}
                    {newsletter.click_rate && (
                      <span>🔗 {newsletter.click_rate}% de clic</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100">
                    <Eye className="w-5 h-5" />
                  </button>
                  
                  {newsletter.status !== 'sent' && (
                    <>
                      <button className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100">
                        <Edit3 className="w-5 h-5" />
                      </button>
                      
                      {newsletter.status === 'scheduled' && (
                        <button
                          onClick={() => handleSendNow(newsletter.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          Envoyer maintenant
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Créer une newsletter
              </h2>

              <form onSubmit={handleCreateNewsletter} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={newNewsletter.title}
                    onChange={(e) => setNewNewsletter({...newNewsletter, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date et heure d'envoi
                  </label>
                  <input
                    type="datetime-local"
                    value={newNewsletter.scheduled_date}
                    onChange={(e) => setNewNewsletter({...newNewsletter, scheduled_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bons plans à inclure
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-4">
                    {bonPlans.map((plan) => (
                      <label key={plan.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedBonPlans.includes(plan.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBonPlans([...selectedBonPlans, plan.id]);
                            } else {
                              setSelectedBonPlans(selectedBonPlans.filter(id => id !== plan.id));
                            }
                          }}
                          className="mr-3"
                        />
                        <span className="text-sm">
                          {plan.title} - {plan.category} ({plan.likes_count} ❤️)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contenu (Markdown)
                  </label>
                  <textarea
                    value={newNewsletter.content}
                    onChange={(e) => setNewNewsletter({...newNewsletter, content: e.target.value})}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary font-mono text-sm"
                    required
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
                    Programmer l'envoi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}