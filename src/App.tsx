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
const MySquads = React.lazy(() => import('./pages/account/MySquads'));
const Rewards = React.lazy(() => import('./pages/account/Rewards'));
const PaymentPlans = React.lazy(() => import('./pages/account/PaymentPlans'));
const Settings = React.lazy(() => import('./pages/account/Settings'));
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
const ContractGenerator = React.lazy(() => import('./pages/admin/ContractGenerator'));

// Partner pages

const PartnerLayout = React.lazy(() => import('./pages/partner/PartnerLayout'));
const PartnerDashboard = React.lazy(() => import('./pages/partner/Dashboard'));
const PartnerOffers = React.lazy(() => import('./pages/partner/Offers'));
const PartnerBookings = React.lazy(() => import('./pages/partner/Bookings'));
const PartnerBookingDetail = React.lazy(() => import('./pages/partner/BookingDetail'));
const PartnerReviews = React.lazy(() => import('./pages/partner/Reviews'));
const PartnerGuide = React.lazy(() => import('./pages/partner/PartnerGuide'));
const PartnerContractSign = React.lazy(() => import('./pages/partner/ContractSign'));
const InstagramPartnerSlides = React.lazy(() => import('./pages/InstagramPartnerSlides'));
const PartnerContractView = React.lazy(() => import('./pages/partner/ContractView'));
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
const InstagramSlides = React.lazy(() => import('./pages/InstagramSlides'));
const InstagramEventSlides = React.lazy(() => import('./pages/InstagramEventSlides'));



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
                  <Route path="/guide-abonnee" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <Guide />
                    </PrivateRoute>
                  } />
                  <Route path="/guide-public" element={<PublicGuide />} />
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
                  <Route path="/offres/:slug" element={
                    <GoogleMapsLoader>
                      <OfferPage />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/abonnement" element={<Subscription />} />
                  <Route path="/paiement" element={<Checkout />} />
                  <Route path="/abonnement-confirme" element={<SubscriptionSuccess />} />
                  <Route path="/avis-annulation" element={<CancellationFeedback />} />
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
                  <Route path="/instagram-partners" element={<InstagramPartnerSlides />} />
                  <Route path="/le-club" element={
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
                  <Route path="/reservation/:id" element={
                    <GoogleMapsLoader>
                      <Booking />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/reservation-confirmee" element={<BookingSuccess />} />

                  {/* Auth routes */}
                  <Route path="/connexion" element={<SignIn />} />
                  <Route path="/inscription" element={
                    <GoogleMapsLoader>
                      <SignUp />
                    </GoogleMapsLoader>
                  } />
                  <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
                  <Route path="/nouveau-mot-de-passe" element={<UpdatePassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Partner routes */}
                  <Route path="/partenaire/:slug" element={
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
                    <Route path="sign-contract" element={<PartnerContractSign />} />
                    <Route path="contract" element={<PartnerContractView />} />
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

                  <Route
                    path="/mon-compte"
                    element={
                      <PrivateRoute allowedRoles={['subscriber', 'admin', 'guest']}>
                        <SubscriberLayout />
                      </PrivateRoute>
                    }
                  >
                    <Route index element={<DashboardOverview />} />
                    <Route path="reservations" element={<Bookings />} />
                    <Route path="squads" element={<MySquads />} />
                    <Route path="echeanciers" element={<PaymentPlans />} />
                    <Route path="ardoise" element={<WalletPay />} />
                    <Route path="recompenses" element={<Rewards />} />
                    <Route path="profil" element={
                      <GoogleMapsLoader>
                        <Profile />
                      </GoogleMapsLoader>
                    } />
                    <Route path="parametres" element={<Settings />} />
                  </Route>

                  {/* Redirect legacy routes */}
                  <Route path="/guide" element={<Navigate to="/guide-abonnee" replace />} />
                  <Route path="/guidenonabonnee" element={<Navigate to="/guide-public" replace />} />
                  <Route path="/subscription" element={<Navigate to="/abonnement" replace />} />
                  <Route path="/checkout" element={<Navigate to="/paiement" replace />} />
                  <Route path="/subscription-success" element={<Navigate to="/abonnement-confirme" replace />} />
                  <Route path="/feedback" element={<Navigate to="/avis-annulation" replace />} />
                  <Route path="/community-space" element={<Navigate to="/le-club" replace />} />
                  <Route path="/club" element={<Navigate to="/le-club" replace />} />
                  <Route path="/booking/:id" element={<Navigate to="/reservation/:id" replace />} />
                  <Route path="/booking-success" element={<Navigate to="/reservation-confirmee" replace />} />

                  {/* Auth Redirects */}
                  <Route path="/auth/signin" element={<Navigate to="/connexion" replace />} />
                  <Route path="/auth/signup" element={<Navigate to="/inscription" replace />} />
                  <Route path="/auth/forgot-password" element={<Navigate to="/mot-de-passe-oublie" replace />} />
                  <Route path="/auth/update-password" element={<Navigate to="/nouveau-mot-de-passe" replace />} />
                  <Route path="/update-password" element={<Navigate to="/nouveau-mot-de-passe" replace />} />

                  {/* Account Redirects */}
                  <Route path="/account" element={<Navigate to="/mon-compte" replace />} />
                  <Route path="/account/bookings" element={<Navigate to="/mon-compte/reservations" replace />} />
                  <Route path="/account/squads" element={<Navigate to="/mon-compte/squads" replace />} />
                  <Route path="/account/payment-plans" element={<Navigate to="/mon-compte/echeanciers" replace />} />
                  <Route path="/account/wallet" element={<Navigate to="/mon-compte/ardoise" replace />} />
                  <Route path="/account/profile" element={<Navigate to="/mon-compte/profil" replace />} />
                  <Route path="/my-bookings" element={<Navigate to="/mon-compte/reservations" replace />} />
                  <Route path="/mes-reservations" element={<Navigate to="/mon-compte/reservations" replace />} />

                  {/* Club routes */}
                  <Route path="/agenda" element={
                    <PrivateRoute allowedRoles={['subscriber', 'admin']}>
                      <Agenda />
                    </PrivateRoute>
                  } />

                  <Route path="/le-club/evenements" element={
                    <PrivateRoute allowedRoles={['subscriber']}>
                      <Events />
                    </PrivateRoute>
                  } />
                  <Route path="/club/events" element={<Navigate to="/le-club/evenements" replace />} />

                  {/* Admin routes */}
                  <Route path="/admin/*" element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <AdminLayout />
                    </PrivateRoute>
                  }
                  >
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

                  {/* Standalone Admin Pages (No Layout) */}
                  <Route path="/admin/contract/:partnerId" element={
                    <PrivateRoute allowedRoles={['admin']}>
                      <ContractGenerator />
                    </PrivateRoute>
                  } />

                  {/* Legal routes */}
                  <Route path="/mentions-legales" element={<MentionsLegales />} />
                  <Route path="/politique-de-confidentialite" element={<PrivacyPolicy />} />
                  <Route path="/cgv" element={<CGV />} />
                  <Route path="/conditions-partenaires" element={<ConditionsPartenaires />} />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />

                  {/* Dev routes */}
                  <Route path="/instagram-preview" element={<InstagramSlides />} />
                  <Route path="/instagram-events" element={<InstagramEventSlides />} />
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
