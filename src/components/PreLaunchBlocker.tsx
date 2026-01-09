import React from 'react';
import { Sparkles, Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PreLaunchBlocker({ overlay = false }: { overlay?: boolean }) {
    return (
        <div className={`min-h-[70vh] flex flex-col items-center justify-center p-6 text-center ${overlay ? 'bg-white/80 backdrop-blur-sm z-50 absolute inset-0' : 'bg-[#FDF8F4]'}`}>
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary/20 mx-auto">
                    <Clock className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 transform rotate-12">
                    <Star className="w-8 h-8 text-yellow-400 fill-current animate-bounce" />
                </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 font-display">
                Chut... On se fait une beauté 💅
            </h1>

            <div className="max-w-xl mx-auto space-y-4 mb-10">
                <p className="text-xl text-gray-600">
                    L'espace Club et les Sorties ouvrent officiellement
                    <span className="font-bold text-primary mx-1">en Février</span> !
                </p>
                <p className="text-gray-500">
                    On prépare les derniers détails pour que l'expérience soit parfaite.<br />
                    (Mais tu peux déjà voir ce qui t'attend en fond 😉)
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    to="/tous-les-kiffs"
                    className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-dark transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                    <Sparkles className="w-5 h-5" />
                    Découvrir les offres dispos
                </Link>
                <Link
                    to="/mon-compte"
                    className="px-8 py-3 bg-white text-gray-700 border-2 border-gray-100 rounded-full font-bold hover:bg-gray-50 transition-all"
                >
                    Retour à mon compte
                </Link>
            </div>
        </div>
    );
}
