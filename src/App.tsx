import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PrivateRoute } from './components/PrivateRoute';
import { LoadingFallback } from './components/LoadingFallback';

// Lazy load pages
const Home = React.lazy(() => import('./pages/Home'));
const Categories = React.lazy(() => import('./pages/Categories'));
const TousLesKiffs = React.lazy(() => import('./pages/TousLesKiffs'));
const OfferPage = React.lazy(() => import('./pages/OfferPage'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const SubscriptionSuccess = React.lazy(() => import('./pages/SubscriptionSuccess'));
const Account = React.lazy(() => import('./pages/Account'));
const QRCode = React.lazy(() => import('./pages/account/QRCode'));
const SubmitOffer = React.lazy(() => import('./pages/SubmitOffer'));
const QuiSommesNous = React.lazy(() => import('./pages/QuiSommesNous'));
const CommunitySpace = React.lazy(() => import('./pages/CommunitySpace'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Auth pages
const SignIn = React.lazy(() => import('./pages/auth/SignIn'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const UpdatePassword = React.lazy(() => import('./pages/auth/UpdatePassword'));
const AuthCallback = React.lazy(() => import('./pages/auth/AuthCallback'));

// Admin pages
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const Partners = React.lazy(() => import('./pages/admin/Partners'));
const Subscribers = React.lazy(() => import('./pages/admin/Subscribers'));
const Newsletter = React.lazy(() => import('./pages/admin/Newsletter'));
const CreateUsers = React.lazy(() => import('./pages/admin/CreateUsers'));

// Partner pages
const PartnerSignIn = React.lazy(() => import('./pages/partner/SignIn'));
const PartnerDashboard = React.lazy(() => import('./pages/partner/Dashboard'));

// Club pages
const ClubDashboard = React.lazy(() => import('./pages/club/ClubDashboard'));
const Events = React.lazy(() => import('./pages/club/Events'));
const Masterclasses = React.lazy(() => import('./pages/club/Masterclasses'));
const Wellness = React.lazy(() => import('./pages/club/Wellness'));

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <div className="min-h-screen bg-white">
            <ScrollToTop />
            <Header />

            <main className="flex-1">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/tous-les-kiffs" element={<TousLesKiffs />} />
                  <Route path="/offres/:id" element={<OfferPage />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                  <Route path="/soumettre-offre" element={<SubmitOffer />} />
                  <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
                  <Route path="/community-space" element={<CommunitySpace />} />

                  {/* Auth routes */}
                  <Route path="/auth/signin" element={<SignIn />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/update-password" element={<UpdatePassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Partner routes */}
                  <Route path="/partner/signin" element={<PartnerSignIn />} />
                  <Route path="/partner/dashboard" element={
                    <PrivateRoute allowedRoles={['partner']}>
                      <PartnerDashboard />
                    </PrivateRoute>
                  } />

                  {/* Protected user routes */}
                  <Route path="/account" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <Account />
                    </PrivateRoute>
                  } />
                  <Route path="/account/qr-code" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <QRCode />
                    </PrivateRoute>
                  } />

                  {/* Club routes */}
                  <Route path="/club" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <ClubDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/club/events" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <Events />
                    </PrivateRoute>
                  } />
                  <Route path="/club/masterclasses" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <Masterclasses />
                    </PrivateRoute>
                  } />
                  <Route path="/club/wellness" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <Wellness />
                    </PrivateRoute>
                  } />

                  {/* Admin routes */}
                  <Route path="/admin/*" element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <AdminLayout />
                    </PrivateRoute>
                  }>
                    <Route index element={<Partners />} />
                    <Route path="partners" element={<Partners />} />
                    <Route path="subscribers" element={<Subscribers />} />
                    <Route path="newsletter" element={<Newsletter />} />
                    <Route path="create-users" element={<CreateUsers />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>

            <Footer />
            <Toaster position="top-right" />
          </div>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
