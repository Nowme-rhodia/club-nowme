import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface RestrictedAccessProps {
  title?: string;
  description?: string;
  imageUrl?: string;
}

export const RestrictedAccess = ({
  title = "Désolée, cette page est réservée aux abonnées !",
  description = "Découvre des expériences uniques et des réductions exclusives en rejoignant notre communauté de femmes inspirantes.",
  imageUrl = "https://i.imgur.com/Sdp2NWb.jpg"
}: RestrictedAccessProps) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 flex items-center justify-center p-4">
      <div 
        className="relative max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden
          transform transition-all duration-500 ease-out animate-[slideUp_0.5s_ease-out]"
      >
        {/* Image de fond avec dégradé */}
        <div className="relative h-64 sm:h-80 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center transform transition-transform duration-700 hover:scale-105"
            style={{ 
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: '50% 30%'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
          
          {/* Titre */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center leading-tight">
              {title}
            </h2>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-8 sm:p-10 space-y-8 bg-white">
          {/* Avantages */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 text-primary">✨</span>
              <p className="text-gray-700">Premier mois à seulement 4,99€ avec le code <span className="font-semibold">MOIS5</span></p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 text-primary">🎯</span>
              <p className="text-gray-700">Jusqu'à -50% sur toutes nos offres bien-être et loisirs</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 text-primary">🎁</span>
              <p className="text-gray-700">Dès ton premier kiff, ton abonnement est déjà rentabilisé !</p>
            </div>
          </div>

          {/* Bouton d'action */}
          <div className="space-y-6">
            <button
              onClick={() => navigate('/subscription')}
              className="w-full inline-flex items-center justify-center px-8 py-4 rounded-full 
                bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg
                transform transition-all duration-300
                hover:shadow-[0_8px_20px_rgba(191,39,120,0.3)]
                hover:scale-[1.02] active:scale-98
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Sparkles className="w-5 h-5 mr-3 animate-[sparkle_2s_ease-in-out_infinite]" />
              Je veux tester maintenant !
            </button>

            <p className="text-center text-sm text-gray-500">
              Déjà membre ? {' '}
              <a 
                href="/auth/signin" 
                className="text-primary hover:text-primary-dark font-medium 
                  transition-colors duration-300 hover:underline
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              >
                Connecte-toi ici
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};