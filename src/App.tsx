import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { useLoadScript } from '@react-google-maps/api';
import { AuthProvider } from './lib/auth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PrivateRoute } from './components/PrivateRoute';
import { LoadingFallback } from './components/LoadingFallback';

// Lazy load pages
const Home = React.lazy(() => import('./pages/Home'));
const Guide = React.lazy(() => import('./pages/Guide').then(module => ({ default: module.Guide })));
const Categories = React.lazy(() => import('./pages/Categories'));
const TousLesKiffs = React.lazy(() => import('./pages/TousLesKiffs'));
const OfferPage = React.lazy(() => import('./pages/OfferPage'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const Communaute = React.lazy(() => import('./pages/Community'));
const Blog = React.lazy(() => import('./pages/Blog'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));
const SubscriptionSuccess = React.lazy(() => import('./pages/SubscriptionSuccess'));
const Account = React.lazy(() => import('./pages/Account'));
const Profile = React.lazy(() => import('./pages/account/Profile'));
const SubmitOffer = React.lazy(() => import('./pages/SubmitOffer'));
const QuiSommesNous = React.lazy(() => import('./pages/QuiSommesNous'));
const CommunitySpace = React.lazy(() => import('./pages/CommunitySpace'));
const BecomeAmbassador = React.lazy(() => import('./pages/BecomeAmbassador'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const MyBookings = React.lazy(() => import('./pages/MyBookings'));
const MentionsLegales = React.lazy(() => import('./pages/legal/MentionsLegales'));
const PrivacyPolicy = React.lazy(() => import('./pages/legal/PrivacyPolicy'));
const CGV = React.lazy(() => import('./pages/legal/CGV'));
const ConditionsPartenaires = React.lazy(() => import('./pages/legal/ConditionsPartenaires'));

// Auth pages
const SignIn = React.lazy(() => import('./pages/auth/SignIn'));
const SignUp = React.lazy(() => import('./pages/auth/SignUp'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const UpdatePassword = React.lazy(() => import('./pages/auth/UpdatePassword'));
const AuthCallback = React.lazy(() => import('./pages/auth/AuthCallback'));

// Admin pages
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AmbassadorApplications = React.lazy(() => import('./pages/admin/AmbassadorApplications'));
const Partners = React.lazy(() => import('./pages/admin/Partners'));
const PendingOffers = React.lazy(() => import('./pages/admin/PendingOffers'));
const AdminOffers = React.lazy(() => import('./pages/admin/Offers'));
const Subscribers = React.lazy(() => import('./pages/admin/Subscribers'));
const Newsletter = React.lazy(() => import('./pages/admin/Newsletter'));
const CreateUsers = React.lazy(() => import('./pages/admin/CreateUsers'));
const AdminBookings = React.lazy(() => import('./pages/admin/Bookings'));
const Payouts = React.lazy(() => import('./pages/admin/Payouts'));
const AdminCommunity = React.lazy(() => import('./pages/admin/Community'));
const AdminBlog = React.lazy(() => import('./pages/admin/Blog'));
const AdminBlogEditor = React.lazy(() => import('./pages/admin/BlogEditor'));

// Partner pages
const PartnerSignIn = React.lazy(() => import('./pages/partner/SignIn'));
const PartnerLayout = React.lazy(() => import('./pages/partner/PartnerLayout'));
const PartnerDashboard = React.lazy(() => import('./pages/partner/Dashboard'));
const PartnerOffers = React.lazy(() => import('./pages/partner/Offers'));
const PartnerBookings = React.lazy(() => import('./pages/partner/Bookings'));
const PartnerBookingDetail = React.lazy(() => import('./pages/partner/BookingDetail'));
const PartnerReviews = React.lazy(() => import('./pages/partner/Reviews'));
const SettingsGeneral = React.lazy(() => import('./pages/partner/SettingsGeneral'));
const SettingsPayments = React.lazy(() => import('./pages/partner/SettingsPayments'));
// Club pages

const Agenda = React.lazy(() => import('./pages/Agenda'));
const Events = React.lazy(() => import('./pages/club/Events'));

// Booking publique (Calendly intégré)
const Booking = React.lazy(() => import('./pages/Booking'));
const BookingSuccess = React.lazy(() => import('./pages/BookingSuccess'));
const CancellationFeedback = React.lazy(() => import('./pages/CancellationFeedback'));

// Wrapper component to load Google Maps Script globally
function GoogleMapsLoader({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
    language: "fr",
    region: "FR"
  });

  if (!isLoaded) return <LoadingFallback />;

  return <>{children}</>;
}

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <GoogleMapsLoader>
            <div className="min-h-screen bg-white">
              <ScrollToTop />
              <Header />

              <main className="flex-1">
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/guide" element={<Guide />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/tous-les-kiffs" element={<TousLesKiffs />} />
                    <Route path="/offres/:id" element={<OfferPage />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                    <Route path="/feedback" element={<CancellationFeedback />} />
                    <Route path="/devenir-partenaire" element={<SubmitOffer />} />
                    <Route path="/devenir-ambassadrice" element={
                      <PrivateRoute allowedRoles={['subscriber']}>
                        <BecomeAmbassador />
                      </PrivateRoute>
                    } />
                    <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
                    <Route path="/community-space" element={
                      <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                        <CommunitySpace />
                      </PrivateRoute>
                    } />
                    <Route path="/communaute" element={<Communaute />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />

                    {/* Booking publique */}
                    <Route path="/booking/:id" element={<Booking />} />
                    <Route path="/booking-success" element={<BookingSuccess />} />

                    {/* Auth routes */}
                    <Route path="/auth/signin" element={<SignIn />} />
                    <Route path="/auth/signup" element={<SignUp />} />
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
                      <Route path="reviews" element={<PartnerReviews />} />
                      <Route path="settings" element={<Navigate to="settings/general" replace />} />
                      <Route path="settings/general" element={<SettingsGeneral />} />
                      <Route path="settings/payments" element={<SettingsPayments />} />
                    </Route>

                    {/* Protected user routes */}
                    <Route path="/account/*" element={
                      <PrivateRoute>
                        <Account />
                      </PrivateRoute>
                    } />
                    <Route path="/mes-reservations" element={
                      <PrivateRoute>
                        <MyBookings />
                      </PrivateRoute>
                    } />
                    {/* Handle legacy/incorrect url */}
                    <Route path="/my-bookings" element={<Navigate to="/mes-reservations" replace />} />
                    <Route path="/account/profile" element={
                      <PrivateRoute allowedRoles={['subscriber']}>
                        <Profile />
                      </PrivateRoute>
                    } />

                    {/* Club routes */}
                    <Route path="/club" element={<Navigate to="/community-space" replace />} /> {/* Redirect legacy club to QG */}

                    <Route path="/agenda" element={
                      <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                        <Agenda />
                      </PrivateRoute>
                    } />

                    <Route path="/club/events" element={
                      <PrivateRoute allowedRoles={['subscriber']}>
                        <Events />
                      </PrivateRoute>
                    } />

                    {/* Admin routes */}
                    <Route path="/admin/*" element={
                      <PrivateRoute allowedRoles={['admin']}>
                        <AdminLayout />
                      </PrivateRoute>
                    }>
                      <Route index element={<AdminDashboard />} />
                      <Route path="partners" element={<Partners />} />
                      <Route path="ambassadors" element={<AmbassadorApplications />} />

                      <Route path="offers" element={<AdminOffers />} />
                      <Route path="subscribers" element={<Subscribers />} />
                      <Route path="newsletter" element={<Newsletter />} />
                      <Route path="create-users" element={<CreateUsers />} />
                      <Route path="bookings" element={<AdminBookings />} />
                      <Route path="payouts" element={<Payouts />} />
                      <Route path="community" element={<AdminCommunity />} />
                      <Route path="blog" element={<AdminBlog />} />
                      <Route path="blog/new" element={<AdminBlogEditor />} />
                      <Route path="blog/edit/:id" element={<AdminBlogEditor />} />
                    </Route>

                    {/* Legal routes */}
                    <Route path="/mentions-legales" element={<MentionsLegales />} />
                    <Route path="/politique-de-confidentialite" element={<PrivacyPolicy />} />
                    <Route path="/cgv" element={<CGV />} />
                    <Route path="/conditions-partenaires" element={<ConditionsPartenaires />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>

              <Footer />
              <Toaster position="top-right" />
            </div>
          </GoogleMapsLoader>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
