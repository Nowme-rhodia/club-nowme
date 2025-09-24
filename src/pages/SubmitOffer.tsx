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
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTION_URL}/send-partner-submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.business.name,
          contactName: formData.business.contactName,
          email: formData.business.email,
          phone: formData.business.phone,
          website: formData.business.website,
          siret: formData.business.siret,
          address: formData.business.address,
          message: formData.business.description
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Erreur lors de l'envoi");

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
    // ... le reste du JSX (inchangé, ton wizard avec étapes 1 et 2)
  );
}
