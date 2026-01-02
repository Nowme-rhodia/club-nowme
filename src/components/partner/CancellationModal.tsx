import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface CancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isSubmitting: boolean;
}

export default function CancellationModal({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting,
}: CancellationModalProps) {
    const [reason, setReason] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (reason.trim().length > 5) {
            onConfirm(reason);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                            Annuler la séance
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Legal Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                        <p className="font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Impact financier
                        </p>
                        <ul className="list-disc pl-5 space-y-1 opacity-90">
                            <li>Le client sera <strong>intégralement remboursé</strong>.</li>
                            <li>Les frais de transaction Stripe restent à votre charge.</li>
                            <li>
                                Des <strong>frais de gestion de 5,00€</strong> seront appliqués à
                                votre compte.
                            </li>
                            <li>
                                Ces montants seront ajoutés à vos pénalités et déduits de vos
                                prochains versements.
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="reason"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Motif de l'annulation <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="reason"
                            required
                            rows={3}
                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 transition-colors"
                            placeholder="Expliquez la raison de l'annulation au client..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                            Ce message sera inclus dans l'email envoyé au client.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                        >
                            Retour
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || reason.trim().length < 5}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Traitement...
                                </>
                            ) : (
                                "Confirmer l'annulation et payer les frais"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
