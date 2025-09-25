import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  FileText, 
  Globe,
  Instagram,
  Facebook,
  AlertCircle,
  CheckCircle
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
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const days = [
  { id: 'monday', label: 'Lundi' },
  { id: 'tuesday', label: 'Mardi' },
  { id: 'wednesday', label: 'Mercredi' },
  { id: 'thursday', label: 'Jeudi' },
  { id: 'friday', label: 'Vendredi' },
  { id: 'saturday', label: 'Samedi' },
  { id: 'sunday', label: 'Dimanche' }
];

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
      description: '',
      address: '',
      openingHours: {
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '19:00' },
        thursday: { open: '09:00', close: '19:00' },
        friday: { open: '09:00', close: '19:00' },
        saturday: { open: '10:00', close: '17:00' },
        sunday: null
      }
    },
    offer: {
      title: '',
      description: '',
      categorySlug: '',
      subcategorySlug: '',
      price: 0,
      location: ''
    }
  });
  const [errors, setErrors] = useState<{
    business?: Record<string, string>;
    offer?: Record<string, string>;
    submit?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateStep = (step: number): boolean => {
    const newErrors: typeof errors = {};

    if (step === 1) {
      if (!formData.business.name) newErrors.business = { ...newErrors.business, name: "Le nom de l'entreprise est requis" };
      if (!formData.business.contactName) newErrors.business = { ...newErrors.business, contactName: "Le nom du contact est requis" };
      if (!formData.business.email) {
        newErrors.business = { ...newErrors.business, email: "L'email est requis" };
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.business.email)) {
        newErrors.business = { ...newErrors.business, email: "L'email n'est pas valide" };
      }
      if (!formData.business.phone) newErrors.business = { ...newErrors.business, phone: "Le téléphone est requis" };
      if (!formData.business.siret) newErrors.business = { ...newErrors.business, siret: "Le numéro SIRET est requis" };
      if (!formData.business.description) newErrors.business = { ...newErrors.business, description: "La description est requise" };
      if (!formData.business.address) newErrors.business = { ...newErrors.business, address: "L'adresse est requise" };
    } else if (step === 2) {
      if (!formData.offer.title) newErrors.offer = { ...newErrors.offer, title: "Le titre est requis" };
      if (!formData.offer.description) newErrors.offer = { ...newErrors.offer, description: "La description est requise" };
      if (!formData.offer.categorySlug) newErrors.offer = { ...newErrors.offer, categorySlug: "La catégorie est requise" };
      if (!formData.offer.subcategorySlug) newErrors.offer = { ...newErrors.offer, subcategorySlug: "La sous-catégorie est requise" };
      if (!formData.offer.price || formData.offer.price <= 0) newErrors.offer = { ...newErrors.offer, price: "Le prix doit être supérieur à 0" };
      if (formData.offer.promoPrice && formData.offer.promoPrice >= formData.offer.price) {
        newErrors.offer = { ...newErrors.offer, promoPrice: "Le prix promotionnel doit être inférieur au prix standard" };
      }
      if (!formData.offer.location) newErrors.offer = { ...newErrors.offer, location: "La localisation est requise" };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      business: {
        ...prev.business,
        [name]: value
      }
    }));
  };

  const handleOfferChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      offer: {
        ...prev.offer,
        [name]: name === 'price' || name === 'promoPrice' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      business: {
        ...prev.business,
        address: location.address
      },
      coordinates: {
        lat: location.lat,
        lng: location.lng
      }
    }));
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
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
          business: formData.business,
          offer: formData.offer,
          coordinates: formData.coordinates,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de l'envoi");

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error:", error);
      setErrors(prev => ({
        ...prev,
        submit: "Une erreur est survenue. Veuillez réessayer."
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
            <Link to="/" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-primary hover:bg-primary-dark transition-colors duration-200">
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

        {errors.submit && (
          <div className="mb-4 flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Informations sur l’entreprise
              </h2>

              <input
                type="text"
                name="name"
                placeholder="Nom de l’entreprise"
                value={formData.business.name}
                onChange={handleBusinessChange}
                className="w-full p-3 border rounded"
              />
              {errors.business?.name && <p className="text-red-600">{errors.business.name}</p>}

              <input
                type="text"
                name="contactName"
                placeholder="Nom du contact"
                value={formData.business.contactName}
                onChange={handleBusinessChange}
                className="w-full p-3 border rounded"
              />
              {errors.business?.contactName && <p className="text-red-600">{errors.business.contactName}</p>}

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.business.email}
                onChange={handleBusinessChange}
                className="w-full p-3 border rounded"
              />
              {errors.business?.email && <p className="text-red-600">{errors.business.email}</p>}

              <input
                type="tel"
                name="phone"
                placeholder="Téléphone"
                value={formData.business.phone}
                onChange={handleBusinessChange}
                className="w-full p-3 border rounded"
              />
              {errors.business?.phone && <p className="text-red-600">{errors.business.phone}</p>}

              <input
                type="text"
                name="siret"
                placeholder="Numéro SIRET"
                value={formData.business.siret}
                onChange={handleBusinessChange}
                className="w-full p-3 border rounded"
              />
              {errors.business?.siret && <p className="text-red-600">{errors.business.siret}</p>}

              <textarea
                name="description"
                placeholder="Décrivez votre activité"
                value={formData.business.description}
                onChange={handleBusinessChange}
                className="w-full p-3 border rounded"
              />
              {errors.business?.description && <p className="text-red-600">{errors.business.description}</p>}

              <LocationSearch onSelect={handleLocationSelect} />
              {errors.business?.address && <p className="text-red-600">{errors.business.address}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-primary text-white px-6 py-2 rounded-full"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                Détails de l’offre
              </h2>

              <input
                type="text"
                name="title"
                placeholder="Titre de l’offre"
                value={formData.offer.title}
                onChange={handleOfferChange}
                className="w-full p-3 border rounded"
              />
              {errors.offer?.title && <p className="text-red-600">{errors.offer.title}</p>}

              <textarea
                name="description"
                placeholder="Description de l’offre"
                value={formData.offer.description}
                onChange={handleOfferChange}
                className="w-full p-3 border rounded"
              />
              {errors.offer?.description && <p className="text-red-600">{errors.offer.description}</p>}

              <select
                name="categorySlug"
                value={formData.offer.categorySlug}
                onChange={handleOfferChange}
                className="w-full p-3 border rounded"
              >
                <option value="">Choisir une catégorie</option>
                {categories.map(cat => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.offer?.categorySlug && <p className="text-red-600">{errors.offer.categorySlug}</p>}

              <select
                name="subcategorySlug"
                value={formData.offer.subcategorySlug}
                onChange={handleOfferChange}
                className="w-full p-3 border rounded"
              >
                <option value="">Choisir une sous-catégorie</option>
                {formData.offer.categorySlug &&
                  categories
                    .find(cat => cat.slug === formData.offer.categorySlug)
                    ?.subcategories.map(sub => (
                      <option key={sub.slug} value={sub.slug}>
                        {sub.name}
                      </option>
                    ))}
              </select>
              {errors.offer?.subcategorySlug && <p className="text-red-600">{errors.offer.subcategorySlug}</p>}

              <input
                type="number"
                name="price"
                placeholder="Prix standard"
                value={formData.offer.price}
                onChange={handleOfferChange}
                className="w-full p-3 border rounded"
              />
              {errors.offer?.price && <p className="text-red-600">{errors.offer.price}</p>}

              <input
                type="number"
                name="promoPrice"
                placeholder="Prix promotionnel (optionnel)"
                value={formData.offer.promoPrice || ''}
                onChange={handleOfferChange}
                className="w-full p-3 border rounded"
              />
              {errors.offer?.promoPrice && <p className="text-red-600">{errors.offer.promoPrice}</p>}

              <input
                type="text"
                name="location"
                placeholder="Lieu"
                value={formData.offer.location}
                onChange={handleOfferChange}
                className="w-full p-3 border rounded"
              />
              {errors.offer?.location && <p className="text-red-600">{errors.offer.location}</p>}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="bg-gray-300 text-gray-800 px-6 py-2 rounded-full"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white px-6 py-2 rounded-full disabled:opacity-50"
                >
                  {isSubmitting ? "Envoi..." : "Soumettre"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
