import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/auth';
import { GoogleMapsLoader } from './components/GoogleMapsLoader';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PrivateRoute } from './components/PrivateRoute';
import { LoadingFallback } from './components/LoadingFallback';

// Lazy load pages
const Home = React.lazy(() => import('./pages/Home'));
const Guide = React.lazy(() => import('./pages/Guide').then(module => ({ default: module.Guide })));
const PublicGuide = React.lazy(() => import('./pages/PublicGuide').then(module => ({ default: module.PublicGuide })));
const Categories = React.lazy(() => import('./pages/Categories'));
const TousLesKiffs = React.lazy(() => import('./pages/TousLesKiffs'));
const OfferPage = React.lazy(() => import('./pages/OfferPage'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const Communaute = React.lazy(() => import('./pages/Community'));
const Blog = React.lazy(() => import('./pages/Blog'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));
const SubscriptionSuccess = React.lazy(() => import('./pages/SubscriptionSuccess'));
const DashboardOverview = React.lazy(() => import('./pages/account/DashboardOverview'));
const Profile = React.lazy(() => import('./pages/account/Profile'));
const SubmitOffer = React.lazy(() => import('./pages/SubmitOffer'));
const WalletPay = React.lazy(() => import('./pages/account/WalletPay'));
const Bookings = React.lazy(() => import('./pages/account/Bookings'));
const PaymentPlans = React.lazy(() => import('./pages/account/PaymentPlans'));
const SubscriberLayout = React.lazy(() => import('./layouts/SubscriberLayout'));
const QuiSommesNous = React.lazy(() => import('./pages/QuiSommesNous'));
const CommunitySpace = React.lazy(() => import('./pages/CommunitySpace'));
const BecomeAmbassador = React.lazy(() => import('./pages/BecomeAmbassador'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
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
const RefundRequests = React.lazy(() => import('./pages/admin/RefundRequests'));
const Payouts = React.lazy(() => import('./pages/admin/Payouts'));
const AdminCommunity = React.lazy(() => import('./pages/admin/Community'));
const AdminBlog = React.lazy(() => import('./pages/admin/Blog'));
const AdminBlogEditor = React.lazy(() => import('./pages/admin/BlogEditor'));

// Partner pages

const PartnerLayout = React.lazy(() => import('./pages/partner/PartnerLayout'));
const PartnerDashboard = React.lazy(() => import('./pages/partner/Dashboard'));
const PartnerOffers = React.lazy(() => import('./pages/partner/Offers'));
const PartnerBookings = React.lazy(() => import('./pages/partner/Bookings'));
const PartnerBookingDetail = React.lazy(() => import('./pages/partner/BookingDetail'));
const PartnerReviews = React.lazy(() => import('./pages/partner/Reviews'));
const PartnerGuide = React.lazy(() => import('./pages/partner/PartnerGuide'));
const PartnerPublicProfile = React.lazy(() => import('./pages/PartnerPublicProfile'));
const SettingsGeneral = React.lazy(() => import('./pages/partner/SettingsGeneral'));
const SettingsPayments = React.lazy(() => import('./pages/partner/SettingsPayments'));
// Club pages

const Agenda = React.lazy(() => import('./pages/Agenda'));
const Events = React.lazy(() => import('./pages/club/Events'));

// Booking publique (Calendly intégré)
const Booking = React.lazy(() => import('./pages/Booking'));
const BookingSuccess = React.lazy(() => import('./pages/BookingSuccess'));
const CancellationFeedback = React.lazy(() => import('./pages/CancellationFeedback'));



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
                  <Route path="/guide" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <Guide />
                    </PrivateRoute>
                  } />
                  <Route path="/guidenonabonnee" element={<PublicGuide />} />
                  <Route path="/categories" element={
                    <GoogleMapsLoader>
                      <Categories />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/tous-les-kiffs" element={
                    <GoogleMapsLoader>
                      <TousLesKiffs />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/offres/:id" element={
                    <GoogleMapsLoader>
                      <OfferPage />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                  <Route path="/feedback" element={<CancellationFeedback />} />
                  <Route path="/devenir-partenaire" element={
                    <GoogleMapsLoader>
                      <SubmitOffer />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/devenir-ambassadrice" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <BecomeAmbassador />
                    </PrivateRoute>
                  } />
                  <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
                  <Route path="/community-space" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <GoogleMapsLoader>
                        <CommunitySpace />
                      </GoogleMapsLoader>
                    </PrivateRoute>
                  } />
                  <Route path="/communaute" element={<Communaute />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />

                  {/* Booking publique */}
                  <Route path="/booking/:id" element={
                    <GoogleMapsLoader>
                      <Booking />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/booking-success" element={<BookingSuccess />} />

                  {/* Auth routes */}
                  <Route path="/auth/signin" element={<SignIn />} />
                  <Route path="/auth/signup" element={
                    <GoogleMapsLoader>
                      <SignUp />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/update-password" element={<UpdatePassword />} />
                  <Route path="/update-password" element={<Navigate to="/auth/update-password" replace />} /> {/* Fix for old links */}
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Partner routes */}
                  <Route path="/partenaire/:id" element={
                    <GoogleMapsLoader>
                      <PartnerPublicProfile />
                    </GoogleMapsLoader>
                  } />

                  <Route
                    path="/partner/*"
                    element={
                      <PrivateRoute allowedRoles={['partner']}>
                        <GoogleMapsLoader>
                          <PartnerLayout />
                        </GoogleMapsLoader>
                      </PrivateRoute>
                    }
                  >
                    <Route path="dashboard" element={<PartnerDashboard />} />
                    <Route path="guide-partenaire" element={<PartnerGuide />} />
                    <Route path="offers" element={<PartnerOffers />} />
                    <Route path="bookings" element={<PartnerBookings />} />
                    <Route path="bookings/:id" element={<PartnerBookingDetail />} />
                    <Route path="reviews" element={<PartnerReviews />} />
                    <Route path="settings" element={<Navigate to="settings/general" replace />} />
                    <Route path="settings/general" element={<SettingsGeneral />} />
                    <Route path="settings/payments" element={<SettingsPayments />} />
                  </Route>

                  {/* Protected user routes */}
                  <Route path="/account" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <SubscriberLayout />
                    </PrivateRoute>
                  }>
                    <Route index element={<DashboardOverview />} />
                    <Route path="bookings" element={<Bookings />} />
                    <Route path="payment-plans" element={<PaymentPlans />} />
                    <Route path="wallet" element={<WalletPay />} />
                    <Route path="profile" element={
                      <GoogleMapsLoader>
                        <Profile />
                      </GoogleMapsLoader>
                    } />
                  </Route>

                  {/* Redirect legacy routes */}
                  <Route path="/my-bookings" element={<Navigate to="/account/bookings" replace />} />
                  <Route path="/mes-reservations" element={<Navigate to="/account/bookings" replace />} />

                  {/* Legacy Profile route handling if any direct links exist */}
                  <Route path="/account/profile" element={<Navigate to="/account/profile" replace />} /> {/* Redundant but safe */}

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
                    <Route path="refunds" element={<RefundRequests />} />
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
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
