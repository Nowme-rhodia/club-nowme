import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Loader, Info, Calendar, Clock, RotateCcw, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Newsletter() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  // Scheduling state
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // History state
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_newsletters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsletters(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setSubject(item.subject);
    setBody(item.body);

    const dateObj = new Date(item.scheduled_at);
    // Format YYYY-MM-DD
    setScheduledDate(dateObj.toISOString().split('T')[0]);
    // Format HH:MM
    setScheduledTime(dateObj.toTimeString().slice(0, 5));

    setIsScheduling(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet email programmé ?')) return;

    try {
      const { error } = await supabase
        .from('admin_newsletters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Newsletter supprimée');
      fetchHistory();

      // If we were editing this one, clear form
      if (editingId === id) cancelEdit();

    } catch (error: any) {
      toast.error('Erreur suppression: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSubject('');
    setBody('');
    setScheduledDate('');
    setScheduledTime('');
    setIsScheduling(false);
  };

  const handleSendOrSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !body.trim()) {
      toast.error('Veuillez remplir le sujet et le contenu');
      return;
    }

    setLoading(true);

    try {
      if (isScheduling) {
        // SCHEDULING MODE: Save to DB
        if (!scheduledDate || !scheduledTime) {
          toast.error('Veuillez choisir une date et une heure');
          setLoading(false);
          return;
        }

        const scheduledDateTime = new Date(scheduledDate + 'T' + scheduledTime);
        if (scheduledDateTime < new Date()) {
          toast.error('La date doit être dans le futur');
          setLoading(false);
          return;
        }

        if (editingId) {
          // UPDATE existing
          const { error } = await supabase
            .from('admin_newsletters')
            .update({
              subject,
              body,
              scheduled_at: scheduledDateTime.toISOString(),
              // reset status to scheduled in case it was failed or something else, 
              // but usually we only edit scheduled ones.
              status: 'scheduled'
            })
            .eq('id', editingId);

          if (error) throw error;
          toast.success('Newsletter mise à jour !');
        } else {
          // INSERT new
          const { error } = await supabase
            .from('admin_newsletters')
            .insert({
              subject,
              body,
              scheduled_at: scheduledDateTime.toISOString(),
              status: 'scheduled'
            });

          if (error) throw error;
          toast.success('Newsletter programmée avec succès !');
        }

        cancelEdit(); // Reset form
        fetchHistory(); // Refresh list

      } else {
        // IMMEDIATE SEND MODE
        // We insert with scheduled_at = NOW (or slightly in past to be safe)
        // Then we force trigger the processor function.

        const now = new Date();
        now.setSeconds(now.getSeconds() - 1);

        const { error } = await supabase
          .from('admin_newsletters')
          .insert({
            subject,
            body,
            scheduled_at: now.toISOString(),
            status: 'scheduled'
          });

        if (error) throw error;

        // Force trigger
        const { error: invokeError } = await supabase.functions.invoke('process-scheduled-newsletters');

        if (invokeError) {
          console.warn("Manual trigger failed, but cron will pick it up:", invokeError);
          toast.success('Newsletter mise en file d\'attente (le cron va la traiter)');
        } else {
          toast.success('Traitement lancé !');
        }

        cancelEdit();
        setTimeout(fetchHistory, 3000);
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur: ' + (error.message || 'Problème inconnu'));
    } finally {
      setLoading(false);
    }
  };

  // Helper for badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Programmé</span>;
      case 'processing': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">En cours</span>;
      case 'sent': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Envoyé</span>;
      case 'failed': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Échoué</span>;
      default: return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Newsletter du Kiff</h1>
        <p className="text-gray-600">Envoyez ou programmez vos emails aux abonnées.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: editor */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {editingId ? 'Modifier la newsletter' : 'Rédaction'}
            </h2>
            {editingId && (
              <button onClick={cancelEdit} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X className="w-4 h-4" /> Annuler modification
              </button>
            )}
          </div>

          <form onSubmit={handleSendOrSchedule} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sujet de l'email (Emojis supportés ✨)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                placeholder="ex: Les pépites de la semaine 🔥"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenu (HTML supporté)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors font-mono text-sm"
                placeholder="<h1>Salut la commu !</h1><p>Voici les news...</p>"
              />
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Infos d'envoi</p>
                <p className="mt-1">
                  Cet email sera envoyé uniquement aux utilisateurs ayant le rôle <strong>Subscriber</strong> et l'option "Newsletter" activée.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setIsScheduling(!isScheduling)}
                  // If editing, force scheduling mode essentially
                  disabled={!!editingId}
                  className={`text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${isScheduling ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <Calendar className="w-4 h-4" />
                  {isScheduling ? 'Mode Programmation activé' : 'Programmer pour plus tard ?'}
                </button>
              </div>

              {isScheduling && (
                <div className="flex gap-4 mb-6 bg-gray-50 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Heure</label>
                    <input
                      type="time"
                      className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-xl text-white font-medium transition-all shadow-sm
                        ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark hover:shadow-md'}
                    `}
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : isScheduling ? (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    {editingId ? 'Mettre à jour la programmation' : 'Programmer l\'envoi'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Envoyer maintenant
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: History */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-gray-500" />
                Historique & Programmés
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const toastId = toast.loading('Traitement en cours...');
                    try {
                      const { error } = await supabase.functions.invoke('process-scheduled-newsletters');
                      if (error) throw error;
                      toast.success('Traitement terminé !', { id: toastId });
                      setTimeout(fetchHistory, 2000);
                    } catch (e: any) {
                      console.error(e);
                      toast.error('Erreur', { id: toastId });
                    }
                  }}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-md transition-colors"
                  title="Force le traitement des emails programmés"
                >
                  Traiter maintenant
                </button>
                <button onClick={fetchHistory} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[600px] space-y-4 pr-2">
              {loadingHistory ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : newsletters.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Aucune newsletter trouvée
                </div>
              ) : (
                newsletters.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow bg-gray-50/50 group">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 line-clamp-1 flex-1 mr-2">{item.subject}</h3>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(item.status)}

                        {/* Actions only for scheduled items */}
                        {item.status === 'scheduled' && (
                          <div className="flex gap-1 ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Modifier"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Prévu : {new Date(item.scheduled_at).toLocaleString('fr-FR')}
                      </div>
                      {item.sent_at && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Send className="w-3 h-3" />
                          Envoyé : {new Date(item.sent_at).toLocaleString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}