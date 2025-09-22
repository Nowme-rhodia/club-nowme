import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
const Home = React.lazy(() => import('./pages/Home').then(module => ({ default: module.Home || module.default })));
const Categories = React.lazy(() => import('./pages/Categories'));
const TousLesKiffs = React.lazy(() => import('./pages/TousLesKiffs'));
const OfferPage = React.lazy(() => import('./pages/OfferPage'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const Communaute = React.lazy(() => import('./pages/Community'));
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
const PendingOffers = React.lazy(() => import('./pages/admin/PendingOffers'));
const AdminOffers = React.lazy(() => import('./pages/admin/Offers'));
const Subscribers = React.lazy(() => import('./pages/admin/Subscribers'));
const Newsletter = React.lazy(() => import('./pages/admin/Newsletter'));
const CreateUsers = React.lazy(() => import('./pages/admin/CreateUsers'));
const AdminBookings = React.lazy(() => import('./pages/admin/Bookings'));
const Payouts = React.lazy(() => import('./pages/admin/Payouts'));

// Partner pages
const PartnerSignIn = React.lazy(() => import('./pages/partner/SignIn'));
const PartnerLayout = React.lazy(() => import('./pages/partner/PartnerLayout'));
const PartnerDashboard = React.lazy(() => import('./pages/partner/Dashboard'));
const PartnerOffers = React.lazy(() => import('./pages/partner/Offers'));
const PartnerBookings = React.lazy(() => import('./pages/partner/Bookings'));
const PartnerBookingDetail = React.lazy(() => import('./pages/partner/BookingDetail'));
const SettingsGeneral = React.lazy(() => import('./pages/partner/SettingsGeneral'));
const SettingsPayments = React.lazy(() => import('./pages/partner/SettingsPayments'));

// Club pages
const ClubDashboard = React.lazy(() => import('./pages/club/ClubDashboard'));
const Events = React.lazy(() => import('./pages/club/Events'));
const Masterclasses = React.lazy(() => import('./pages/club/Masterclasses'));
const Wellness = React.lazy(() => import('./pages/club/Wellness'));

// Booking publique (Calendly intégré)
const Booking = React.lazy(() => import('./pages/Booking'));

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
                  <Route path="/communaute" element={<Communaute />} />

                  {/* Booking publique */}
                  <Route path="/booking/:id" element={<Booking />} />

                  {/* Auth routes */}
                  <Route path="/auth/signin" element={<SignIn />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/update-password" element={<UpdatePassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Partner routes */}
                  <Route path="/partner/signin" element={<PartnerSignIn />} />
                  <Route
                    path="/partner/*"
                    element={
                      <PrivateRoute allowedRoles={['partner']}>
                        <PartnerLayout />
                      </PrivateRoute>
                    }
                  >
                    <Route path="dashboard" element={<PartnerDashboard />} />
                    <Route path="offers" element={<PartnerOffers />} />
                    <Route path="bookings" element={<PartnerBookings />} />
                    <Route path="bookings/:id" element={<PartnerBookingDetail />} />
                    <Route path="settings" element={<Navigate to="settings/general" replace />} />
                    <Route path="settings/general" element={<SettingsGeneral />} />
                    <Route path="settings/payments" element={<SettingsPayments />} />
                  </Route>

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
                    <Route path="pending-offers" element={<PendingOffers />} />
                    <Route path="offers" element={<AdminOffers />} />
                    <Route path="subscribers" element={<Subscribers />} />
                    <Route path="newsletter" element={<Newsletter />} />
                    <Route path="create-users" element={<CreateUsers />} />
                    <Route path="bookings" element={<AdminBookings />} />
                    <Route path="payouts" element={<Payouts />} />
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
