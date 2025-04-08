import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Clock,
  Euro,
  Globe,
  Instagram,
  Facebook,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LocationSearch } from '../components/LocationSearch';
import { categories } from '../data/categories';
import { submitPartnerApplication } from '../lib/partner';
import { sendPartnerSubmissionEmail, sendPartnerConfirmationEmail } from '../lib/email';
import { SEO } from '../components/SEO';

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
      if (!formData.business.name) {
        newErrors.business = { ...newErrors.business, name: "Le nom de l'entreprise est requis" };
      }
      if (!formData.business.contactName) {
        newErrors.business = { ...newErrors.business, contactName: "Le nom du contact est requis" };
      }
      if (!formData.business.email) {
        newErrors.business = { ...newErrors.business, email: "L'email est requis" };
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.business.email)) {
        newErrors.business = { ...newErrors.business, email: "L'email n'est pas valide" };
      }
      if (!formData.business.phone) {
        newErrors.business = { ...newErrors.business, phone: "Le téléphone est requis" };
      } else if (!/^\+?[0-9]{10,15}$/.test(formData.business.phone.replace(/\s/g, ''))) {
        newErrors.business = { ...newErrors.business, phone: "Le numéro de téléphone n'est pas valide" };
      }
      if (!formData.business.siret) {
        newErrors.business = { ...newErrors.business, siret: "Le numéro SIRET est requis" };
      } else if (!/^\d{14}$/.test(formData.business.siret)) {
        newErrors.business = { ...newErrors.business, siret: "Le SIRET doit contenir 14 chiffres" };
      }
      if (!formData.business.description) {
        newErrors.business = { ...newErrors.business, description: "La description est requise" };
      }
      if (!formData.business.address) {
        newErrors.business = { ...newErrors.business, address: "L'adresse est requise" };
      }
    } else if (step === 2) {
      if (!formData.offer.title) {
        newErrors.offer = { ...newErrors.offer, title: "Le titre est requis" };
      }
      if (!formData.offer.description) {
        newErrors.offer = { ...newErrors.offer, description: "La description est requise" };
      }
      if (!formData.offer.categorySlug) {
        newErrors.offer = { ...newErrors.offer, categorySlug: "La catégorie est requise" };
      }
      if (!formData.offer.subcategorySlug) {
        newErrors.offer = { ...newErrors.offer, subcategorySlug: "La sous-catégorie est requise" };
      }
      if (!formData.offer.price || formData.offer.price <= 0) {
        newErrors.offer = { ...newErrors.offer, price: "Le prix doit être supérieur à 0" };
      }
      if (formData.offer.promoPrice && formData.offer.promoPrice >= formData.offer.price) {
        newErrors.offer = { ...newErrors.offer, promoPrice: "Le prix promotionnel doit être inférieur au prix standard" };
      }
      if (!formData.offer.location) {
        newErrors.offer = { ...newErrors.offer, location: "La localisation est requise" };
      }
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

  const handleOpeningHoursChange = (day: string, type: 'open' | 'close', value: string) => {
    setFormData(prev => ({
      ...prev,
      business: {
        ...prev.business,
        openingHours: {
          ...prev.business.openingHours,
          [day]: {
            ...prev.business.openingHours[day],
            [type]: value
          }
        }
      }
    }));
  };

  const toggleDayOff = (day: string) => {
    setFormData(prev => ({
      ...prev,
      business: {
        ...prev.business,
        openingHours: {
          ...prev.business.openingHours,
          [day]: prev.business.openingHours[day] ? null : { open: '09:00', close: '19:00' }
        }
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
      await submitPartnerApplication(formData);
      
      // Envoyer les emails
      await Promise.all([
        sendPartnerSubmissionEmail({
          businessName: formData.business.name,
          contactName: formData.business.contactName,
          email: formData.business.email,
          phone: formData.business.phone,
          offer: {
            title: formData.offer.title,
            description: formData.offer.description,
            category: formData.offer.categorySlug,
            subcategory: formData.offer.subcategorySlug,
            price: formData.offer.price,
            location: formData.offer.location
          }
        }),
        sendPartnerConfirmationEmail({
          businessName: formData.business.name,
          contactName: formData.business.contactName,
          email: formData.business.email,
          phone: formData.business.phone,
          offer: {
            title: formData.offer.title,
            description: formData.offer.description,
            category: formData.offer.categorySlug,
            subcategory: formData.offer.subcategorySlug,
            price: formData.offer.price,
            location: formData.offer.location
          }
        })
      ]);

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Une erreur est survenue. Veuillez réessayer.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <SEO 
          title="Demande envoyée"
          description="Votre demande de partenariat a été envoyée avec succès."
        />
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Demande envoyée avec succès !
          </h2>
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
    <div className="min-h-screen bg-gray-50 py-12">
      <SEO 
        title="Devenir partenaire"
        description="Rejoignez notre communauté de partenaires et proposez vos services à nos utilisateurs."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Devenir partenaire
          </h1>
          <p className="text-gray-600">
            Rejoignez notre communauté de partenaires et proposez vos services à nos utilisateurs.
          </p>
        </div>

        {/* Barre de progression */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -translate-y-1/2" />
            <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-semibold">
              1
            </div>
            <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
            } font-semibold`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-sm font-medium ${currentStep === 1 ? 'text-primary' : 'text-gray-500'}`}>
              Informations entreprise
            </span>
            <span className={`text-sm font-medium ${currentStep === 2 ? 'text-primary' : 'text-gray-500'}`}>
              Détails de l'offre
            </span>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2xl p-8">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}

          {currentStep === 1 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-xl font-semibold text-gray-900 mb-8">
                <Building2 className="w-6 h-6 text-primary" />
                <h2>Informations sur votre entreprise</h2>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.business.name}
                  onChange={handleBusinessChange}
                  className={`block w-full rounded-lg border ${
                    errors.business?.name ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                />
                {errors.business?.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.business.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du contact
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.business.contactName}
                  onChange={handleBusinessChange}
                  className={`block w-full rounded-lg border ${
                    errors.business?.contactName ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                />
                {errors.business?.contactName && (
                  <p className="mt-1 text-sm text-red-600">{errors.business.contactName}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.business.email}
                  onChange={handleBusinessChange}
                  className={`block w-full rounded-lg border ${
                    errors.business?.email ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                />
                {errors.business?.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.business.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.business.phone}
                  onChange={handleBusinessChange}
                  className={`block w-full rounded-lg border ${
                    errors.business?.phone ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                />
                {errors.business?.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.business.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="siret" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro SIRET
                </label>
                <input
                  type="text"
                  id="siret"
                  name="siret"
                  value={formData.business.siret}
                  onChange={handleBusinessChange}
                  className={`block w-full rounded-lg border ${
                    errors.business?.siret ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                />
                {errors.business?.siret && (
                  <p className="mt-1 text-sm text-red-600">{errors.business.siret}</p>
                )}
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Site web (optionnel)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.business.website}
                    onChange={handleBusinessChange}
                    placeholder="https://"
                    className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram (optionnel)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="instagram"
                    name="instagram"
                    value={formData.business.instagram}
                    onChange={handleBusinessChange}
                    placeholder="@votrecompte"
                    className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  />
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook (optionnel)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="facebook"
                    name="facebook"
                    value={formData.business.facebook}
                    onChange={handleBusinessChange}
                    placeholder="@votrepagefacebook"
                    className="block w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  />
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description de votre entreprise
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.business.description}
                  onChange={handleBusinessChange}
                  rows={4}
                  className={`block w-full rounded-lg border ${
                    errors.business?.description ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                  placeholder="Décrivez votre entreprise, vos services, votre expertise..."
                />
                {errors.business?.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.business.description}</p>
                )}
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <LocationSearch onLocationSelect={handleLocationSelect} />
                {errors.business?.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.business.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Horaires d'ouverture
                </label>
                <div className="space-y-4">
                  {days.map(day => (
                    <div key={day.id} className="flex items-center gap-4">
                      <div className="w-24">
                        <span className="text-sm text-gray-600">{day.label}</span>
                      </div>
                      {formData.business.openingHours[day.id] ? (
                        <>
                          <input
                            type="time"
                            value={formData.business.openingHours[day.id]?.open}
                            onChange={(e) => handleOpeningHoursChange(day.id, 'open', e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:ring focus:ring-primary/20"
                          />
                          <span className="text-gray-500">à</span>
                          <input
                            type="time"
                            value={formData.business.openingHours[day.id]?.close}
                            onChange={(e) => handleOpeningHoursChange(day.id, 'close', e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:ring focus:ring-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => toggleDayOff(day.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Fermé
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleDayOff(day.id)}
                          className="text-sm text-primary hover:text-primary-dark"
                        >
                          + Ajouter des horaires
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-xl font-semibold text-gray-900 mb-8">
                <FileText className="w-6 h-6 text-primary" />
                <h2>Détails de votre offre</h2>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titre de l'offre
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.offer.title}
                  onChange={handleOfferChange}
                  className={`block w-full rounded-lg border ${
                    errors.offer?.title ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                />
                {errors.offer?.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.offer.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description de l'offre
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.offer.description}
                  onChange={handleOfferChange}
                  rows={4}
                  className={`block w-full rounded-lg border ${
                    errors.offer?.description ? 'border-red-300' : 'border-gray-300'
                  } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                  placeholder="Décrivez votre offre en détail..."
                />
                {errors.offer?.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.offer.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="categorySlug" className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    id="categorySlug"
                    name="categorySlug"
                    value={formData.offer.categorySlug}
                    onChange={handleOfferChange}
                    className={`block w-full rounded-lg border ${
                      errors.offer?.categorySlug ? 'border-red-300' : 'border-gray-300'
                    } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {categories.map(category => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.offer?.categorySlug && (
                    <p className="mt-1 text-sm text-red-600">{errors.offer.categorySlug}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="subcategorySlug" className="block text-sm font-medium text-gray-700 mb-1">
                    Sous-catégorie
                  </label>
                  <select
                    id="subcategorySlug"
                    name="subcategorySlug"
                    value={formData.offer.subcategorySlug}
                    onChange={handleOfferChange}
                    className={`block w-full rounded-lg border ${
                      errors.offer?.subcategorySlug ? 'border-red-300' : 'border-gray-300'
                    } px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                    disabled={!formData.offer.categorySlug}
                  >
                    <option value="">Sélectionnez une sous-catégorie</option>
                    {formData.offer.categorySlug && categories
                      .find(cat => cat.slug === formData.offer.categorySlug)
                      ?.subcategories.map(subcategory => (
                        <option key={subcategory.slug} value={subcategory.slug}>
                          {subcategory.name}
                        </option>
                      ))}
                  </select>
                  {errors.offer?.subcategorySlug && (
                    <p className="mt-1 text-sm text-red-600">{errors.offer.subcategorySlug}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Prix standard
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="price"
                      name="price"
                      min="0"
                      step="0.01"
                      value={formData.offer.price || ''}
                      onChange={handleOfferChange}
                      className={`block w-full rounded-lg border ${
                        errors.offer?.price ? 'border-red-300' : 'border- gray-300'
                      } pl-4 pr-12 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-gray-500">€</span>
                    </div>
                  </div>
                  {errors.offer?.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.offer.price}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="promoPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Prix promotionnel (optionnel)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="promoPrice"
                      name="promoPrice"
                      min="0"
                      step="0.01"
                      value={formData.offer.promoPrice || ''}
                      onChange={handleOfferChange}
                      className={`block w-full rounded-lg border ${
                        errors.offer?.promoPrice ? 'border-red-300' : 'border-gray-300'
                      } pl-4 pr-12 py-3 focus:border-primary focus:ring focus:ring-primary/20`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-gray-500">€</span>
                    </div>
                  </div>
                  {errors.offer?.promoPrice && (
                    <p className="mt-1 text-sm text-red-600">{errors.offer.promoPrice}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Localisation de l'offre
                </label>
                <LocationSearch onLocationSelect={(location) => {
                  setFormData(prev => ({
                    ...prev,
                    offer: {
                      ...prev.offer,
                      location: location.address
                    }
                  }));
                }} />
                {errors.offer?.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.offer.location}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Retour
              </button>
            )}
            <div className="ml-auto">
              {currentStep < 2 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`
                    inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white
                    ${isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                    }
                  `}
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}