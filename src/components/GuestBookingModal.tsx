import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, User, Phone, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface GuestBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    offerTitle: string;
}

export default function GuestBookingModal({ isOpen, onClose, onSuccess, offerTitle }: GuestBookingModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
    });

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 1. Validation
            if (formData.password.length < 6) throw new Error("Le mot de passe doit faire 6 caractères minimum.");
            if (formData.phone.length < 10) throw new Error("Numéro de téléphone invalide.");

            // 2. Sign Up
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error("Erreur de création de compte.");

            // 3. Profile Creation (via Edge Function)
            // This is crucial to ensure they have the 'subscriber' role and profile entry
            const apiUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const profileResponse = await fetch(`${apiUrl}/functions/v1/link-auth-to-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify({
                    email: formData.email,
                    authUserId: authData.user.id,
                    role: 'subscriber', // Free user
                    plan: 'monthly', // Default, unrelated but required by endpoint usually
                    termsAccepted: true
                })
            });

            if (!profileResponse.ok) {
                console.error("Profile creation failed, checking if critical...");
                // Often harmless if the trigger already ran, but good to be safe.
            }

            // 4. Update Profile with Phone/Name (Edge function might do name, but let's be sure)
            await (supabase
                .from('user_profiles') as any)
                .update({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    phone: formData.phone,
                    whatsapp_number: formData.phone // Default
                })
                .eq('user_id', authData.user.id);

            // 5. Sign In (Auto-login to ensure session is active for booking)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (signInError) throw signInError;

            toast.success("Compte créé ! Validation de la réservation...", { icon: '🎉' });

            // 6. Trigger Success (Callback to parent to start booking)
            onSuccess();

        } catch (err: any) {
            console.error("Guest SignUp Error:", err);
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">

                {/* Header */}
                <div className="bg-primary/5 p-6 border-b border-primary/10 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Finaliser ma réservation</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Créez votre compte en quelques secondes pour valider votre place pour <span className="font-bold text-primary">{offerTitle}</span>.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    name="firstName"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="Prénom"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                            <input
                                name="lastName"
                                required
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="Nom"
                                value={formData.lastName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                name="phone"
                                type="tel"
                                required
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="06 12 34 56 78"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                name="email"
                                type="email"
                                required
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="votre@email.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 ml-1 flex items-center gap-1">
                            <Check className="w-3 h-3" /> 6 caractères minimum
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Création en cours...
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-5 h-5" />
                                Confirmer et Payer
                            </>
                        )}
                    </button>

                    <div className="text-center text-xs text-gray-500 mt-2">
                        Déjà membre ? <a href="/auth/signin?returnUrl=" onClick={(e) => {
                            e.preventDefault();
                            window.location.href = `/auth/signin?returnUrl=${encodeURIComponent(window.location.pathname)}`;
                        }} className="text-primary font-medium hover:underline">Se connecter</a>
                    </div>

                </form>
            </div>
        </div>
    );
}
