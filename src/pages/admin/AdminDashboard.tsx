import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Briefcase, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    activeSubscribers: 0,
    pendingPartners: 0,
    approvedPartners: 0,
    loading: true
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      console.log('🔍 [AdminDashboard] Fetching stats...');

      // Test: fetch ALL partners first to see what we have
      const allPartnersTest = await supabase
        .from('partners')
        .select('*');
      console.log('🧪 [AdminDashboard] ALL partners (test query):', allPartnersTest);

      const [subscribersRes, pendingPartnersRes, approvedPartnersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('subscription_status', 'active'),
        supabase
          .from('partners')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('partners')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
      ]);

      console.log('📊 [AdminDashboard] Subscribers response:', subscribersRes);
      console.log('📊 [AdminDashboard] Pending partners response:', pendingPartnersRes);
      console.log('📊 [AdminDashboard] Approved partners response:', approvedPartnersRes);

      const stats = {
        activeSubscribers: subscribersRes.count || 0,
        pendingPartners: pendingPartnersRes.count || 0,
        approvedPartners: approvedPartnersRes.count || 0,
        loading: false
      };

      console.log('✅ [AdminDashboard] Final stats:', stats);

      setStats(stats);
    } catch (error) {
      console.error('❌ [AdminDashboard] Error loading stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const cards = [
    {
      label: 'Abonnées actives',
      value: stats.loading ? '...' : stats.activeSubscribers.toString(),
      description: 'Membres avec abonnement actif',
      trend: stats.activeSubscribers > 0 ? `${stats.activeSubscribers} au total` : 'Aucune abonnée pour le moment'
    },
    {
      label: 'Partenaires en attente',
      value: stats.loading ? '...' : stats.pendingPartners.toString(),
      description: 'Demandes à valider',
      trend: stats.pendingPartners > 0 ? 'Action requise' : 'Tout est à jour'
    },
    {
      label: 'Partenaires approuvés',
      value: stats.loading ? '...' : stats.approvedPartners.toString(),
      description: 'Partenaires actifs',
      trend: `${stats.approvedPartners} partenaire${stats.approvedPartners > 1 ? 's' : ''} validé${stats.approvedPartners > 1 ? 's' : ''}`
    }
  ];

  const quickActions = [
    {
      label: 'Vérifier les partenaires',
      to: '/admin/partners',
      icon: Briefcase,
      description: `${stats.pendingPartners} demande${stats.pendingPartners > 1 ? 's' : ''} en attente`,
      highlight: stats.pendingPartners > 0
    },
    {
      label: 'Valider les offres',
      to: '/admin/pending-offers',
      icon: Sparkles,
      description: 'Gérer les offres en attente',
      highlight: false
    },
    {
      label: 'Voir les abonné·es',
      to: '/admin/subscribers',
      icon: Users,
      description: `${stats.activeSubscribers} membre${stats.activeSubscribers > 1 ? 's' : ''} actif${stats.activeSubscribers > 1 ? 's' : ''}`,
      highlight: false
    },
    {
      label: 'Envoyer une newsletter',
      to: '/admin/newsletter',
      icon: Mail,
      description: 'Communiquer avec la communauté',
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Espace réservé aux administrateurs
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Bonjour {profile?.first_name || 'Admin'} 👋
              </h1>
              <p className="mt-4 text-gray-600 max-w-2xl">
                Retrouvez ici une vue d’ensemble de l’activité Nowme : vos partenaires, votre communauté,
                les offres en attente et les actions prioritaires du moment.
              </p>
              {stats.pendingPartners > 0 && (
                <div className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
                  <Sparkles className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">
                    {stats.pendingPartners} demande{stats.pendingPartners > 1 ? 's' : ''} de partenariat en attente
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to="/devenir-partenaire"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
              >
                Voir le site public
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <button
                onClick={async () => {
                  // 1. Check partner
                  const { data: p, error: pe } = await supabase.from('partners').select('*').eq('contact_email', 'rhodia@nowme.fr');
                  console.log('Partner check:', p, pe);
                  alert('Partner check: ' + JSON.stringify(p) + ' Error: ' + JSON.stringify(pe));

                  if (p && p.length > 0) {
                    // 2. Check offers
                    const { data: o, error: oe } = await supabase.from('offers').select('id, title, partner_id, status, is_approved').eq('partner_id', p[0].id);
                    console.log('Offers check:', o, oe);
                    alert('Offers check: ' + JSON.stringify(o));
                  }
                }}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Debug Club Data
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-2 text-sm text-gray-500">{card.description}</p>
              <p className="mt-4 text-sm font-medium text-primary">{card.trend}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Actions rapides</h2>
              <p className="text-gray-500 mt-1">Accède directement aux modules clés de l’administration.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={`flex items-center justify-between rounded-2xl border px-4 py-4 transition ${action.highlight
                  ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
                  : 'border-gray-100 hover:border-primary hover:bg-primary/5'
                  }`}
              >
                <div className="flex items-center">
                  <action.icon className={`w-5 h-5 mr-3 ${action.highlight ? 'text-yellow-600' : 'text-primary'
                    }`} />
                  <div>
                    <p className="font-semibold text-gray-900">{action.label}</p>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
