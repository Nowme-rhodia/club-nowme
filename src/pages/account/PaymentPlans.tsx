import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Loader2, AlertCircle, CheckCircle, CreditCard, Calendar, ArrowRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentPlan {
    id: string;
    booking_id: string;
    plan_type: '2x' | '3x' | '4x';
    total_amount: number;
    status: 'active' | 'completed' | 'cancelled' | 'past_due';
    stripe_schedule_id: string;
    created_at: string;
    booking?: {
        offer?: {
            title: string;
            image_url: string;
        }
    };
    installments?: Installment[];
}

interface Installment {
    id: string;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'failed' | 'cancelled';
    paid_at: string | null;
    stripe_invoice_id: string | null;
    attempt_count: number;
}

export default function PaymentPlans() {
    const { profile } = useAuth();
    const [plans, setPlans] = useState<PaymentPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [retryLoading, setRetryLoading] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            fetchPlans();
        }
    }, [profile]);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_plans')
                .select(`
                    *,
                    booking:bookings (
                        offer:offers (
                            title,
                            image_url
                        )
                    ),
                    installments:payment_installments (
                        *
                    )
                `)
                .eq('user_id', profile?.user_id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Sort installments locally
            const sortedData = data?.map(plan => ({
                ...plan,
                installments: plan.installments?.sort((a: any, b: any) =>
                    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                )
            })) || [];

            setPlans(sortedData as PaymentPlan[]);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRetryPayment = async (planId: string, invoiceId: string) => {
        if (!invoiceId) return;
        setRetryLoading(planId);

        try {
            // We need to get the hosted_invoice_url. 
            // Since we don't store it in the DB (only stripe_invoice_id), we might need an Edge Function to fetch it?
            // OR: We store it in 'invoices' table?
            // Let's check 'invoices' table first.

            const { data: invoiceData } = await supabase
                .from('invoices')
                .select('pdf_url') // pdf_url usually, but we want hosted_url for payment.
                .eq('stripe_invoice_id', invoiceId)
                .single();

            // If we don't have the link easily, we can call a function "get-invoice-link"
            // For now, let's assume we trigger the 'send-payment-failed-email' which sends the link, 
            // or we make a quick function to fetch it.
            // Actually, we can just redirect to the portal if enabled? Or use an Edge Function.

            // Simplest for MVP: Call a new function `get-payment-link`
            const { data: linkData, error } = await supabase.functions.invoke('get-payment-link', {
                body: { invoiceId }
            });

            if (error) throw error;
            if (linkData?.url) {
                window.location.href = linkData.url;
            } else {
                alert("Lien de paiement introuvable. Veuillez vérifier vos emails ou contacter le support.");
            }

        } catch (err) {
            console.error("Retry failed:", err);
            alert("Erreur lors de la récupération du lien. Veuillez réessayer.");
        } finally {
            setRetryLoading(null);
        }
    };

    const handleOpenPortal = async () => {
        try {
            if (!profile?.user_id) return;

            setLoading(true); // Or separate state
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('stripe_customer_id')
                .eq('user_id', profile.user_id)
                .single();

            if (profileError || !profileData || !profileData.stripe_customer_id) {
                console.warn("Stripe Customer ID missing", profileError);
                alert("Impossible de trouver votre identifiant client. Contactez le support.");
                return;
            }

            const { data: portalData, error } = await supabase.functions.invoke('create-portal-session', {
                body: {
                    customerId: profileData.stripe_customer_id,
                    returnUrl: window.location.href
                }
            });

            if (error) throw error;
            if (portalData?.url) {
                window.location.href = portalData.url;
            }
        } catch (err) {
            console.error("Portal error:", err);
            alert("Erreur lors de l'accès au portail de paiement.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Mes Echéanciers</h1>
                <button
                    onClick={handleOpenPortal}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <CreditCard className="w-4 h-4" />
                    Mettre à jour ma carte
                </button>
            </div>

            {plans.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun échéancier actif</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Vous n'avez pas de paiement en plusieurs fois en cours.
                        Profitez de nos offres pour étaler vos paiements sur 2, 3 ou 4 fois !
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {plans.map((plan) => (
                        <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                        {plan.booking?.offer?.image_url && (
                                            <img
                                                src={plan.booking.offer.image_url}
                                                alt={plan.booking.offer.title}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{plan.booking?.offer?.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm text-gray-500">
                                                Plan {plan.plan_type.toUpperCase()} • Total: {plan.total_amount}€
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                                plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    plan.status === 'past_due' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {plan.status === 'active' ? 'En cours' :
                                                    plan.status === 'completed' ? 'Terminé' :
                                                        plan.status === 'past_due' ? 'Impayé' : 'Annulé'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {plan.status === 'active' && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Prochain prélèvement</p>
                                        <p className="font-bold text-gray-900">
                                            {plan.installments?.find(i => i.status === 'pending')
                                                ? format(new Date(plan.installments.find(i => i.status === 'pending')!.due_date), "d MMM yyyy", { locale: fr })
                                                : "-"
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Installments Table */}
                            <div className="p-6">
                                <div className="space-y-4">
                                    {plan.installments?.map((inst, index) => (
                                        <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${inst.status === 'paid' ? 'bg-green-100 text-green-600' :
                                                    inst.status === 'failed' ? 'bg-red-100 text-red-600' :
                                                        'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {inst.status === 'paid' ? <CheckCircle className="w-5 h-5" /> :
                                                        inst.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                                                            <span className="text-sm font-bold">{index + 1}</span>}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Echéance {index + 1}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {format(new Date(inst.due_date), "d MMMM yyyy", { locale: fr })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-gray-900">{inst.amount}€</span>
                                                {inst.status === 'failed' && inst.stripe_invoice_id && (
                                                    <button
                                                        onClick={() => handleRetryPayment(plan.id, inst.stripe_invoice_id!)}
                                                        disabled={retryLoading === plan.id}
                                                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                                    >
                                                        {retryLoading === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                                                        Régulariser
                                                    </button>
                                                )}
                                                {inst.status === 'paid' && inst.paid_at && (
                                                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                                        Payé le {format(new Date(inst.paid_at), "dd/MM")}
                                                    </span>
                                                )}
                                                {inst.status === 'pending' && (
                                                    <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded">
                                                        En attente
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
