import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { LocationSearch } from '../components/LocationSearch';
import { categories } from '../data/categories';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

interface FormData {
  business: {
    name: string;
    contactName: string;
    email: string;
    phone: string;
    siret: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    logo_url?: string;
    description: string;
    address: string;
    openingHours: {
      [key: string]: { open: string; close: string } | null;
    };
  };
  offer: {
    title: string;
    description: string;
    categorySlug: string;
    subcategorySlug: string;
    price: number;
    promoPrice?: number;
    location: string;
    coordinates?: { lat: number; lng: number };
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  acceptedTerms?: boolean;
}

export default function SubmitOffer() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    business: {
      name: '',
      contactName: '',
      email: '',
      phone: '',
      siret: '',
      website: '',
      instagram: '',
      facebook: '',
      logo_url: '',
      description: '',
      address: '',
      openingHours: {
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '19:00' },
        thursday: { open: '09:00', close: '19:00' },
        friday: { open: '09:00', close: '19:00' },
        saturday: { open: '10:00', close: '17:00' },
        sunday: null,
      },
    },
    offer: {
      title: '',
      description: '',
      categorySlug: '',
      subcategorySlug: '',
      price: 0,
      location: '',
    },
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<{
    business?: Record<string, string>;
    offer?: Record<string, string>;
    recap?: string;
    submit?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ✅ Validation renforcée
  const validateStep = (step: number): boolean => {
    const newErrors: typeof errors = {};

    if (step === 1) {
      if (!formData.business.name)
        newErrors.business = { ...newErrors.business, name: "Le nom de l'entreprise est requis" };
      if (!formData.business.contactName)
        newErrors.business = { ...newErrors.business, contactName: 'Le nom du contact est requis' };
      if (!formData.business.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.business.email)) {
        newErrors.business = { ...newErrors.business, email: 'Un email valide est requis' };
      }
      if (!/^[0-9]{10}$/.test(formData.business.phone)) {
        newErrors.business = { ...newErrors.business, phone: 'Un téléphone à 10 chiffres est requis' };
      }
      if (!/^[0-9]{14}$/.test(formData.business.siret)) {
        newErrors.business = { ...newErrors.business, siret: 'Un SIRET à 14 chiffres est requis' };
      }
      if (!formData.business.description)
        newErrors.business = { ...newErrors.business, description: 'La description est requise' };
      if (!formData.business.address)
        newErrors.business = { ...newErrors.business, address: "L'adresse est requise" };
    } else if (step === 2) {
      if (!formData.offer.title) newErrors.offer = { ...newErrors.offer, title: 'Le titre est requis' };
      if (!formData.offer.description)
        newErrors.offer = { ...newErrors.offer, description: 'La description est requise' };
      if (!formData.offer.categorySlug)
        newErrors.offer = { ...newErrors.offer, categorySlug: 'La catégorie est requise' };
      if (!formData.offer.subcategorySlug)
        newErrors.offer = { ...newErrors.offer, subcategorySlug: 'La sous-catégorie est requise' };
      if (!formData.offer.price || formData.offer.price <= 0)
        newErrors.offer = { ...newErrors.offer, price: 'Le prix doit être supérieur à 0' };
      if (formData.offer.promoPrice && formData.offer.promoPrice >= formData.offer.price) {
        newErrors.offer = {
          ...newErrors.offer,
          promoPrice: 'Le prix promotionnel doit être inférieur au prix standard',
        };
      }
      if (!formData.offer.location)
        newErrors.offer = { ...newErrors.offer, location: 'La localisation est requise' };
    } else if (step === 3) {
      if (!formData.acceptedTerms) newErrors.recap = 'Vous devez accepter les conditions générales';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      business: {
        ...prev.business,
        [name]: value,
      },
    }));
  };

  const handleOfferChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      offer: {
        ...prev.offer,
        [name]: name === 'price' || name === 'promoPrice' ? parseFloat(value) || 0 : value,
      },
    }));
  };

  // ✅ Coordonnées GPS (Business)
  const handleBusinessLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setFormData((prev) => ({
      ...prev,
      business: {
        ...prev.business,
        address: location.address,
      },
      coordinates: {
        lat: location.lat,
        lng: location.lng,
      },
    }));
  };

  // ✅ Coordonnées GPS (Offer)
  const handleOfferLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setFormData((prev) => ({
      ...prev,
      offer: {
        ...prev.offer,
        location: location.address,
        coordinates: { lat: location.lat, lng: location.lng },
      },
    }));
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { data, error } = await supabase.functions.invoke("send-partner-submission", {
        body: {
          business: {
            name: formData.business.name,
            contactName: formData.business.contactName,
            email: formData.business.email,
            phone: formData.business.phone,
            website: formData.business.website,
            siret: formData.business.siret,
            address: formData.business.address,
            message: formData.business.description, // ⚡ description → message
          },
          offer: {
            title: formData.offer.title,
            description: formData.offer.description,
            categorySlug: formData.offer.categorySlug,
            subcategorySlug: formData.offer.subcategorySlug,
            price: formData.offer.price,
            promoPrice: formData.offer.promoPrice,
            location: formData.offer.location,
            coordinates: formData.offer.coordinates,
          },
        },
      });
      

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de l'envoi");

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error:', error);
      setErrors((prev) => ({
        ...prev,
        submit: 'Une erreur est survenue. Veuillez réessayer.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <SEO title="Demande envoyée" description="Votre demande de partenariat a été envoyée avec succès." />
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Demande envoyée avec succès !</h2>
          <p className="mt-2 text-gray-600">
            Nous avons bien reçu votre demande de partenariat. Notre équipe va l'étudier et vous recontactera dans les plus brefs délais.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO title="Devenir partenaire" description="Proposez votre offre bien-être sur Nowme Club." />
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Devenir partenaire</h1>

        {/* ✅ Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Étape {currentStep} sur 3</p>
        </div>

        {errors.submit && (
          <div className="mb-4 flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1 - Entreprise */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Informations sur l’entreprise
              </h2>

              <input type="text" name="name" placeholder="Nom de l’entreprise" value={formData.business.name} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="text" name="contactName" placeholder="Nom du contact" value={formData.business.contactName} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="email" name="email" placeholder="Email" value={formData.business.email} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="tel" name="phone" placeholder="Téléphone (10 chiffres)" value={formData.business.phone} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="text" name="siret" placeholder="Numéro SIRET (14 chiffres)" value={formData.business.siret} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="url" name="website" placeholder="Site web" value={formData.business.website} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="text" name="instagram" placeholder="Instagram" value={formData.business.instagram} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="text" name="facebook" placeholder="Facebook" value={formData.business.facebook} onChange={handleBusinessChange} className="w-full p-3 border rounded" />
              <input type="file" name="logo_url" className="w-full p-3 border rounded" onChange={(e) => setFormData(prev => ({ ...prev, business: { ...prev.business, logo_url: e.target.value } }))} />
              <textarea name="description" placeholder="Décrivez votre activité" value={formData.business.description} onChange={handleBusinessChange} className="w-full p-3 border rounded" />

              {/* Adresse entreprise */}
              <LocationSearch onSelect={handleBusinessLocationSelect} error={errors.business?.address} />
              {formData.business.address && (
                <input type="text" value={formData.business.address} readOnly className="w-full p-3 border rounded bg-gray-50 text-gray-700" />
              )}
              {errors.business?.address && <p className="text-red-600">{errors.business.address}</p>}

              <div className="flex justify-end">
                <button type="button" onClick={handleNext} className="bg-primary text-white px-6 py-2 rounded-full">Suivant</button>
              </div>
            </div>
          )}

          {/* Step 2 - Offre */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                Détails de l’offre
              </h2>

              <input type="text" name="title" placeholder="Titre de l’offre" value={formData.offer.title} onChange={handleOfferChange} className="w-full p-3 border rounded" />
              <textarea name="description" placeholder="Description de l’offre" value={formData.offer.description} onChange={handleOfferChange} className="w-full p-3 border rounded" />
              <select name="categorySlug" value={formData.offer.categorySlug} onChange={handleOfferChange} className="w-full p-3 border rounded">
                <option value="">Choisir une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select name="subcategorySlug" value={formData.offer.subcategorySlug} onChange={handleOfferChange} className="w-full p-3 border rounded">
                <option value="">Choisir une sous-catégorie</option>
                {formData.offer.categorySlug &&
                  categories.find((cat) => cat.slug === formData.offer.categorySlug)?.subcategories.map((sub) => (
                    <option key={sub.slug} value={sub.slug}>
                      {sub.name}
                    </option>
                  ))}
              </select>
              <input type="number" name="price" placeholder="Prix standard" value={formData.offer.price} onChange={handleOfferChange} className="w-full p-3 border rounded" />
              <input type="number" name="promoPrice" placeholder="Prix promo (optionnel)" value={formData.offer.promoPrice || ''} onChange={handleOfferChange} className="w-full p-3 border rounded" />

              {/* Adresse offre */}
              <LocationSearch onSelect={handleOfferLocationSelect} error={errors.offer?.location} />
              {formData.offer.location && (
                <input type="text" value={formData.offer.location} readOnly className="w-full p-3 border rounded bg-gray-50 text-gray-700" />
              )}
              {errors.offer?.location && <p className="text-red-600">{errors.offer.location}</p>}

              <div className="flex justify-between">
                <button type="button" onClick={handleBack} className="bg-gray-300 text-gray-800 px-6 py-2 rounded-full">Retour</button>
                <button type="button" onClick={handleNext} className="bg-primary text-white px-6 py-2 rounded-full">Suivant</button>
              </div>
            </div>
          )}

          {/* Step 3 - Récapitulatif */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Récapitulatif</h2>
              <div className="bg-gray-50 p-4 rounded">
                <p><strong>Entreprise :</strong> {formData.business.name}</p>
                <p><strong>Contact :</strong> {formData.business.contactName}</p>
                <p><strong>Email :</strong> {formData.business.email}</p>
                <p><strong>Téléphone :</strong> {formData.business.phone}</p>
                <p><strong>SIRET :</strong> {formData.business.siret}</p>
                <p><strong>Site web :</strong> {formData.business.website}</p>
                <p><strong>Instagram :</strong> {formData.business.instagram}</p>
                <p><strong>Facebook :</strong> {formData.business.facebook}</p>
                <p><strong>Description :</strong> {formData.business.description}</p>
                <p><strong>Adresse :</strong> {formData.business.address}</p>
</div>
<div className="bg-gray-50 p-4 rounded">

                <p><strong>Offre :</strong> {formData.offer.title}</p>
                <p><strong>Description :</strong> {formData.offer.description}</p>
                <p><strong>Catégorie :</strong> {formData.offer.categorySlug}</p>
                <p><strong>Sous-catégorie :</strong> {formData.offer.subcategorySlug}</p>
                <p><strong>Prix :</strong> {formData.offer.price} €</p>
                {formData.offer.promoPrice && <p><strong>Prix promo :</strong> {formData.offer.promoPrice} €</p>}
                <p><strong>Lieu :</strong> {formData.offer.location}</p>
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      acceptedTerms: e.target.checked,
                    }))
                  }
                />
                <span>J’accepte les conditions d’utilisation</span>
              </label>
              {errors.recap && <p className="text-red-600">{errors.recap}</p>}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="bg-gray-300 px-6 py-2 rounded-full"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white px-6 py-2 rounded-full disabled:opacity-50"
                >
                  {isSubmitting ? 'Envoi...' : 'Confirmer et envoyer'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
