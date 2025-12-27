import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { categories } from '../../data/categories';
import toast from 'react-hot-toast';

export default function CreateOffer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_slug: '',
    subcategory_slug: '',
    location: '',
    event_type: 'calendly' as 'calendly' | 'event' | 'promo',
    event_date: '',
    event_end_date: '',
    capacity: '',
    base_price: '',
    promo_price: '',
    calendly_url: '',
    external_link: '',
    promo_code: '',
    requires_agenda: false,
    has_stock: false,
    stock: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Récupérer le partner_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !profileData?.partner_id) {
        toast.error('Partner ID not found');
        return;
      }

      // Récupérer la catégorie pour avoir l'ID
      const { data: categoryData } = await supabase
        .from('offer_categories')
        .select('id')
        .eq('name', categories.find(c => c.slug === formData.category_slug)?.name)
        .single();

      // Créer l'offre directement dans la table offers
      const offerData: any = {
        partner_id: profileData.partner_id,
        title: formData.title,
        description: formData.description,
        street_address: formData.location || 'Non spécifié',
        status: 'draft',
        is_approved: false,
        booking_type: formData.event_type,
        calendly_url: formData.event_type === 'calendly' ? formData.calendly_url : null,
        external_link: formData.event_type === 'promo' ? formData.external_link : null,
        promo_code: formData.event_type === 'promo' ? formData.promo_code : null,
        event_start_date: formData.event_type === 'event' ? (formData.event_date || null) : null,
        event_end_date: formData.event_type === 'event' ? (formData.event_end_date || null) : null,
        commission_rate: 10
      };

      if (categoryData?.id) {
        offerData.category_id = categoryData.id;
      }

      // 1. Insert Offer
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .insert(offerData)
        .select()
        .single();

      if (offerError) {
        console.error('Error creating offer:', offerError);
        throw offerError;
      }

      // 2. Insert Price (Variant)
      if (formData.base_price) {
        const { error: variantError } = await supabase
          .from('offer_variants')
          .insert({
            offer_id: offer.id,
            name: 'Tarif Standard',
            price: parseFloat(formData.base_price),
            discounted_price: formData.promo_price ? parseFloat(formData.promo_price) : null
          });

        if (variantError) console.error('Error creating variant:', variantError);
      }

      toast.success('Offre créée avec succès !');
      navigate('/partner/offers');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'offre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Créer une nouvelle offre</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow">
        {/* Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre de l'offre *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            required
          />
        </div>

        {/* Type d'événement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type d'offre *
          </label>
          <select
            value={formData.event_type}
            onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          >
            <option value="permanent">Offre permanente</option>
            <option value="fixed_date">Événement à date fixe</option>
            <option value="calendly">Réservation via Calendly</option>
          </select>
        </div>

        {/* Catégorie et sous-catégorie */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie *
            </label>
            <select
              value={formData.category_slug}
              onChange={(e) => setFormData({ ...formData, category_slug: e.target.value, subcategory_slug: '' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Sélectionnez</option>
              {categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sous-catégorie *
            </label>
            <select
              value={formData.subcategory_slug}
              onChange={(e) => setFormData({ ...formData, subcategory_slug: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              disabled={!formData.category_slug}
              required
            >
              <option value="">Sélectionnez</option>
              {formData.category_slug && categories
                .find(c => c.slug === formData.category_slug)
                ?.subcategories.map(sub => (
                  <option key={sub.slug} value={sub.slug}>{sub.name}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Prix */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix promo (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.promo_price}
              onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Localisation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Localisation
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"              >
            <option value="calendly">Agenda (Calendly)</option>
            <option value="event">Événement à date fixe</option>
            <option value="promo">Code Promo / Lien Externe</option>
          </select>
        </div>

        {formData.event_type === 'calendly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lien Calendly *
            </label>
            <input
              type="url"
              value={formData.calendly_url}
              onChange={(e) => setFormData({ ...formData, calendly_url: e.target.value })}
              placeholder="https://calendly.com/votre-lien"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              required
            />
          </div>
        )}

        {formData.event_type === 'event' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début *
              </label>
              <input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin *
              </label>
              <input
                type="datetime-local"
                value={formData.event_end_date}
                onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>
        )}

        {formData.event_type === 'promo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lien externe *
              </label>
              <input
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                placeholder="https://site-partenaire.com/promo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code Promo (Optionnel)
              </label>
              <input
                type="text"
                value={formData.promo_code}
                onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                placeholder="EX: NOWME20"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        )}
  />
    </div>
          </>
        )
}

{/* Champs pour Calendly */ }
{
  formData.event_type === 'calendly' && (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Lien Calendly *
      </label>
      <input
        type="url"
        value={formData.calendly_url}
        onChange={(e) => setFormData({ ...formData, calendly_url: e.target.value, requires_agenda: true })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
        placeholder="https://calendly.com/votre-lien"
        required
      />
    </div>
  )
}

{/* Stock */ }
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={formData.has_stock}
    onChange={(e) => setFormData({ ...formData, has_stock: e.target.checked })}
    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
  />
  <label className="text-sm text-gray-700">
    Cette offre a un stock limité
  </label>
</div>

{
  formData.has_stock && (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Stock disponible
      </label>
      <input
        type="number"
        value={formData.stock}
        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
        required={formData.has_stock}
      />
    </div>
  )
}

{/* Actions */ }
<div className="flex justify-end gap-4">
  <button
    type="button"
    onClick={() => navigate('/partner/offers')}
    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
  >
    Annuler
  </button>
  <button
    type="submit"
    disabled={loading}
    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
  >
    {loading ? 'Création...' : 'Créer l\'offre'}
  </button>
</div>
      </form >
    </div >
  );
}
