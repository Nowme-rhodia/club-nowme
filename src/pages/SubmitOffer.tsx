import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  AlertCircle,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  Star,
  Users,
  TrendingUp,
  ArrowRight,
  Heart
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { LocationSearch } from '../components/LocationSearch';

interface FormData {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  siret?: string;
  message: string;
  website: string;
  instagram: string;
  facebook: string;
  address: string;
  password?: string;
  confirmPassword?: string;
  mainCategoryId: string;
  subcategoryIds: string[];
}

export default function SubmitOffer() {
  // Données de test en mode développement
  const isDev = import.meta.env.DEV;

  const [formData, setFormData] = useState<FormData>({
    businessName: isDev ? 'Spa Zen & Bien-être' : '',
    siret: isDev ? '12345678900012' : '',
    contactName: isDev ? 'Marie Dupont' : '',
    email: isDev ? `marie.dupont.${Date.now()}@spa-zen.fr` : '', // Unique email for dev
    phone: isDev ? '0612345678' : '',
    address: isDev ? '12 rue de la Paix, 75001 Paris' : '',
    message: isDev ? 'Nous sommes un spa spécialisé dans les massages bien-être, la relaxation et les soins du corps. Nous proposons une gamme complète de services incluant massages, soins du visage, hammam et sauna. Notre équipe de professionnels qualifiés offre une expérience unique de détente et de bien-être.' : '',
    website: isDev ? 'https://spa-zen.fr' : '',
    instagram: isDev ? '@spa_zen_bienetre' : '',
    facebook: isDev ? 'SpaZenBienEtre' : '',
    password: '',
    confirmPassword: '',
    mainCategoryId: '',
    subcategoryIds: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string; parent_name: string | null }[]>([]);

  React.useEffect(() => {
    supabase
      .from('offer_categories')
      .select('id, name, parent_name')
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  const mainCategories = categories.filter(c => !c.parent_name);
  const subCategories = formData.mainCategoryId
    ? categories.filter(c => c.parent_name === categories.find(mc => mc.id === formData.mainCategoryId)?.name)
    : [];

  const handleSubCategoryToggle = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.subcategoryIds.includes(id);
      return {
        ...prev,
        subcategoryIds: isSelected
          ? prev.subcategoryIds.filter(catId => catId !== id)
          : [...prev.subcategoryIds, id]
      };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Le nom de l'entreprise est requis";
    }
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Le nom du contact est requis';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Un email valide est requis';
    }
    if (!formData.phone.trim() || !/^[0-9]{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Un numéro de téléphone à 10 chiffres est requis';
    }
    if (!formData.address.trim()) {
      newErrors.address = "L'adresse légale est requise";
    }
    if (!formData.message.trim() || formData.message.trim().length < 20) {
      newErrors.message = 'Veuillez décrire votre activité (minimum 20 caractères)';
    }

    // Password validation
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    } else {
      // Optional: Stricter checks if desired
      if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Le mot de passe doit contenir 1 majuscule';
      else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Le mot de passe doit contenir 1 chiffre';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {


      // Create a timeout promise (45 seconds)
      const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Le serveur met trop de temps à répondre.')), 45000);
      });

      // Invoke Supabase Function
      const invokePromise = supabase.functions.invoke('send-partner-submission', {
        body: {
          business: {
            name: formData.businessName,
            siret: formData.siret,
            contactName: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            message: formData.message,
            website: formData.website || undefined,
            instagram: formData.instagram || undefined,
            facebook: formData.facebook || undefined,
            password: formData.password, // [NEW] Sending password
            mainCategoryId: formData.mainCategoryId,
            subcategoryIds: formData.subcategoryIds,
          },
        },
      });

      // Race them
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Supabase invoke error:', error);
        throw error;
      }



      if (!data || data.success === false) {
        const errorMsg = data?.error || data?.debug?.message || "Erreur lors de l'envoi";
        console.error('❌ Function returned logical error:', data);
        if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
          setErrors(prev => ({ ...prev, email: 'Cet email est déjà enregistré.' }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
          throw new Error('Cet email est déjà enregistré.');
        }
        throw new Error(errorMsg);
      }


      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('❌ Submission Error:', error);
      const errorMessage = error.message || 'Une erreur est survenue. Veuillez réessayer.';
      if (!errors.email) { // Don't overwrite if it's the email error handled above
        setErrors((prev) => ({
          ...prev,
          message: errorMessage,
        }));
      }
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
          <h2 className="text-3xl font-bold text-gray-900">Compte créé avec succès !</h2>
          <p className="mt-2 text-gray-600">
            Votre demande de partenariat a été enregistrée et votre compte est créé.
          </p>
          <div className="mt-4 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p className="font-semibold">Vérifiez vos emails 📧</p>
            <p>Vous allez recevoir une confirmation. Une fois votre dossier approuvé par notre équipe (48h max), vous pourrez vous connecter avec le mot de passe que vous venez de définir.</p>
          </div>
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
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Devenir partenaire - NowMe Club"
        description="Rejoignez Nowme Club et proposez vos offres bien-être à une communauté engagée."
      />

      {/* Hero Section */}
      <div className="bg-primary text-white py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1529156069896-85cecd3f4351?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight leading-tight">
            Devenez l'une de nos adresses <br />
            <span className="text-white bg-white/20 px-4 py-1 rounded-full italic transform -rotate-2 inline-block mt-2">Coup de Cœur</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-95 leading-relaxed font-light">
            Le Club Nowme n'est pas un annuaire. C'est le <strong>guide complice</strong> de femmes 30+ qui veulent profiter de la vie.
            <br className="hidden md:block" />
            Nous sélectionnons les lieux qui feront vibrer leur quotidien.
          </p>
          <button
            onClick={() => document.getElementById('partner-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center px-10 py-5 bg-white text-primary rounded-full text-lg font-bold hover:bg-orange-50 transition-all duration-300 shadow-xl hover:-translate-y-1 group"
          >
            Proposer mon établissement
            <Heart className="ml-3 w-5 h-5 group-hover:fill-current transition-colors" />
          </button>
        </div>
      </div>

      {/* Philosophy Section */}
      <div className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Notre Mission : L'Incitation au Kiff</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Nous avons créé un écosystème vertueux où se faire plaisir est encouragé et récompensé.
              Du restaurant au théâtre, en passant par le sport et le bien-être, nous guidons nos membres vers les meilleures expériences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="text-center group">
              <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <Star className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Une Plateforme humaine</h3>
              <p className="text-gray-600 leading-relaxed px-4">
                Nos membres ne cherchent pas juste "un endroit", elles cherchent <strong>LA bonne adresse</strong> recommandée par le Club. Être partenaire, c'est vous mettre en avant sur nos réseaux, c'est organiser des  sorties. C'est une communauté qui échange uniquement sur les prochains kiffs à se faire.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Le Kiff Récompensé</h3>
              <p className="text-gray-600 leading-relaxed px-4">
                Nous souhaitons que nos membres se fassent plaisir, nous leur offrons du <strong>Cashback</strong> sur chaque expérience. Plus elles se font plaisir chez vous, plus elles y gagnent.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-10 h-10 text-teal-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Une Sélection Pointue</h3>
              <p className="text-gray-600 leading-relaxed px-4">
                Nous ne visons pas la quantité mais la <strong>qualité</strong>. 5 partenaires sélectionnés dans votre niche et ville, pour garantir une visibilité exceptionnelle à chacun. Avec des événements communs, une vraie relation entre le membre et le partenaire.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Ribbon */}
      <div className="py-12 bg-gray-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-400 text-sm tracking-widest uppercase mb-8">Nous recherchons des pépites dans tous les univers</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-white font-medium opacity-80">
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Bien-être & Relaxation</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Culture & Divertissement</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Gastronomie & Art de la Table</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Sport & Activités Physiques</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Voyages & Expériences</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Loisirs & Créativité</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Développement Personnel</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Mode & Shopping</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Services à Domicile</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Spiritualité & Énergie</span>
            <span className="px-5 py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-default">Produits</span>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div id="partner-form" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border-t-8 border-primary">
            <div className="px-8 py-12">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Rejoignez l'aventure</h2>
                <p className="text-gray-600">
                  Parlez-nous de votre lieu et de ce qui le rend unique.
                  <br />Nous avons hâte de vous découvrir.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Form Content - Kept exactly as verified previously */}
                {/* Nom de l'entreprise */}
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'entreprise <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${errors.businessName ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="Ex: Spa Zen & Bien-être"
                  />
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.businessName}
                    </p>
                  )}
                </div>

                {/* SIRET */}
                <div>
                  <label htmlFor="siret" className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro SIRET <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="siret"
                    name="siret"
                    value={formData.siret}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${errors.siret ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="123 456 789 00012"
                  />
                  {errors.siret && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.siret}
                    </p>
                  )}
                </div>

                {/* Adresse légale */}
                <div className="relative">
                  <label htmlFor="address-search" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse légale de l'entreprise <span className="text-red-500">*</span>
                  </label>
                  <LocationSearch
                    initialValue={formData.address}
                    onSelect={(location) => {
                      setFormData((prev) => ({ ...prev, address: location.address }));
                      if (errors.address) {
                        setErrors((prev) => ({ ...prev, address: undefined }));
                      }
                    }}
                    error={errors.address}
                  />
                </div>

                {/* Nom du contact */}
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${errors.contactName ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="Ex: Marie Dupont"
                  />
                  {errors.contactName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.contactName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email professionnel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${errors.email ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="contact@votre-entreprise.fr"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe souhaité <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${errors.password ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="8 caractères minimum, 1 majuscule, 1 chiffre"
                      autoComplete="new-password"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation du mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Répétez le mot de passe"
                      autoComplete="new-password"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${errors.phone ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="0612345678"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.phone}
                    </p>
                  )}
                </div>


                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Décrivez votre activité <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none ${errors.message ? 'border-red-500' : 'border-gray-200'
                      }`}
                    placeholder="Parlez-nous de votre entreprise, vos services, et pourquoi vous souhaitez rejoindre Nowme Club..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {formData.message.length} / 20 caractères minimum
                  </p>
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Catégories */}
                <div>
                  <label htmlFor="mainCategoryId" className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie Principale du Partenaire
                  </label>
                  <div className="relative">
                    <select
                      id="mainCategoryId"
                      name="mainCategoryId"
                      value={formData.mainCategoryId}
                      onChange={(e) => setFormData({ ...formData, mainCategoryId: e.target.value, subcategoryIds: [] })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition appearance-none bg-white"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {mainCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {formData.mainCategoryId && subCategories.length > 0 && (
                  <div className="animate-fade-in-down">
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      Sous-catégories (Expertises spécifiques)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50 custom-scrollbar">
                      {subCategories.map(sub => (
                        <label key={sub.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white rounded-md transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.subcategoryIds.includes(sub.id)}
                            onChange={() => handleSubCategoryToggle(sub.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-sm text-gray-700">{sub.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500 font-medium">Présence en ligne</span>
                  </div>
                </div>

                {/* Site web */}
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    Site web
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    placeholder="https://votre-site.fr"
                  />
                </div>

                {/* Réseaux sociaux */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram <span className="text-gray-400 font-normal text-xs">(URL https://)</span>
                    </label>
                    <input
                      type="text"
                      id="instagram"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="https://instagram.com/votre_compte"
                    />
                  </div>

                  <div>
                    <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook <span className="text-gray-400 font-normal text-xs">(URL https://)</span>
                    </label>
                    <input
                      type="text"
                      id="facebook"
                      name="facebook"
                      value={formData.facebook}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="https://facebook.com/VotrePage"
                    />
                  </div>
                </div>

                {/* Terms Acceptance */}
                <div className="flex items-start bg-blue-50/50 p-4 rounded-lg">
                  <div className="flex items-center h-5">
                    <input
                      id="acceptTerms"
                      name="acceptTerms"
                      type="checkbox"
                      required
                      className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="acceptTerms" className="font-medium text-gray-700">
                      J'accepte les <Link to="/conditions-partenaires" target="_blank" className="text-primary hover:underline font-semibold">Conditions Générales de Partenariat</Link>
                    </label>
                    <p className="text-gray-500 mt-1">
                      En cochant cette case, je donne mandat express à NOWME pour facturer en mon nom et pour mon compte.
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-full text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Envoi en cours...
                      </>
                    ) : (
                      'Envoyer ma candidature'
                    )}
                  </button>
                </div>

                <p className="text-xs text-center text-gray-400">
                  En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe concernant
                  votre demande de partenariat.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Questions fréquentes</h2>
          <div className="grid gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Quel est le modèle économique ?</h3>
              <p className="text-gray-600 leading-relaxed">
                C'est un modèle au succès : l'inscription est gratuite. Nous prenons une commission de 10% à 30% uniquement lorsque nous vous apportons une cliente. Si nous ne vous apportons personne, vous ne payez rien.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Comment fonctionne le Cashback ?</h3>
              <p className="text-gray-600 leading-relaxed">
                Sur chaque achat ou réservation effectué chez vous via le Club, nous reversons une partie de notre commission à la cliente. C'est notre manière de l'inciter à découvrir votre établissement et à revenir.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Comment sont élus les partenaires ?</h3>
              <p className="text-gray-600 leading-relaxed">
                Nous recherchons des lieux et des activités avec une âme, qui partagent nos valeurs de bienveillance et de plaisir. Nous limitons volontairement le nombre de partenaires pour garantir une vraie relation de confiance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
