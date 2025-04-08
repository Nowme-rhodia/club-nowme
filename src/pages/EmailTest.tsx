import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { sendEmail, getEmailHistory } from '../lib/email';

interface Email {
  id: string;
  to: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  sent_at?: string;
  created_at: string;
}

export default function EmailTest() {
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    content: ''
  });
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [emailHistory, setEmailHistory] = useState<Email[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadEmailHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getEmailHistory();
      setEmailHistory(history);
    } catch (error) {
      console.error('Error loading email history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadEmailHistory();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      await sendEmail(formData);

      setStatus({
        type: 'success',
        message: 'Email envoyé avec succès !'
      });
      
      // Réinitialiser le formulaire
      setFormData({
        to: '',
        subject: '',
        content: ''
      });

      // Recharger l'historique
      await loadEmailHistory();
    } catch (error) {
      console.error('Error details:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error 
          ? error.message 
          : 'Une erreur est survenue lors de l\'envoi de l\'email'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: Email['status']) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: Email['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Test d'envoi d'email
          </h1>
          <p className="mt-2 text-gray-600">
            Utilisez ce formulaire pour tester l'envoi d'emails via la fonction Supabase
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulaire d'envoi */}
          <div>
            {status.type && (
              <div className={`mb-6 p-4 rounded-lg ${
                status.type === 'success' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center">
                  {status.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                  )}
                  <p className={`text-sm ${
                    status.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {status.message}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6 space-y-6">
              <div>
                <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
                  Destinataire
                </label>
                <input
                  type="email"
                  id="to"
                  name="to"
                  required
                  value={formData.to}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  placeholder="Sujet de l'email"
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Contenu
                </label>
                <textarea
                  id="content"
                  name="content"
                  required
                  value={formData.content}
                  onChange={handleChange}
                  rows={6}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  placeholder="Contenu de l'email"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`
                  w-full flex items-center justify-center px-6 py-3 rounded-lg text-white
                  ${isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                  }
                `}
              >
                <Send className="w-5 h-5 mr-2" />
                {isLoading ? 'Envoi en cours...' : 'Envoyer l\'email'}
              </button>
            </form>
          </div>

          {/* Historique des emails */}
          <div>
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Historique des emails
                </h2>
                <button
                  onClick={loadEmailHistory}
                  disabled={isLoadingHistory}
                  className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-4">
                {emailHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Aucun email envoyé pour le moment
                  </p>
                ) : (
                  emailHistory.map((email) => (
                    <div
                      key={email.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{email.subject}</h3>
                          <p className="text-sm text-gray-600">{email.to}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                          {getStatusIcon(email.status)}
                          <span className="ml-1">
                            {email.status === 'sent' ? 'Envoyé' : email.status === 'failed' ? 'Échec' : 'En attente'}
                          </span>
                        </span>
                      </div>
                      {email.error && (
                        <p className="text-sm text-red-600 mt-2">{email.error}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(email.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}