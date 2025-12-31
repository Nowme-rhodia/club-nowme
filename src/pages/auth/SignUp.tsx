import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle, Sparkles, Eye, EyeOff, Check } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';
import { translateError } from '../../lib/errorTranslations';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isSubscriber } = useAuth();

  // Générer des données aléatoires pour DEV/LOCAL
  const generateRandomData = () => {
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
    if (!isDev) return { email: '', password: '', firstName: '', lastName: '' };

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return {
      email: `test${timestamp}${random}@example.com`,
      password: 'DKsijdjhSA*27dusjaTesdsdakio297',
      firstName: `Test${random}`,
      lastName: `User${timestamp}`,
    };
  };

  const [formData, setFormData] = useState(generateRandomData());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const plan = searchParams.get('plan') || 'monthly';

  // Rediriger les utilisateurs déjà connectés
  // - Si abonné → vers account
  // - Si connecté mais pas abonné → vers checkout
  // SAUF s'ils sont en train de s'inscrire
  useEffect(() => {
    if (user && !isSigningUp && !loading) {
      if (isSubscriber) {
        navigate('/account');
      } else {
        navigate(`/checkout?plan=${plan}`);
      }
    }
  }, [user, isSubscriber, isSigningUp, loading, navigate, plan]);

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
    setIsSigningUp(true);

    try {
      // Validation
      if (formData.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      console.log('🚀 Étape 1: Création utilisateur auth...');

      // Créer le compte dans auth.users avec email confirmé automatiquement
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/checkout?plan=${plan}`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      console.log('✅ Compte auth créé:', authData.user.id);
      console.log('📧 Session:', authData.session ? 'Active' : 'Pas de session');

      // Étape 2: Créer le profil dans user_profiles via link-auth-to-profile
      console.log('🚀 Étape 2: Création profil utilisateur...');

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
          role: 'subscriber',
          plan: plan, // Envoyer le plan sélectionné (monthly/yearly)
          termsAccepted: true
        })
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(`Erreur création profil: ${errorData.error || 'Erreur inconnue'}`);
      }

      const profileData = await profileResponse.json();
      console.log('✅ Profil créé:', profileData);

      // Étape 3: Mettre à jour le profil avec prénom/nom
      console.log('🚀 Étape 3: Mise à jour prénom/nom...');

      const { error: updateError } = await (supabase
        .from('user_profiles') as any)
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
        })
        .eq('user_id', authData.user.id);

      if (updateError) {
        console.warn('⚠️ Erreur mise à jour prénom/nom:', updateError);
        // Continue quand même
      } else {
        console.log('✅ Prénom/nom mis à jour');
      }

      // Étape 4: Connecter l'utilisateur explicitement
      console.log('🚀 Étape 4: Connexion automatique...');

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.warn('⚠️ Erreur connexion auto:', signInError);
        // Continue quand même, l'utilisateur pourra se connecter manuellement
      } else {
        console.log('✅ Utilisateur connecté:', signInData.session ? 'Session active' : 'Pas de session');
      }

      toast.success('Compte créé avec succès ! Redirection vers le paiement...');

      // Rediriger vers checkout sans l'email dans l'URL (on utilise l'utilisateur connecté)
      navigate(`/checkout?plan=${plan}`);

    } catch (err: any) {
      console.error('❌ Erreur inscription:', err);
      setError(translateError(err));
      setIsSigningUp(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO title="Créer un compte" description="Créez votre compte Nowme et accédez à des expériences exclusives" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img src="https://i.imgur.com/or3q8gE.png" alt="Logo" className="mx-auto h-16 w-auto" />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Créer votre compte
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Déjà membre ?{' '}
          <Link to="/auth/signin" className="font-medium text-primary hover:text-primary-dark transition-colors">
            Se connecter
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {/* Plan sélectionné */}
          <div className="mb-6 bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 text-primary mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Plan sélectionné : <span className="text-primary">{plan === 'yearly' ? 'Annuel' : 'Mensuel'}</span>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {plan === 'yearly' ? '399€/an - Économisez 80€' : '12,99€ le 1er mois, puis 39,99€/mois'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Prénom
                </label>
                <div className="mt-1 relative">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <div className="mt-1 relative">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 pr-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 mb-2">Votre mot de passe doit contenir :</p>
                <div className={`flex items-center text-xs ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.password.length >= 8 ? <Check className="w-3 h-3 mr-1.5" /> : <div className="w-3 h-3 mr-1.5 rounded-full border border-gray-300" />}
                  8 caractères minimum
                </div>
                <div className={`flex items-center text-xs ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                  {/[A-Z]/.test(formData.password) ? <Check className="w-3 h-3 mr-1.5" /> : <div className="w-3 h-3 mr-1.5 rounded-full border border-gray-300" />}
                  1 majuscule
                </div>
                <div className={`flex items-center text-xs ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                  {/[0-9]/.test(formData.password) ? <Check className="w-3 h-3 mr-1.5" /> : <div className="w-3 h-3 mr-1.5 rounded-full border border-gray-300" />}
                  1 chiffre
                </div>
              </div>
            </div>

            {/* Terms Acceptance */}
            <div className="flex items-start">
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
                  J'accepte les <Link to="/cgv" target="_blank" className="text-primary hover:underline">Conditions Générales de Vente</Link> et la <Link to="/politique-de-confidentialite" target="_blank" className="text-primary hover:underline">Politique de Confidentialité</Link>
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex w-full justify-center items-center rounded-full border border-transparent px-4 py-3 text-base font-medium text-white shadow-sm
                  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'}`}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </div>
          </form>


        </div>
      </div>
    </div>
  );
}
