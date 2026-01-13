import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { translateError } from '../../lib/errorTranslations';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    mainCategoryId: '',
    subcategoryIds: [] as string[],
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!formData.mainCategoryId) {
      setError('Veuillez sélectionner une catégorie principale');
      return;
    }

    setLoading(true);

    try {
      // Créer le compte utilisateur
      await signUp(formData.email, formData.password);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Erreur lors de la création du compte');

      // Lier le compte auth au profil partenaire (via Edge Function sécurisée)
      const { error: linkError } = await supabase.functions.invoke('link-auth-to-profile', {
        body: {
          email: formData.email,
          authUserId: userData.user.id,
          role: 'partner',
          businessName: formData.businessName,
          contactName: formData.contactName,
          phone: formData.phone,
          mainCategoryId: formData.mainCategoryId,
          subcategoryIds: formData.subcategoryIds,
        },
      });

      if (linkError) throw linkError;

      navigate('/partner/dashboard');
    } catch (err) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const [categories, setCategories] = useState<{ id: string; name: string; parent_name: string | null }[]>([]);

  React.useEffect(() => {
    supabase
      .from('offer_categories')
      .select('id, name, parent_name')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching categories:', error);
        }
        if (data) {
          console.log('Categories loaded:', data.length);
          setCategories(data);
        }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Devenir partenaire
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Déjà partenaire ?{' '}
          <Link
            to="/partner/signin"
            className="font-medium text-primary hover:text-primary-dark transition-colors duration-200"
          >
            Se connecter
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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

            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                Nom de l'entreprise
              </label>
              <div className="mt-1">
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                Nom du contact
              </label>
              <div className="mt-1">
                <input
                  id="contactName"
                  name="contactName"
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            {/* Catégories */}
            <div>
              <label htmlFor="mainCategoryId" className="block text-sm font-medium text-gray-700">
                Catégorie Principale
              </label>
              <div className="mt-1">
                <select
                  id="mainCategoryId"
                  name="mainCategoryId"
                  required
                  value={formData.mainCategoryId}
                  onChange={(e) => setFormData({ ...formData, mainCategoryId: e.target.value, subcategoryIds: [] })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {mainCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.mainCategoryId && subCategories.length > 0 && (
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Sous-catégories (Plusieurs choix possibles)
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md bg-gray-50">
                  {subCategories.map(sub => (
                    <label key={sub.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`
                  flex w-full justify-center items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm
                  ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                  }
                `}
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