import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeletionReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    userName: string;
    userType: 'subscriber' | 'partner';
}

export default function DeletionReasonModal({
    isOpen,
    onClose,
    onConfirm,
    userName,
    userType
}: DeletionReasonModalProps) {
    if (!isOpen) return null;

    const [reason, setReason] = useState<string>('user_request');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center text-red-600">
                        <AlertTriangle className="w-6 h-6 mr-2" />
                        <h2 className="text-xl font-bold">Confirmer l'archivage</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="text-gray-600 mb-4">
                    Vous êtes sur le point d'archiver {userType === 'partner' ? 'le partenaire' : "l'abonnée"} <strong>{userName}</strong>.
                    <br /><br />
                    Cette action va :
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Bloquer l'accès au compte (Ban/Suppression Auth)</li>
                        <li>Supprimer le contenu public (Squads, Events)</li>
                        <li>Archiver le profil</li>
                    </ul>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Raison de la suppression (pour l'email) :
                    </label>
                    <div className="space-y-2">
                        <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="reason"
                                value="user_request"
                                checked={reason === 'user_request'}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                            />
                            <span className="ml-3">
                                <span className="block text-sm font-medium text-gray-900">Sur demande</span>
                                <span className="block text-xs text-gray-500">Email bienveillant "Tu vas nous manquer..."</span>
                            </span>
                        </label>

                        <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="reason"
                                value="violation"
                                checked={reason === 'violation'}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <span className="ml-3">
                                <span className="block text-sm font-medium text-gray-900">Non-respect des règles</span>
                                <span className="block text-xs text-gray-500">Email strict "Compte suspendu..."</span>
                            </span>
                        </label>

                        <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="reason"
                                value="other"
                                checked={reason === 'other'}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                            />
                            <span className="ml-3">
                                <span className="block text-sm font-medium text-gray-900">Autre</span>
                                <span className="block text-xs text-gray-500">Email générique "Fermeture de compte"</span>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                    >
                        Confirmer et Archiver
                    </button>
                </div>
            </div>
        </div>
    );
}
