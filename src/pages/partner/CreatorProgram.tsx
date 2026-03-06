import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Sparkles,
    Zap,
    Gift,
    Timer,
    CheckCircle,
    AlertCircle,
    Instagram,
    Video,
    Layout,
    ArrowRight,
    Heart,
    Lock,
    Eye,
    EyeOff,
    Users
} from 'lucide-react';
import { SEO } from '../../components/SEO';
import { supabase } from '../../lib/supabase';

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    businessType: 'auto-entrepreneur' | 'company';
    siret: string;
    instagram: string;
    tiktok: string;
    message: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms: boolean;
}

export default function CreatorProgram() {
    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        businessType: 'auto-entrepreneur',
        siret: '',
        instagram: '',
        tiktok: '',
        message: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};

        if (!formData.firstName.trim()) newErrors.firstName = "Prénom requis";
        if (!formData.lastName.trim()) newErrors.lastName = "Nom requis";
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Email valide requis";
        }
        if (!formData.phone.trim()) newErrors.phone = "Téléphone requis";
        if (!formData.siret.trim() || formData.siret.replace(/\s/g, '').length !== 14) {
            newErrors.siret = "SIRET valide requis (14 chiffres)";
        }
        if (!formData.password || formData.password.length < 8) {
            newErrors.password = "8 caractères minimum";
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
        }
        if (!formData.acceptTerms) {
            newErrors.acceptTerms = "Vous devez accepter les conditions";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (errors[name as keyof FormData]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Appel à la fonction Supabase adaptée
            const { data, error } = await supabase.functions.invoke('send-partner-submission', {
                body: {
                    business: {
                        name: `${formData.firstName} ${formData.lastName}`,
                        contactName: `${formData.firstName} ${formData.lastName}`,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        siret: formData.siret,
                        message: `[CREATRISE] ${formData.message}`,
                        instagram: formData.instagram,
                        tiktok: formData.tiktok,
                        password: formData.password,
                        isCreator: true,
                        mainCategoryId: 'CREATOR', // Catégorie spéciale pour les repérer
                    }
                }
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.error);

            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            console.error('Error submitting application:', err);
            setErrors(prev => ({ ...prev, message: err.message || "Une erreur est survenue" }));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Bienvenue dans le cercle ! ✨</h2>
                    <p className="text-gray-600 mb-8">
                        Ton inscription a bien été reçue. Notre équipe va valider ton profil sous 48h.
                        Tu recevras alors un email avec tes accès et ton kit partenaire personnalisé.
                    </p>
                    <Link to="/" className="inline-flex items-center px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-dark transition-all shadow-lg">
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <SEO
                title="Programme Partenaire Créatrice - Club Nowme"
                description="Devenez ambassadrice du Club n°1 des femmes en Île-de-France. 15€ par abonnée fidèle."
            />

            {/* Hero Section */}
            <section className="relative h-[80vh] flex items-center overflow-hidden bg-gray-900">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80"
                        alt="Women laughing"
                        className="w-full h-full object-cover opacity-30"
                    />
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white mb-8 border border-white/20">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Programme Créatrices Nowme</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
                        Partage le Kiff, <br />
                        <span className="text-primary italic">Sois rémunérée.</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                        Rejoins le cercle exclusif des créatrices qui font vibrer le premier club sorties 100% féminin d'IDF.
                    </p>
                    <button
                        onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-10 py-5 bg-primary text-white rounded-full text-lg font-bold hover:bg-primary-dark transition-all shadow-2xl hover:scale-105 active:scale-95"
                    >
                        Devenir Partenaire Créatrice
                    </button>
                </div>
            </section>

            {/* Benefits Grid */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16 font-bold">
                        <h2 className="text-3xl md:text-4xl text-gray-900">Pourquoi nous rejoindre ?</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <Zap className="w-10 h-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold mb-3">15 € / abonnée</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Rémunération claire et motivante pour chaque nouveau membre fidèle au Club.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <Timer className="w-10 h-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold mb-3">Cookie 30 jours</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Tes liens sont suivis pendant 30 jours. La commission t'est attribuée même si l'achat se fait plus tard.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <Gift className="w-10 h-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold mb-3">Accès Club Offert</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Teste le Club gratuitement pendant 1 mois pour créer du contenu authentique et kiffer avec nous.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <Users className="w-10 h-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold mb-3">Impact Local</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Aide les femmes d'IDF à se rencontrer et à sortir de leur routine. Un produit qui a du sens.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Details Section */}
            <section className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <h2 className="text-3xl font-bold mb-8 relative z-10">Le fonctionnement en 2 mots</h2>
                        <div className="space-y-8 relative z-10">
                            <div className="flex items-start space-x-4">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                                <div>
                                    <p className="font-bold text-lg">Inscris-toi & Reçois ton Kit</p>
                                    <p className="text-gray-400">Accède à tes liens, tes visuels personnalisés et ton code promo exclusif.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                                <div>
                                    <p className="font-bold text-lg">Partage le Kiff</p>
                                    <p className="text-gray-400">Fais découvrir l'Agenda Secret à ta communauté via tes Stories, Reels ou TikTok.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                                <div>
                                    <p className="font-bold text-lg">Encaisse tes commissions</p>
                                    <p className="text-gray-400">Dès que ton abonnée confirme son 2ème mois, les 15 € sont pour toi. Virement le 5 de chaque mois.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Registration Form */}
            <section id="apply-form" className="py-24 bg-gray-50 border-t border-gray-200">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                        <div className="px-8 py-12">
                            <h2 className="text-3xl font-bold text-center mb-12">Deviens Créatrice Nowme</h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                                        <input
                                            type="text" name="firstName" required
                                            value={formData.firstName} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                                            placeholder="Jane"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                                        <input
                                            type="text" name="lastName" required
                                            value={formData.lastName} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Professionnel</label>
                                        <input
                                            type="email" name="email" required
                                            value={formData.email} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                                            placeholder="contact@agence-creatrice.fr"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                                        <input
                                            type="tel" name="phone" required
                                            value={formData.phone} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                                            placeholder="06 12 34 56 78"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Adresse postale (siège ou domicile pro)</label>
                                    <input
                                        type="text" name="address" required
                                        value={formData.address} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                                        placeholder="12 rue pépites, 75001 Paris"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Statut Fiscal</label>
                                        <select
                                            name="businessType"
                                            value={formData.businessType} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm bg-white"
                                        >
                                            <option value="auto-entrepreneur">Auto-entrepreneur / Micro-entreprise</option>
                                            <option value="company">Société (SASU, EURL, SAS...)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Numéro SIRET</label>
                                        <input
                                            type="text" name="siret" required
                                            value={formData.siret} onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary transition text-sm ${errors.siret ? 'border-red-500' : 'border-gray-200'}`}
                                            placeholder="14 chiffres"
                                        />
                                        {errors.siret && <p className="text-xs text-red-500 mt-1">{errors.siret}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Instagram (URL)</label>
                                        <div className="relative">
                                            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="url" name="instagram"
                                                value={formData.instagram} onChange={handleChange}
                                                className="w-full px-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                                                placeholder="https://instagram.com/..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">TikTok (URL)</label>
                                        <div className="relative">
                                            <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="url" name="tiktok"
                                                value={formData.tiktok} onChange={handleChange}
                                                className="w-full px-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                                                placeholder="https://tiktok.com/@..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe pour ton accès partenaire</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"} name="password" required
                                            value={formData.password} onChange={handleChange}
                                            className={`w-full px-10 py-3 rounded-xl border focus:ring-2 focus:ring-primary transition text-sm ${errors.password ? 'border-red-500' : 'border-gray-200'}`}
                                            placeholder="8 caractères minimum"
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <button
                                            type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Un petit mot pour l'équipe ? (Optionnel)</label>
                                    <textarea
                                        name="message" rows={3}
                                        value={formData.message} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm resize-none"
                                        placeholder="Pourquoi as-tu envie de faire rayonner le Club ?"
                                    />
                                </div>

                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <div className="flex items-start">
                                        <input
                                            id="acceptTerms" name="acceptTerms" type="checkbox" required
                                            checked={formData.acceptTerms} onChange={handleChange}
                                            className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                                        />
                                        <label htmlFor="acceptTerms" className="ml-3 text-xs text-gray-600 leading-relaxed cursor-pointer">
                                            J'accepte les <Link to="/conditions-partenaires-creatrices" target="_blank" className="font-bold text-primary hover:underline">Conditions Générales du Programme Créatrices</Link>.
                                            Je certifie avoir un statut de micro-entrepreneur ou de société actif et je donne mandat de facturation à Nowme.
                                        </label>
                                    </div>
                                    {errors.acceptTerms && <p className="text-[10px] text-red-500 mt-2 ml-7">{errors.acceptTerms}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-primary text-white rounded-full font-bold text-lg shadow-xl hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
                                >
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>Envoyer ma candidature</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rules Section */}
            <section className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-xl font-bold mb-6 flex items-center">
                                <Layout className="w-5 h-5 text-primary mr-3" />
                                Règles du Programme
                            </h3>
                            <ul className="space-y-4 text-sm text-gray-600">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    Pas de publicités payantes (Ads) sur les mots-clés "Nowme".
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    Pas de faux avis ou promesses trompeuses.
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    Utilisation des visuels fournis dans le Kit Digital.
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-6 flex items-center">
                                <Zap className="w-5 h-5 text-primary mr-3" />
                                Paiements
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Les commissions sont validées dès le renouvellement du 2ème mois de ton abonnée.
                            </p>
                            <ul className="space-y-4 text-sm text-gray-600">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    Virement ou PayPal le 5 du mois M+1.
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">•</span>
                                    Seuil minimum de paiement : 30 € (soit 2 abonnées fidèles).
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
