import React from 'react';
import { motion } from 'framer-motion';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const Community: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF8F4] to-[#FFFFFF] text-gray-800">
      {/* Hero Section */}
      <motion.section
        className="relative py-16 md:py-24 overflow-hidden"
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#BF2778]/10 to-[#E4D44C]/10"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#BF2778] mb-6"
            {...fadeInUp}
          >
            Bienvenue dans ton cercle du kiff
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto"
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Ici, on ne fait pas que parler… on vit, on partage, on kiffe ensemble.
          </motion.p>
          <motion.a
            href="#subscribe"
            className="inline-flex items-center px-8 py-4 rounded-full bg-[#BF2778] text-white font-semibold text-lg hover:bg-[#A62266] transform hover:scale-105 transition-all duration-300 shadow-md"
            whileHover={{ scale: 1.05 }}
            {...fadeInUp}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Je m’abonne pour rejoindre la communauté
          </motion.a>
        </div>
      </motion.section>

      {/* Section "C’est quoi la communauté ?" */}
      <motion.section className="py-16 bg-white" {...fadeInUp}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            C’est quoi la communauté Nowme Club ?
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto"
            {...fadeInUp}
            transition={{ delay: 0.2 }}
          >
            Une communauté féminine où tout est pensé pour souffler, rencontrer, rire, partager, kiffer, sans charge mentale.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {[
              {
                title: 'Échanges bienveillants',
                icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2m-6 0h2',
              },
              {
                title: 'Bons plans & offres',
                icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm0 8c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791-4-4-4z',
              },
              {
                title: 'Papotages du quotidien',
                icon: 'M8 12h8m-4-4v8',
              },
              {
                title: 'Rencontres & sorties',
                icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197',
              },
              {
                title: 'Groupes WhatsApp',
                icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2m-6 0h2',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="flex flex-col items-center"
                {...fadeInUp}
                transition={{ delay: 0.3 + idx * 0.15 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="w-16 h-16 bg-[#BF2778]/10 rounded-full flex items-center justify-center mb-4"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                >
                  <svg
                    className="w-8 h-8 text-[#BF2778]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={item.icon}
                    ></path>
                  </svg>
                </motion.div>
                <p className="text-gray-700 font-medium">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

            {/* Section "Ce que tu peux faire ici" */}
            <motion.section className="py-16 bg-[#BF2778]/5" {...fadeInUp}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Ce que tu auras dans le club
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { title: 'Événements premium', icon: 'M5 13l4 4L19 7' },
              { title: 'Box trimestrielle', icon: 'M12 8v4l3 3' },
              {
                title: 'Masterclass expertes',
                icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197',
              },
              {
                title: 'Consultations bien-être',
                icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
              },
              {
                title: 'Service conciergerie',
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-center"
                {...fadeInUp}
                transition={{ delay: 0.2 + idx * 0.15 }}
                whileHover={{ scale: 1.05 }}
              >
                <svg
                  className="w-10 h-10 text-[#BF2778] mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={item.icon}
                  ></path>
                </svg>
                <p className="text-gray-700 font-medium">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Section Témoignages */}
      <motion.section className="py-16 bg-white" {...fadeInUp}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Elles en parlent mieux que nous
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: '“Grâce au club, j’ai rencontré une super pote.”', author: 'Julie, 38 ans' },
              { quote: '“Je me sens comprise ici.”', author: 'Amandine, 42 ans' },
              { quote: '“C’est la seule notif WhatsApp que j’ouvre avec plaisir.”', author: 'Sophie, 35 ans' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="bg-[#BF2778]/5 p-6 rounded-xl text-center"
                {...fadeInUp}
                transition={{ delay: 0.2 + idx * 0.15 }}
              >
                <p className="text-gray-700 italic mb-4">{item.quote}</p>
                <p className="text-[#BF2778] font-semibold">— {item.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Section "Notre vibe" */}
      <motion.section className="py-16 bg-[#E4D44C]/10" {...fadeInUp}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Notre vibe
          </motion.h2>
          <motion.p className="text-lg text-gray-700 mb-4">Pas de jugement, pas de pub sauvage</motion.p>
          <motion.p className="text-lg text-gray-700 mb-4">Beaucoup de fun, d’entraide et d’humour</motion.p>
          <motion.p className="text-lg text-gray-700">Une seule règle : kiffer, à sa façon. ✨</motion.p>
        </div>
      </motion.section>

      {/* Section Accès & Lien Facebook */}
      <motion.section className="py-16 bg-white" {...fadeInUp}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Tu veux faire partie de tout ça ?
          </motion.h2>
          <motion.p className="text-lg text-gray-600 mb-8">C’est simple, abonne-toi pour 9,99 €/mois !</motion.p>
          <motion.p className="text-lg text-gray-600 mb-8">C'est simple : 12,99€ pour découvrir, puis 39,99€ pour l'accès premium complet !</motion.p>
          <motion.a
            href="#subscribe"
            className="inline-flex items-center px-8 py-4 rounded-full bg-[#BF2778] text-white font-semibold text-lg hover:bg-[#A62266] transform hover:scale-105 transition-all duration-300 shadow-md mb-6"
            whileHover={{ scale: 1.05 }}
          >
            Je teste à 12,99€ maintenant
          </motion.a>
          <p className="text-gray-600">
            Déjà membre ?{' '}
            <a
              href="https://facebook.com/groups/nowme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#BF2778] hover:underline inline-flex items-center"
            >
              Rejoins le groupe Facebook privé
              <svg
                className="w-5 h-5 ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
              </svg>
            </a>
          </p>
        </div>
      </motion.section>

    </div>
  );
};

export default Community;
