import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Check, X, Loader2, Phone, MapPin, Calendar, FileText, User } from 'lucide-react';

export default function AmbassadorApplications() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // store application ID acting upon
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'revoked'>('pending');

    useEffect(() => {
        fetchApplications();
    }, [filter]);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ambassador_applications')
                .select(`
          *,
          user:user_id (
            first_name,
            last_name,
            email,
            photo_url,
            ambassador_start_date
          )
        `)
                .eq('status', filter)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error) {
            console.error('Error fetching applications:', error);
            toast.error('Impossible de charger les candidatures');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (applicationId: string) => {
        if (!confirm('Confirmer la validation de cette ambassadrice ?\nCela activera son statut, appliquera la réduction Stripe et enverra une notification.')) return;

        setActionLoading(applicationId);
        try {
            const { data, error } = await supabase.functions.invoke('approve-ambassador', {
                body: { application_id: applicationId }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            toast.success('Ambassadrice validée avec succès !');
            setApplications(prev => prev.filter(app => app.id !== applicationId));
        } catch (error: any) {
            console.error('Error approving ambassador:', error);
            toast.error('Erreur: ' + (error.message || 'Inconnue'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = async (userId: string, applicationId: string, action: 'revoke' | 'renew' | 'test_warning') => {
        if (!confirm(
            action === 'revoke'
                ? "Êtes-vous sûr de vouloir révoquer ce statut ? L'utilisateur perdra ses avantages."
                : action === 'renew'
                    ? "Voulez-vous renouveler le mandat pour 6 mois ?"
                    : "Voulez-vous simuler la fin de mandat (5.5 mois) pour tester l'email d'alerte ?"
        )) return;

        setActionLoading(applicationId);
        try {
            const { data, error } = await supabase.functions.invoke('manage-ambassador', {
                body: { user_id: userId, action }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            toast.success(action === 'revoke' ? 'Statut révoqué.' : 'Mandat renouvelé !');
            // If revoke, maybe check if we should remove from "approved" view? 
            // Technically application status is still 'approved' in specific table, but user is not.
            // For now just refresh or user feedback is enough.
            fetchApplications();
        } catch (error: any) {
            console.error(`Error ${action} ambassador:`, error);
            toast.error('Erreur: ' + (error.message || 'Inconnue'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (applicationId: string) => {
        if (!confirm('Rejeter cette candidature ?')) return;

        setActionLoading(applicationId);
        try {
            const { error } = await supabase
                .from('ambassador_applications')
                .update({ status: 'rejected' })
                .eq('id', applicationId);

            if (error) throw error;

            toast.success('Candidature rejetée.');
            setApplications(prev => prev.filter(app => app.id !== applicationId));
        } catch (error) {
            console.error('Error rejecting application:', error);
            toast.error('Erreur lors du rejet');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Candidatures Ambassadrices</h1>
                    <p className="text-gray-500">Gérez les demandes pour rejoindre le programme Ambassadrice.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(['pending', 'approved', 'revoked', 'rejected'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === status
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {status === 'pending' ? 'En attente' : status === 'approved' ? 'Active / Validées' : status === 'revoked' ? 'Révoquées' : 'Rejetées'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : applications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Aucune candidature correspondante.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {applications.map((app) => (
                        <div key={app.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">

                            {/* User Info */}
                            <div className="flex-shrink-0 flex flex-col items-center md:items-start w-full md:w-48 space-y-3">
                                {app.user?.photo_url ? (
                                    <img src={app.user.photo_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-100" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="w-8 h-8 text-gray-400" />
                                    </div>
                                )}
                                <div className="text-center md:text-left">
                                    <h3 className="font-semibold text-gray-900">{app.user?.first_name} {app.user?.last_name}</h3>
                                    <p className="text-xs text-gray-500 flex items-center justify-center md:justify-start mt-1">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(app.created_at).toLocaleDateString()}
                                    </p>
                                    {filter === 'approved' && app.user?.ambassador_start_date && (
                                        <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full mt-2 inline-block">
                                            Mandat : {new Date(app.user.ambassador_start_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Application Details */}
                            <div className="flex-grow space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-start bg-gray-50 p-3 rounded-lg">
                                        <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Localisation</span>
                                            <p className="text-gray-900 font-medium">{app.location}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start bg-gray-50 p-3 rounded-lg">
                                        <Phone className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Téléphone</span>
                                            <p className="text-gray-900 font-medium">{app.phone || 'Non renseigné'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start bg-gray-50 p-3 rounded-lg col-span-1 md:col-span-2">
                                        <FileText className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Motivation</span>
                                            <p className="text-gray-700 whitespace-pre-wrap">{app.motivation_text}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center text-sm text-gray-600">
                                    <span className="font-medium mr-2">Disponibilité :</span> {app.availability_hours_per_week}h / semaine
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                                {filter === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(app.id)}
                                            disabled={actionLoading === app.id}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                            title="Valider"
                                        >
                                            {actionLoading === app.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" /> Valider
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleReject(app.id)}
                                            disabled={actionLoading === app.id}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                                            title="Rejeter"
                                        >
                                            <X className="w-4 h-4 mr-2" /> Rejeter
                                        </button>
                                    </>
                                )}
                                {filter === 'approved' && (
                                    <>
                                        <button
                                            onClick={() => handleAction(app.user_id, app.id, 'renew')}
                                            disabled={actionLoading === app.id}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                                        >
                                            {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Renouveler'}
                                        </button>
                                        <button
                                            onClick={() => handleAction(app.user_id, app.id, 'revoke')}
                                            disabled={actionLoading === app.id}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors text-sm"
                                        >
                                            {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Révoquer'}
                                        </button>
                                        <button
                                            onClick={() => handleAction(app.user_id, app.id, 'test_warning')}
                                            disabled={actionLoading === app.id}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors text-xs"
                                            title="Simuler que le mandat a 5.5 mois"
                                        >
                                            {actionLoading === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '⚡ Test Alerte'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
