import React from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Award, MapPin, ArrowRight, ShieldCheck, Zap, Heart } from 'lucide-react';
import { ProContactForm } from '../../components/pro/ProContactForm';
import { Helmet } from 'react-helmet-async';

export default function ProLanding() {
    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    };

    const cases = [
        {
            title: "Le Séminaire de Vision",
            icon: <Target className="w-6 h-6" />,
            text: "Votre CODIR doit s'isoler pour trancher des sujets complexes. Je trouve le lieu qui inspire et je cadence la journée pour que vous n'ayez à gérer que le fond."
        },
        {
            title: "La Croissance Flash",
            icon: <Users className="w-6 h-6" />,
            text: "Vous avez recruté 15 personnes ces trois derniers mois et l'équipe commence à se fragmenter. Je conçois le format qui brise la glace naturellement et recrée du lien."
        },
        {
            title: "Le Hackathon d’Innovation",
            icon: <Zap className="w-6 h-6" />,
            text: "Un projet est bloqué depuis six mois ? On réunit tout le monde pour une journée de production intense. Je gère le flux, l'énergie et le ravitaillement, vous sortez le produit."
        },
        {
            title: "Les Temps forts de Marque",
            icon: <Award className="w-6 h-6" />,
            text: "Marquer une réussite ou un lancement avec un format haut de gamme, sobre et représentatif de vos valeurs. Pour vos collaborateurs ou vos partenaires."
        }
    ];

    return (
        <div className="bg-white">
            <Helmet>
                <title>Nowme Pro | Conception et Pilotage d'événements stratégiques</title>
                <meta name="description" content="Des formats d’événements pensés pour vos enjeux d’équipe, exécutés avec précision. Séminaires, hackathons et retraites sur-mesure avec Rhodia." />
            </Helmet>

            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-[#FDF8F4]">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-20 right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                    <div className="absolute bottom-20 left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl opacity-50"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8"
                        >
                            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
                                <span className="text-primary font-bold text-sm uppercase tracking-widest">Nowme Business</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 leading-[1.1]">
                                Des formats d’événements pensés pour vos enjeux d’équipe, exécutés avec précision.
                            </h1>
                            <p className="text-xl text-gray-600 font-light leading-relaxed max-w-xl">
                                Je m’appelle **Rhodia**. J’accompagne les entreprises dans la conception et le pilotage de leurs temps forts stratégiques. Du séminaire de direction au hackathon d’innovation, je transforme vos intentions en formats concrets et maîtrisés.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <a
                                    href="#contact"
                                    className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-bold text-lg text-center transition-all duration-300 transform hover:scale-105"
                                >
                                    Échanger sur votre événement
                                </a>
                                <div className="flex items-center space-x-4 pl-4 border-l border-gray-200">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200"></div>
                                        ))}
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-bold text-gray-900">+100 événements</span><br />
                                        <span className="text-gray-500">organisés avec succès</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="relative"
                        >
                            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative">
                                <img
                                    src="/images/pro/rhodia-pro.jpg"
                                    alt="Rhodia - Fondatrice de Nowme"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                                    <p className="font-serif italic text-lg leading-relaxed">
                                        "Je ne propose pas une activité, je définis le format le plus pertinent pour votre objectif."
                                    </p>
                                    <p className="mt-2 font-bold">— Rhodia</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Strategic Diagnostic Section */}
            <section id="approche" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center space-y-8">
                        <motion.h2 {...fadeIn} className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
                            Un événement réussi commence par une lecture juste de vos enjeux.
                        </motion.h2>
                        <motion.p {...fadeIn} transition={{ delay: 0.1 }} className="text-lg text-gray-600 leading-relaxed font-light">
                            Avant de parler de logistique, je m’attache à comprendre votre situation. Qu’il s’agisse de fédérer une équipe après une phase de croissance ou de libérer la créativité sur un projet complexe, le succès repose sur le choix du bon format.
                        </motion.p>
                        <motion.p {...fadeIn} transition={{ delay: 0.2 }} className="text-lg text-gray-600 leading-relaxed font-light">
                            Mon travail consiste à poser ce cadre : définir le rythme, le ton et l'environnement qui permettront à vos collaborateurs de s’engager pleinement, tout en vous libérant de la complexité organisationnelle.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Expertise Section */}
            <section id="services" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <motion.div {...fadeIn} className="space-y-10">
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">
                                Une expertise de terrain, un regard extérieur.
                            </h2>
                            <p className="text-gray-600 text-lg font-light leading-relaxed">
                                Avec Nowme, vous travaillez directement avec moi. J’apporte un regard neutre et une expérience acquise sur plus d’une centaine de projets pour :
                            </p>

                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-primary">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-2">Concevoir le format adapté</h3>
                                        <p className="text-gray-600 font-light">Pas de modèles pré-établis, mais une réponse construite selon votre culture d’entreprise.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-primary">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-2">Coordonner les expertises</h3>
                                        <p className="text-gray-600 font-light">Je mobilise et pilote les meilleurs partenaires (lieux, intervenants, gastronomie) pour servir votre vision.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-primary">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-2">Sécuriser le projet</h3>
                                        <p className="text-gray-600 font-light">J’anticipe les points critiques et je pilote l’exécution sur site pour garantir la fluidité du moment.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            {...fadeIn}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-2 gap-6"
                        >
                            {cases.map((c, i) => (
                                <div key={i} className={`p-8 rounded-3xl bg-white shadow-sm flex flex-col space-y-4 ${i % 2 === 1 ? 'mt-8' : ''}`}>
                                    <div className="text-primary">{c.icon}</div>
                                    <h3 className="font-bold text-gray-900 leading-tight">{c.title}</h3>
                                    <p className="text-sm text-gray-500 font-light leading-relaxed">{c.text}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="chiffres" className="py-24 bg-primary text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
                        <motion.div {...fadeIn}>
                            <div className="text-4xl md:text-5xl font-serif font-bold mb-2">+100</div>
                            <div className="text-primary-lighter text-sm uppercase tracking-widest font-medium opacity-80">Événements pilotés</div>
                        </motion.div>
                        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
                            <div className="text-4xl md:text-5xl font-serif font-bold mb-2">+5000</div>
                            <div className="text-primary-lighter text-sm uppercase tracking-widest font-medium opacity-80">Participants accompagnés</div>
                        </motion.div>
                        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                            <div className="text-4xl md:text-5xl font-serif font-bold mb-2">20</div>
                            <div className="text-primary-lighter text-sm uppercase tracking-widest font-medium opacity-80">Séjours produits</div>
                        </motion.div>
                        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
                            <div className="text-4xl md:text-5xl font-serif font-bold mb-2">+100</div>
                            <div className="text-primary-lighter text-sm uppercase tracking-widest font-medium opacity-80">Partenaires validés</div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Methodology Section */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">Un accompagnement structuré.</h2>
                        <div className="w-20 h-1 bg-primary mx-auto"></div>
                    </div>

                    <div className="relative">
                        <div className="hidden lg:block absolute top-[50%] left-0 right-0 h-px bg-gray-100 z-0"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
                            {[
                                { title: "Diagnostic", text: "Échange sur vos objectifs, votre contexte et vos contraintes." },
                                { title: "Conception", text: "Présentation du concept, du planning et des options logistiques." },
                                { title: "Coordination", text: "Sélection et pilotage des prestataires, gestion de la préparation." },
                                { title: "Pilotage terrain", text: "Présence sur site pour orchestrer l'événement et garantir votre sérénité." }
                            ].map((step, i) => (
                                <motion.div
                                    key={i}
                                    {...fadeIn}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white p-6 relative group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">
                                        {i + 1}
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-3">{step.title}</h3>
                                    <p className="text-gray-500 font-light text-sm leading-relaxed">{step.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 bg-gray-50 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                        <div className="space-y-8">
                            <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
                                Votre prochain temps fort mérite cette exigence.
                            </h2>
                            <p className="text-xl text-gray-600 font-light leading-relaxed">
                                Un temps fort d'équipe est un moment trop précieux pour être laissé au hasard. Si vous cherchez une partenaire capable de porter votre projet avec rigueur, tout en y apportant un regard extérieur et un souffle nouveau, discutons-en simplement.
                            </p>

                            <div className="pt-8 space-y-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <span className="text-gray-700 font-medium">rhodia@nowme.fr</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <span className="text-gray-700 font-medium">Paris, France (Disponible partout)</span>
                                </div>
                            </div>
                        </div>

                        <motion.div
                            {...fadeIn}
                            transition={{ delay: 0.2 }}
                        >
                            <ProContactForm />
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Icons
function Target(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
    );
}

function Mail(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
    );
}
