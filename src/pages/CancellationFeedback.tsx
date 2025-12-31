
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { MessageSquare, Star, ArrowRight, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CancellationFeedback() {
    const navigate = useNavigate();
    const [rating, setRating] = useState<number>(0);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error('Vous devez être connecté pour donner votre avis');
                return;
            }

            const { error } = await supabase
                .from('feedback')
                .insert({
                    user_id: user.id,
                    category: 'cancellation',
                    rating,
                    message
                } as any);

            if (error) throw error;

            setSubmitted(true);
            toast.success('Merci pour votre retour !');

            // Redirect after a short delay
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error('Une erreur est survenue lors de l\'envoi de votre avis');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center"
                    >
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <Heart className="h-6 w-6 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h2>
                        <p className="text-gray-600 mb-6">
                            Votre avis est précieux pour nous aider à améliorer l'expérience Nowme.
                        </p>
                        <p className="text-sm text-gray-500">
                            Redirection vers l'accueil dans quelques secondes...
                        </p>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-rose-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <span className="text-4xl">💔</span>
                </div>
                <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
                    Votre avis compte
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Nous sommes tristes de vous voir partir. Aidez-nous à faire mieux !
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Notez votre expérience globale
                            </label>
                            <div className="flex justify-center space-x-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`p-2 transition-colors duration-200 focus:outline-none ${star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                                            }`}
                                    >
                                        <Star className="h-8 w-8 fill-current" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                                Pourquoi nous quittez-vous ? (Optionnel)
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <MessageSquare className="h-5 w-5 text-gray-400" />
                                </div>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={4}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                    placeholder="Trop cher ? Pas assez d'événements ? Dites-nous tout..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 ${loading ? 'opacity-75 cursor-not-allowed' : ''
                                    }`}
                            >
                                {loading ? 'Envoi...' : 'Envoyer mon avis'}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-900">
                            Retour à l'accueil
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
