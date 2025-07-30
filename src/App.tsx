import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './lib/auth';
import { PrivateRoute } from './components/PrivateRoute';

// Lazy loading des pages
import { lazy, Suspense } from 'react';
import { LoadingFallback } from './components/LoadingFallback';

const Home = lazy(() => import('./pages/Home'));
const Categories = lazy(() => import('./pages/Categories'));
const TousLesKiffs = lazy(() => import('./pages/TousLesKiffs'));
const OfferPage = lazy(() => import('./pages/OfferPage'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Community = lazy(() => import('./pages/Community'));
const Checkout = lazy(() => import('./pages/Checkout'));
const SubscriptionSuccess = lazy(() => import('./pages/SubscriptionSuccess'));
const Account = lazy(() => import('./pages/Account'));
const QRCode = lazy(() => import('./pages/account/QRCode'));
const CommunitySpace = lazy(() => import('./pages/CommunitySpace'));
const QuiSommesNous = lazy(() => import('./pages/QuiSommesNous'));
const SubmitOffer = lazy(() => import('./pages/SubmitOffer'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Auth pages
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/auth/UpdatePassword'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const CompleteProfile = lazy(() => import('./pages/auth/CompleteProfile'));

// Club pages
const ClubDashboard = lazy(() => import('./pages/club/ClubDashboard'));
const Events = lazy(() => import('./pages/club/Events'));
const Masterclasses = lazy(() => import('./pages/club/Masterclasses'));
const Wellness = lazy(() => import('./pages/club/Wellness'));

// Admin pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Partners = lazy(() => import('./pages/admin/Partners'));
const Subscribers = lazy(() => import('./pages/admin/Subscribers'));
const Newsletter = lazy(() => import('./pages/admin/Newsletter'));
const CreateUsers = lazy(() => import('./pages/admin/CreateUsers'));
// Partner pages
const PartnerSignIn = lazy(() => import('./pages/partner/SignIn'));
const PartnerDashboard = lazy(() => import('./pages/partner/Dashboard'));
const PartnerProfile = lazy(() => import('./pages/partner/Profile'));
const PartnerBookings = lazy(() => import('./pages/partner/Bookings'));
const PartnerStatistics = lazy(() => import('./pages/partner/Statistics'));
const PartnerSettings = lazy(() => import('./pages/partner/Settings'));

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <div className="min-h-screen bg-white">
            <ScrollToTop />
                  {/* Pages protégées */}
                  <Route path="/account" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <Account />
                    </PrivateRoute>
                  } />
                  <Route path="/account/qr-code" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <QRCode />
                    </PrivateRoute>
                  } />
                  <Route path="/community-space" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <CommunitySpace />
                    </PrivateRoute>
                  } />

                  {/* Club */}
                  <Route path="/club" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <ClubDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/club/events" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <Events />
                    </PrivateRoute>
                  } />
                  <Route path="/club/masterclasses" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <Masterclasses />
                    </PrivateRoute>
                  } />
                  <Route path="/club/wellness" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <Wellness />
                    </PrivateRoute>
                  } />

                  {/* Admin */}
                  <Route path="/admin" element={
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
    const users = [
      { email: 'rhodia@nowme.fr', password: 'azert123', role: 'super_admin' },
      { email: 'nowme.club@gmail.com', password: 'azert123', role: 'subscriber_admin' },
      { email: 'rhodia.kw@gmail.com', password: 'azert123', role: 'partner_admin' }
    ];

                  {/* Partner */}
                  <Route path="/partner/signin" element={<PartnerSignIn />} />
                  <Route path="/partner/dashboard" element={
                    <PrivateRoute allowedRoles={['partner']}>
                      <PartnerDashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/partner/profile" element={
                    <PrivateRoute allowedRoles={['partner']}>
                      <PartnerProfile />
                    </PrivateRoute>
                  } />
                  <Route path="/partner/bookings" element={
                    <PrivateRoute allowedRoles={['partner']}>
                      <PartnerBookings />
                    </PrivateRoute>
                  } />
                  <Route path="/partner/statistics" element={
                    <PrivateRoute allowedRoles={['partner']}>
                      <PartnerStatistics />
                    </PrivateRoute>
                  } />
                  <Route path="/partner/settings" element={
                    <PrivateRoute allowedRoles={['partner']}>
                      <PartnerSettings />
                    </PrivateRoute>
                  } />

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
        </div>

        {error ? (
          <p className="text-red-600 mb-6">{error}</p>
        ) : token ? (
          <>
            <p className="text-gray-600 mb-6">Mot de passe pour tous : <code>azert123</code></p>
            <button
              onClick={handleClick}
              disabled={status === 'loading'}
              className={`w-full px-4 py-2 rounded-full font-semibold text-white ${
                status === 'done'
                  ? 'bg-green-500'
                  : status === 'loading'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {status === 'loading' ? 'Création en cours...' : status === 'done' ? '✅ Comptes créés' : 'Créer les 3 comptes admin'}
            </button>
          </>
        ) : (
          <p className="text-gray-500 italic">Chargement en cours...</p>
        )}
      </div>
    </div>
  );
}