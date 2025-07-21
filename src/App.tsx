import React, { Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PrivateRoute } from './components/PrivateRoute';
import { LoadingFallback } from './components/LoadingFallback';
import { ErrorBoundary } from './components/ErrorBoundary';

// Fonction d'aide pour intercepter les liens de récupération
function AuthRedirectHandler() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Vérifier si l'URL contient un fragment d'authentification
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Extraire les paramètres du fragment
      const params = new URLSearchParams(hash.substring(1));
      const type = params.get('type');
      
      if (type === 'recovery') {
        // Rediriger vers la page de réinitialisation de mot de passe
        // tout en conservant le hash pour que la page puisse l'utiliser
        navigate('/auth/reset-password');
      }
    }
  }, [navigate]);
  
  return null;
}

// Auth pages
const SignIn = React.lazy(() => import('./pages/auth/SignIn'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));
const TestSignup = React.lazy(() => import('./pages/auth/TestSignup'));

// Partner auth pages
const PartnerSignIn = React.lazy(() => import('./pages/partner/SignIn'));
const PartnerForgotPassword = React.lazy(() => import('./pages/partner/ForgotPassword'));
const PartnerResetPassword = React.lazy(() => import('./pages/partner/ResetPassword'));
const PartnerSignUp = React.lazy(() => import('./pages/partner/SignUp'));
const PartnerDashboard = React.lazy(() => import('./pages/partner/Dashboard'));
const PartnerProfile = React.lazy(() => import('./pages/partner/Profile'));
const PartnerStatistics = React.lazy(() => import('./pages/partner/Statistics'));
const PartnerBookings = React.lazy(() => import('./pages/partner/Bookings'));
const PartnerSettings = React.lazy(() => import('./pages/partner/Settings'));

// Other lazy-loaded pages
const Home = React.lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Categories = React.lazy(() => import('./pages/Categories'));
const TousLesKiffs = React.lazy(() => import('./pages/TousLesKiffs'));
const OfferPage = React.lazy(() => import('./pages/OfferPage'));
const Account = React.lazy(() => import('./pages/Account'));
const Community = React.lazy(() => import('./pages/Community'));
const SubmitOffer = React.lazy(() => import('./pages/SubmitOffer'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const PricingComparison = React.lazy(() => import('./pages/PricingComparison'));

// Club pages
const ClubEvents = React.lazy(() => import('./pages/club/Events'));
const ClubMasterclasses = React.lazy(() => import('./pages/club/Masterclasses'));
const ClubWellness = React.lazy(() => import('./pages/club/Wellness'));

// Admin routes
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const Partners = React.lazy(() => import('./pages/admin/Partners'));
const Subscribers = React.lazy(() => import('./pages/admin/Subscribers'));

// 🆕 Qui sommes-nous
const QuiSommesNous = React.lazy(() => import('./pages/QuiSommesNous'));

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Ajoutez ce composant pour intercepter les redirections d'authentification */}
                  <Route path="/" element={<><AuthRedirectHandler /><Home /></>} />
                  
                  {/* Public routes */}
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/tous-les-kiffs" element={<TousLesKiffs />} />
                  <Route path="/offres/:id" element={<OfferPage />} />
                  <Route path="/communaute" element={<Community />} />
                  <Route path="/soumettre-offre" element={<SubmitOffer />} />
                  <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/pricing" element={<PricingComparison />} />

                  {/* Club routes */}
                  <Route
                    path="/club/events"
                    element={
                      <PrivateRoute allowedRoles={['subscriber']}>
                        <ClubEvents />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/club/masterclasses"
                    element={
                      <PrivateRoute allowedRoles={['subscriber']}>
                        <ClubMasterclasses />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/club/wellness"
                    element={
                      <PrivateRoute allowedRoles={['subscriber']}>
                        <ClubWellness />
                      </PrivateRoute>
                    }
                  />

                  {/* Auth routes */}
                  <Route path="/auth/signin" element={<SignIn />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/update-password" element={<ResetPassword />} />
                  <Route path="/auth/test-signup" element={<TestSignup />} />

                  {/* Partner routes */}
                  <Route path="/partner/signin" element={<PartnerSignIn />} />
                  <Route path="/partner/forgot-password" element={<PartnerForgotPassword />} />
                  <Route path="/partner/reset-password" element={<PartnerResetPassword />} />
                  <Route path="/partner/signup" element={<PartnerSignUp />} />
                  <Route
                    path="/partner/dashboard"
                    element={
                      <PrivateRoute allowedRoles={['partner']}>
                        <PartnerDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/partner/profile"
                    element={
                      <PrivateRoute allowedRoles={['partner']}>
                        <PartnerProfile />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/partner/statistics"
                    element={
                      <PrivateRoute allowedRoles={['partner']}>
                        <PartnerStatistics />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/partner/bookings"
                    element={
                      <PrivateRoute allowedRoles={['partner']}>
                        <PartnerBookings />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/partner/settings"
                    element={
                      <PrivateRoute allowedRoles={['partner']}>
                        <PartnerSettings />
                      </PrivateRoute>
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/account/*"
                    element={
                      <PrivateRoute>
                        <Account />
                      </PrivateRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/admin"
                    element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <AdminLayout />
                      </PrivateRoute>
                    }
                  >
                    <Route path="partners" element={<Partners />} />
                    <Route path="subscribers" element={<Subscribers />} />
                  </Route>

                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <Toaster position="top-right" />
          </div>
        </ErrorBoundary>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;