import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, CheckCircle2, Store, CreditCard, ChevronRight } from 'lucide-react';
import NumericalKeypad from '../../components/partner/NumericalKeypad';
import toast from 'react-hot-toast';

type Step = 'select-partner' | 'amount' | 'success';

type UserWallet = {
    id: string;
    partner_id: string;
    balance: number;
    expires_at?: string;
    partner: {
        business_name: string;
        address: string;
    };
};

export default function WalletPay() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<Step>('select-partner');

    const [wallets, setWallets] = useState<UserWallet[]>([]);
    const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
    const [amount, setAmount] = useState<string>('');

    // Transaction Result
    const [transactionResult, setTransactionResult] = useState<{
        finalAmount: number;
        discount: number;
        newBalance: number;
        timestamp: string;
    } | null>(null);

    useEffect(() => {
        if (!user) return;

        // Load user's wallets
        async function loadWallets() {
            try {
                const { data, error } = await supabase
                    .from('wallets')
                    .select(`
            id,
            partner_id,
            balance,
            expires_at,
            partner:partners(business_name, address)
          `)
                    .gt('balance', 0) // Only show wallets with money
                    .eq('user_id', user.id);

                if (error) throw error;
                // @ts-ignore
                setWallets(data || []);
            } catch (err) {
                console.error('Error loading wallets:', err);
            } finally {
                setLoading(false);
            }
        }
        loadWallets();
    }, [user]);

    const handleRefundRequest = async (walletId: string) => {
        if (!user) return; // Add null check

        if (!confirm("Voulez-vous vraiment demander le remboursement du solde restant ?\n\nDes frais de traitement (Stripe) seront déduits du montant remboursé.\nVotre ardoise sera remise à zéro après validation.")) return;

        try {
            // @ts-ignore
            const { error } = await supabase
                .from('refund_requests')
                .insert({
                    wallet_id: walletId,
                    user_id: user.id,
                    amount_requested: wallets.find(w => w.id === walletId)?.balance || 0
                });

            if (error) throw error;
            toast.success("Demande de remboursement envoyée !");
        } catch (err) {
            console.error("Refund request failed", err);
            toast.error("Erreur lors de la demande");
        }
    };

    const handleAmountPress = (key: string) => {
        if (key === '.' && amount.includes('.')) return;
        if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
        setAmount(prev => prev + key);
    };

    const processPayment = async () => {
        if (!selectedWallet || !amount) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('handle-wallet-debit', {
                body: {
                    partner_id: selectedWallet.partner_id,
                    amount: parseFloat(amount)
                }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Paiement refusé');

            setTransactionResult({
                finalAmount: data.final_amount,
                discount: data.discount_applied,
                newBalance: data.new_balance,
                timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            });
            setStep('success');
            toast.success('Paiement validé !');

        } catch (err: any) {
            console.error('Payment error:', err);
            toast.error(err.message || 'Erreur de paiement');
        } finally {
            setLoading(false);
        }
    };

    // 1. SELECT PARTNER SCREEN
    if (step === 'select-partner') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                    <button onClick={() => navigate('/account')} className="p-1">
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-indigo-600" />
                        Mes Sommes
                    </h1>
                </div>

                <div className="p-4 flex-1">
                    <p className="text-gray-500 mb-4 text-sm font-medium uppercase tracking-wide">Où souhaitez-vous payer ?</p>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />)}
                        </div>
                    ) : wallets.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>Aucun crédit disponible.</p>
                            <button onClick={() => navigate('/tous-les-kiffs')} className="mt-4 text-indigo-600 font-semibold">
                                Découvrir les offres
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {wallets.map(wallet => (
                                <div
                                    key={wallet.id}
                                    onClick={() => {
                                        setSelectedWallet(wallet);
                                        setStep('amount');
                                    }}
                                    className="w-full bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                            <Store className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-gray-900">{wallet.partner.business_name}</h3>
                                            <p className="text-gray-500 text-sm">{wallet.partner.address}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-lg text-indigo-600">{wallet.balance.toFixed(2)} €</span>
                                        <span className="text-xs text-gray-400">Disponible</span>
                                        {wallet.expires_at && (
                                            <span className="block text-[10px] text-red-400 mt-1">
                                                Exp: {new Date(wallet.expires_at).toLocaleDateString()}
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRefundRequest(wallet.id);
                                            }}
                                            className="text-[10px] text-gray-400 underline hover:text-red-500 mt-1"
                                        >
                                            Rembourser
                                        </button>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 ml-2" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. AMOUNT INPUT SCREEN
    if (step === 'amount' && selectedWallet) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
                    <button onClick={() => { setStep('select-partner'); setAmount(''); }} className="p-2 -ml-2 text-gray-600">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase font-bold">Paiement chez</div>
                        <div className="font-bold text-gray-900">{selectedWallet.partner.business_name}</div>
                    </div>
                    <div className="w-8" />
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                        <div className="text-gray-500 text-sm mb-2 font-medium uppercase tracking-wide">Montant de l'addition</div>
                        <div className="text-6xl font-bold text-gray-900 tracking-tight">
                            {amount || '0'}
                            <span className="text-gray-400 ml-2">€</span>
                        </div>
                        {parseFloat(amount || '0') > selectedWallet.balance && (
                            <div className="text-red-500 font-medium mt-4 bg-red-50 px-3 py-1 rounded-full text-sm">
                                Solde insuffisant ({selectedWallet.balance.toFixed(2)} €)
                            </div>
                        )}
                    </div>

                    <div className="pb-8 px-4">
                        <NumericalKeypad
                            onKeyPress={handleAmountPress}
                            onDelete={() => setAmount(prev => prev.slice(0, -1))}
                            onClear={() => setAmount('')}
                            onConfirm={processPayment}
                            confirmDisabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > selectedWallet.balance || loading}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // 3. SUCCESS SCREEN - VISUAL PROOF
    if (step === 'success' && transactionResult && selectedWallet) {
        return (
            <div className="min-h-screen bg-emerald-500 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
                {/* Animated Background Circles */}
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div className="relative z-10 text-center animate-in zoom-in duration-300">
                    <div className="w-32 h-32 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl">
                        <CheckCircle2 className="w-16 h-16" />
                    </div>

                    <h1 className="text-4xl font-extrabold mb-2">PAIEMENT VALIDÉ</h1>
                    <p className="text-xl font-medium opacity-90 mb-8">{transactionResult.timestamp}</p>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl max-w-sm w-full mx-auto space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="opacity-80">Montant payé</span>
                            <span className="font-bold text-2xl">{parseFloat(amount).toFixed(2)} €</span>
                        </div>

                        {transactionResult.discount > 0 && (
                            <div className="flex justify-between items-center text-emerald-100 bg-emerald-600/30 p-2 rounded-lg">
                                <span>Réduction apliquée</span>
                                <span className="font-bold">{transactionResult.discount}%</span>
                            </div>
                        )}

                        <div className="border-t border-white/20 pt-4 mt-4">
                            <div className="text-sm opacity-70 mb-1">Débité du compte</div>
                            <div className="text-xl font-bold">{transactionResult.finalAmount.toFixed(2)} €</div>
                        </div>

                        <div className="text-sm opacity-70 mt-2">
                            Nouveau solde : {transactionResult.newBalance.toFixed(2)} €
                        </div>
                    </div>

                    <div className="mt-12">
                        <div className="text-sm font-bold uppercase tracking-widest opacity-60 mb-2">Reçu à présenter au serveur</div>
                        <div className="h-1 w-24 bg-white/40 rounded-full mx-auto animate-pulse"></div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setStep('select-partner');
                        setAmount('');
                        setTransactionResult(null);
                        // Refresh wallets? In real app yes, here navigate handles unmount
                    }}
                    className="absolute bottom-8 left-6 right-6 bg-white text-emerald-600 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-lg"
                >
                    Fermer
                </button>
            </div>
        );
    }

    return null;
}
