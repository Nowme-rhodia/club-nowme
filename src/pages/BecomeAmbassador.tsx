import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { MapPin, Clock, Heart, CheckCircle, Smartphone, Calendar, ShieldCheck, Users } from 'lucide-react';

export default function BecomeAmbassador() {
    const { user, profile } = useAuth();
    const [formData, setFormData] = useState({
        location: '',
        phone: '',
        availability: '2-4h',
        motivation: ''
    });

    React.useEffect(() => {
        if (profile?.phone && !formData.phone) {
            setFormData(prev => ({ ...prev, phone: profile.phone || '' }));
        }
    }, [profile]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error('Vous devez être connectée pour postuler.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('ambassador_applications')
                .insert({
                    user_id: user.id,
                    location: formData.location,
                    phone: formData.phone,
                    availability_hours_per_week: parseInt(formData.availability.split('-')[0]), // Simple parsing
                    motivation_text: formData.motivation
                } as any);

            if (error) throw error;

            // Trigger Notification Edge Function (Fire and Forget)
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-ambassador-application`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    record: {
                        user_id: user.id,
                        email: user.email, // Added email
                        location: formData.location,
                        phone: formData.phone,
                        motivation_text: formData.motivation
                    }
                })
            }).catch(err => console.error("Notification trigger failed:", err));

            if (error) throw error;

            setIsSuccess(true);
            toast.success('Candidature envoyée avec succès !');
        } catch (error) {
            console.error('Error submitting application:', error);
            toast.error("Une erreur est survenue lors de l'envoi de votre candidature.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg text-center relative animate-fade-in-up">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 animate-bounce-short">
                        <span className="text-4xl">✨</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
                        Candidature envoyée !
                    </h2>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                        Merci pour ton engagement. On étudie ton profil avec attention et on te contactera très vite pour en parler davantage et t'expliquer les prochaines étapes.
                    </p>
                    <button
                        onClick={() => window.location.href = '/community-space'}
                        className="w-full inline-flex justify-center items-center px-6 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-primary hover:bg-primary-dark transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        Retour au QG
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <div className="relative bg-pink-900 py-24 sm:py-32">
                <div className="absolute inset-0 overflow-hidden">
                    <img
                        src="https://images.unsplash.com/photo-1529156069896-859328829c57?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80"
                        alt="Groupe d'amis riant"
                        className="w-full h-full object-cover opacity-20"
                    />
                </div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                        Deviens Ambassadrice NowMe
                    </h1>
                    <p className="mt-6 text-xl text-pink-100 max-w-3xl mx-auto">
                        Prends le lead de ta communauté, organise des événements mémorables et crée du lien dans ton quartier.
                        C'est ton moment de briller ! ✨
                    </p>
                </div>
            </div>

            {/* Le Deal Section */}
            <div className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Le Deal 🤝
                        </h2>
                        <p className="mt-4 text-lg text-gray-500">
                            Un rôle clé, des avantages exclusifs.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                        {/* Carte Abonnement */}
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Users className="w-24 h-24 text-gray-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Ton Engagement</h3>
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-extrabold text-gray-900">12,99€</span>
                                <span className="ml-2 text-gray-500">/mois</span>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-start">
                                    <Clock className="flex-shrink-0 h-6 w-6 text-primary" />
                                    <span className="ml-3 text-gray-600">
                                        <strong>Engagement 6 mois</strong> renouvelable : on construit sur la durée.
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <Users className="flex-shrink-0 h-6 w-6 text-primary" />
                                    <span className="ml-3 text-gray-600">
                                        <strong>Référente locale</strong> : tu animes et modères ton groupe WhatsApp Hub.
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <MapPin className="flex-shrink-0 h-6 w-6 text-primary" />
                                    <span className="ml-3 text-gray-600">
                                        <strong>Présence 3x / mois</strong> minimum (en tant que Host ou simple participante).
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="flex-shrink-0 h-6 w-6 text-primary" />
                                    <span className="ml-3 text-gray-600">
                                        Abo 12,99€ maintenu (accès plateforme), mais tes 3 sorties sont <strong>100% offertes</strong>.
                                    </span>
                                </li>
                            </ul>
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <p className="text-sm text-gray-500 italic">
                                    "Zéro pression : on te fournit le 'Guide de la Parfaite Ambassadrice' et on t'accompagne personnellement pour ta première Squad."
                                </p>
                            </div>
                        </div>

                        {/* Carte Avantages */}
                        <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl p-8 border border-pink-100 shadow-lg relative overflow-hidden transform scale-105">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <ShieldCheck className="w-24 h-24 text-primary" />
                            </div>
                            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                SUPER POUVOIRS
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Tes Avantages</h3>
                            <ul className="space-y-4 mt-8">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">🎉</div>
                                    <span className="ml-3 text-gray-800 font-medium pt-1">Tes événements officiels sont GRATUITS <span className="text-sm text-gray-500 font-normal">(jusqu'à 50€, réduction au-delà)</span></span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">👑</div>
                                    <span className="ml-3 text-gray-800 font-medium pt-1">Badge "Host Officielle" sur ton profil</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">🚀</div>
                                    <span className="ml-3 text-gray-800 font-medium pt-1">Visibilité prioritaire pour tes Squads</span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">🤝</div>
                                    <span className="ml-3 text-gray-800 font-medium pt-1">
                                        Accès à 'The Core' : rejoins le cercle privé des ambassadrices NowMe pour networker et co-construire le futur du club.
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">🎁</div>
                                    <span className="ml-3 text-gray-800 font-medium pt-1">Goodies & Surprises exclusives</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Besoin Urgent Section */}
            <div className="bg-gray-50 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="p-8 lg:p-12">
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-100 text-red-800 font-semibold text-sm mb-6">
                                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                                    BESOIN URGENT
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                                    Nous avons besoin de leaders ICI ! 👇
                                </h3>
                                <p className="text-lg text-gray-600 mb-8">
                                    Ces zones regorgent de membres mais manquent de leaders pour dynamiser la communauté. On a besoin de toi partout en Île-de-France !
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        "75 - Paris", "77 - Seine-et-Marne",
                                        "78 - Yvelines", "91 - Essonne",
                                        "92 - Hauts-de-Seine", "93 - Seine-Saint-Denis",
                                        "94 - Val-de-Marne", "95 - Val-d'Oise"
                                    ].map((dept) => (
                                        <div key={dept} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <MapPin className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                                            <span className="font-bold text-gray-900 text-sm">{dept}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative h-64 lg:h-auto bg-gray-200">
                                <img
                                    src="https://images.unsplash.com/photo-1549637642-90187f64f420?ixlib=rb-4.0.3&auto=format&fit=crop&w=1774&q=80"
                                    alt="Map illustration"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/10 lg:to-white/0"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Application Form */}
            <div className="py-16 bg-white" id="application-form">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Prête à te lancer ?
                        </h2>
                        <p className="mt-4 text-lg text-gray-500">
                            Remplis ce petit formulaire pour nous dire qui tu es.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                Ta Ville / Quartier actuel
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="location"
                                    id="location"
                                    required
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                                    placeholder="Ex: Paris 11ème, Saint-Ouen..."
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Ton Numéro de Téléphone
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Smartphone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    name="phone"
                                    id="phone"
                                    required
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                                    placeholder="Ex: 06 12 34 56 78"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="availability" className="block text-sm font-medium text-gray-700">
                                Disponibilité estimée par semaine
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    id="availability"
                                    name="availability"
                                    required
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                                    value={formData.availability}
                                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                                >
                                    <option value="2-4h">2-4 heures</option>
                                    <option value="5-8h">5-8 heures</option>
                                    <option value="8h+">Plus de 8 heures</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="motivation" className="block text-sm font-medium text-gray-700">
                                Pourquoi veux-tu devenir ambassadrice ?
                                <span className="text-gray-400 font-normal ml-2">(Ton super-pouvoir, tes envies...)</span>
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="motivation"
                                    name="motivation"
                                    rows={4}
                                    required
                                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md p-3"
                                    placeholder="Raconte-nous pourquoi tu serais une ambassadrice géniale !"
                                    value={formData.motivation}
                                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-start bg-pink-50 p-4 rounded-lg">
                            <div className="flex items-center h-5">
                                <input
                                    id="engagement"
                                    name="engagement"
                                    type="checkbox"
                                    required
                                    className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="engagement" className="font-medium text-gray-900">
                                    Je comprends et j'accepte l'engagement de 6 mois et la présence requise de 3 fois par mois.
                                </label>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-sm text-lg font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Envoi en cours...
                                    </div>
                                ) : (
                                    'Envoyer ma candidature 🚀'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
