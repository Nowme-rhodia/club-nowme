import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Calendar, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

declare global {
    interface Window {
        Calendly: any;
    }
}

export default function BookingSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [offer, setOffer] = useState<any>(null);

    // Get parameters from Stripe Redirect
    const sessionId = searchParams.get('session_id');
    const offerIdParam = searchParams.get('offer_id');
    const type = searchParams.get('type') as 'calendly' | 'event' | 'purchase';
    const amountParam = searchParams.get('amount');

    const variantIdParam = searchParams.get('variant_id');

    useEffect(() => {
        const init = async () => {
            // If we don't have session_id (Stripe) AND don't have event_start_time (Direct Calendly Legacy), we have a problem
            // But now we prioritize Stripe flow.
            if (!sessionId || !offerIdParam) {
                console.error("Missing params:", { sessionId, offerIdParam });
                setStatus('error');
                return;
            }

            try {
                // 1. Fetch Offer to display details AND getting partner_id
                const { data: offerData, error: offerError } = await supabase
                    .from('offers')
                    .select('*, partner_id') // Ensure partner_id is selected
                    .eq('id', offerIdParam)
                    .single() as { data: any, error: any };

                if (offerError) throw offerError;
                setOffer(offerData);

                // 2. Verified Booking Creation
                if (user) {
                    const { data: existing } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('external_id', sessionId)
                        .maybeSingle();

                    if (!existing) {
                        // Fallback creation if webhook hasn't fired yet
                        const safeVariantId = (variantIdParam && variantIdParam !== 'null' && variantIdParam !== 'undefined') ? variantIdParam : null;

                        const bookingData: any = {
                            user_id: user.id,
                            offer_id: offerIdParam,
                            booking_date: new Date().toISOString(),
                            status: 'paid',
                            source: type || 'purchase', // Default to purchase if type is missing or null
                            external_id: sessionId,
                            amount: amountParam ? parseFloat(amountParam) : (offerData.price || 0),
                            currency: 'EUR',
                            partner_id: offerData.partner_id,
                            variant_id: safeVariantId // Added variant_id
                        };

                        const { error: insertError } = await supabase
                            .from('bookings')
                            .upsert(bookingData, { onConflict: 'external_id', ignoreDuplicates: true });

                        if (insertError) {
                            console.error("Booking upsert error", insertError);
                        }
                    }
                }

                setStatus('success');

            } catch (err) {
                console.error("Error processing success:", err);
                setStatus('error');
            }
        };

        if (user) {
            init();
        }
    }, [user, sessionId, offerIdParam, variantIdParam]);

    // Load Calendly Script if needed
    useEffect(() => {
        if (status === 'success' && type === 'calendly' && !window.Calendly) {
            const script = document.createElement('script');
            script.src = "https://assets.calendly.com/assets/external/widget.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, [status, type]);

    // Listener for Calendly events
    useEffect(() => {
        function isCalendlyEvent(e: any) {
            return e.data.event && e.data.event.indexOf('calendly') === 0;
        }

        const handleEvent = (e: any) => {
            if (isCalendlyEvent(e) && e.data.event === 'calendly.event_scheduled') {
                // Show notification and redirect
                const toastId = document.createElement('div');
                toastId.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-slide-in flex items-center gap-3';
                toastId.innerHTML = `
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <div>
                        <h4 class="font-bold">Rendez-vous confirmé !</h4>
                        <p class="text-sm opacity-90">Redirection vers vos réservations...</p>
                    </div>
                `;
                document.body.appendChild(toastId);

                // Redirect after short delay
                setTimeout(() => {
                    navigate('/mes-reservations');
                    document.body.removeChild(toastId);
                }, 3000);
            }
        };

        window.addEventListener('message', handleEvent);
        return () => window.removeEventListener('message', handleEvent);
    }, [navigate]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Finalisation de votre réservation...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Une erreur est survenue</h1>
                <p className="text-gray-600 mb-6">Impossible de vérifier les détails du paiement.</p>
                <div className="text-sm text-gray-400 mb-6">
                    Session: {sessionId ? 'OK' : 'Manquante'} | Offre: {offerIdParam ? 'OK' : 'Manquante'}
                </div>
                <Link to="/tous-les-kiffs" className="px-6 py-3 bg-primary text-white rounded-full">
                    Retour aux offres
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Success Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-scale-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Paiement validé !</h1>
                    <p className="text-gray-600 text-lg">
                        Votre commande pour <span className="font-bold text-gray-900">{offer?.title}</span> est confirmée.
                    </p>
                </div>

                {/* Calendly Embed */}
                {type === 'calendly' && offer?.calendly_url && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                        <div className="p-6 bg-primary text-white text-center">
                            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                                <Calendar className="w-6 h-6" />
                                Choisissez votre créneau
                            </h2>
                            <p className="text-primary-100 mt-2">
                                Sélectionnez la date et l'heure de votre séance ci-dessous pour finaliser l'agenda.
                            </p>
                        </div>
                        <div
                            className="calendly-inline-widget"
                            data-url={(() => {
                                const baseUrl = offer.calendly_url;
                                const queryParts: string[] = [];

                                if (user?.email) {
                                    queryParts.push(`email=${encodeURIComponent(user.email)}`);
                                }

                                if (profile?.first_name && profile?.last_name) {
                                    const fullName = `${profile.first_name} ${profile.last_name}`;
                                    queryParts.push(`name=${encodeURIComponent(fullName)}`);
                                    queryParts.push(`full_name=${encodeURIComponent(fullName)}`);
                                }

                                if (queryParts.length === 0) return baseUrl;
                                return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryParts.join('&')}`;
                            })()}
                            style={{ minWidth: '320px', height: '700px' }}
                        />
                    </div>
                )}

                {/* Event Info */}
                {type === 'event' && (
                    <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
                        <h2 className="text-xl font-bold mb-4">Prochaines étapes</h2>
                        <p className="text-gray-600 mb-6">
                            L'événement est ajouté à vos réservations. Présentez-vous 15 min avant l'heure indiquée.
                        </p>

                        {/* External Link for Online Events */}
                        {offer?.external_link && offer?.is_online && (
                            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-left">
                                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <span className="bg-blue-200 p-1 rounded-full">📹</span>
                                    Lien de connexion pour le jour J
                                </h3>
                                <p className="text-sm text-blue-700 mb-3">
                                    Voici le lien à utiliser pour rejoindre la session le <strong>{new Date(offer.event_start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong> :
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        readOnly
                                        value={offer.external_link}
                                        className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-2 text-gray-600 truncate"
                                    />
                                    <a
                                        href={offer.external_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Tester le lien
                                    </a>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                    (Ce lien est aussi conservé dans "Mes Réservations" et envoyé par email)
                                </p>
                            </div>
                        )}

                        <Link to="/mes-reservations" className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                            Voir mes réservations
                            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                        </Link>
                    </div>
                )}

                {/* Simple Purchase Info */}
                {(type === 'purchase' || !type) && (
                    <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
                        <h2 className="text-xl font-bold mb-4">Commande confirmée</h2>
                        <p className="text-gray-600 mb-6">
                            Votre achat a été validé avec succès. Vous pouvez retrouver les détails dans vos réservations.
                        </p>
                        <Link to="/mes-reservations" className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                            Voir mes réservations
                            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                        </Link>
                    </div>
                )}

                {type === 'calendly' && (
                    <div className="text-center">
                        <Link to="/mes-reservations" className="text-gray-500 hover:text-gray-900 font-medium">
                            Je choisirai mon créneau plus tard
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}
