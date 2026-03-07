import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export function ProContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        date: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data, error } = await supabase.functions.invoke('send-pro-lead', {
                body: {
                    name: formData.name,
                    company: formData.company,
                    email: formData.email,
                    date_period: formData.date,
                    message: formData.message
                }
            });

            if (error) throw error;

            setIsSubmitted(true);
            toast.success('Votre demande a bien été envoyée. Je vous réponds sous 24h.');
        } catch (err: any) {
            console.error('Error sending pro lead:', err);
            toast.error('Une erreur est survenue lors de l\'envoi. Veuillez réessayer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    if (isSubmitted) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
                <div className="flex justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-gray-900">Demande envoyée !</h3>
                <p className="text-gray-600">
                    Merci pour votre confiance. Je prends connaissance de votre projet et je reviens vers vous personnellement sous 24h.
                </p>
                <button
                    onClick={() => {
                        setIsSubmitted(false);
                        setFormData({ name: '', company: '', email: '', date: '', message: '' });
                    }}
                    className="text-primary font-medium hover:underline"
                >
                    Envoyer un autre message
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            Nom complet
                        </label>
                        <input
                            type="text"
                            id="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Ex: Rhodia Nowme"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="company" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            Entreprise
                        </label>
                        <input
                            type="text"
                            id="company"
                            required
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Nom de votre société"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            E-mail professionnel
                        </label>
                        <input
                            type="email"
                            id="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="rhodia@nowme.fr"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="date" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            Date (ou période)
                        </label>
                        <input
                            type="text"
                            id="date"
                            value={formData.date}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Ex: Juin 2024"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="message" className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        Décrire mon besoin actuel
                    </label>
                    <textarea
                        id="message"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        placeholder="Nombre de participants, objectifs, type d'événement..."
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>Me présenter votre projet</span>
                            <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
