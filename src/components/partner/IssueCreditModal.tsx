import React, { useState } from 'react';
import { X, Gift } from 'lucide-react';

interface IssueCreditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, reason: string) => void;
    isSubmitting: boolean;
    clientName: string;
}

export default function IssueCreditModal({ isOpen, onClose, onConfirm, isSubmitting, clientName }: IssueCreditModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Veuillez entrer un montant valide supérieur à 0.');
            return;
        }
        if (!reason.trim()) {
            alert('Veuillez entrer une raison.');
            return;
        }
        onConfirm(numAmount, reason);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-in relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-pink-100 rounded-xl text-primary">
                        <Gift className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Attribuer un avoir</h3>
                </div>

                <p className="text-gray-600 mb-6">
                    Vous allez attribuer un avoir à <strong>{clientName}</strong>. Cet avoir sera déductible de ses prochains achats chez vous uniquement.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Ex: 15.00"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Raison de l'avoir</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Geste commercial suite à un retard"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[100px]"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Envoi...
                                </>
                            ) : (
                                'Confirmer'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
