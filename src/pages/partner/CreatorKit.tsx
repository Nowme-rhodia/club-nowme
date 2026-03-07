import React from 'react';
import {
    Star,
    Download,
    Share2,
    Copy,
    CheckCircle2,
    Heart,
    Image as ImageIcon,
    MessageCircle,
    Video
} from 'lucide-react';

export default function CreatorKit() {
    const [copied, setCopied] = React.useState(false);
    const shareLink = "https://club.nowme.fr/abonnement";

    const handleCopy = () => {
        navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-4 flex items-center gap-3">
                    <Star className="w-6 h-6 text-yellow-500" />
                    Mon Kit Créatrice
                </h1>
                <p className="mt-4 text-gray-600">
                    Retrouve ici tout ce dont tu as besoin pour communiquer sur le Club Nowme.
                    Des visuels prêts à l'emploi, des vidéos d'ambiance et des idées de textes.
                </p>
            </div>

            {/* TON LIEN IMPORTANT */}
            <section className="bg-primary/5 rounded-2xl p-6 border border-primary/20">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    Le lien à partager (Important 🚨)
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                    Pour que l'on puisse tracer tes ventes, tes abonnées DOIVENT cliquer sur ce lien
                    ET entrer ton code promo personnel (disponible sur ton Dashboard) au moment du paiement.
                </p>
                <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200">
                    <code className="text-primary font-bold flex-1">{shareLink}</code>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors text-sm font-medium"
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copié !' : 'Copier'}
                    </button>
                </div>
            </section>

            {/* LES VISUELS PRÊTS À L'EMPLOI */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-gray-700" />
                    Les visuels libres de droits
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition-shadow">
                        <Video className="w-8 h-8 text-primary mx-auto mb-4" />
                        <h3 className="font-bold mb-2">Dossier Drive (Vidéos B-Roll)</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Des petites vidéos d'ambiance 100% féminines à utiliser en fond de tes Stories ou Reels.
                        </p>
                        <a
                            href="https://drive.google.com/drive/folders/1w7X7m_Y_mbs8fK1-2pM_y__y-T_T--xL?usp=sharing"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
                        >
                            <Download className="w-4 h-4" /> Accéder au Drive
                        </a>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:shadow-md transition-shadow">
                        <ImageIcon className="w-8 h-8 text-blue-500 mx-auto mb-4" />
                        <h3 className="font-bold mb-2">Templates Canva (Photos)</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Des templates de Posts et Stories faciles à modifier avec tes propres couleurs ou photos.
                        </p>
                        <a
                            href="#" // TODO: Remplacer par le lien réel Canva
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
                        >
                            <Download className="w-4 h-4" /> Ouvrir sur Canva
                        </a>
                    </div>
                </div>
            </section>

            {/* ARGUMENTAIRE / PSYCHOLOGIE */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-gray-700" />
                    Les angles d'attaque qui marchent le mieux
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                    Voici directement les arguments psychologiques testés et validés par Nowme.
                    Choisis celui qui te correspond le mieux pour convaincre ton audience.
                </p>

                <div className="space-y-6">
                    <div className="border-l-4 border-primary pl-4">
                        <h3 className="font-bold text-gray-900 mb-1">🔥 L'angle "Autorité / N°1"</h3>
                        <p className="text-sm text-gray-800 mb-2 font-medium">Titre idéal : "Rejoins le Club n°1 des femmes qui kiffent en IDF"</p>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">Pourquoi ça marche :</span> Ça rassure. On n'achète pas un test, on rejoint le leader du marché. L'effet "preuve sociale".
                        </p>
                    </div>

                    <div className="border-l-4 border-yellow-400 pl-4">
                        <h3 className="font-bold text-gray-900 mb-1">💸 L'angle "Valeur Immédiate / Rentabilité"</h3>
                        <p className="text-sm text-gray-800 mb-2 font-medium">Titre idéal : "Tes sorties à prix Club (jusqu'à -50%)"</p>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">Pourquoi ça marche :</span> C'est un argument rationnel imbattable. L'abonnement devient un vrai investissement qui se rentabilise dès la première sortie.
                        </p>
                    </div>

                    <div className="border-l-4 border-pink-400 pl-4">
                        <h3 className="font-bold text-gray-900 mb-1">💕 L'angle "Émotionnel / Bande de Copines"</h3>
                        <p className="text-sm text-gray-800 mb-2 font-medium">Titre idéal : "Retrouve l'énergie d'une vraie bande de copines"</p>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">Pourquoi ça marche :</span> Ça touche le cœur du besoin fondamental : le lien social bienveillant après 30 ans, sans utiliser de mots trop froids.
                        </p>
                    </div>
                </div>
            </section>

            {/* BONNES PRATIQUES */}
            <section className="bg-gray-900 text-white rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-primary" />
                    Les 3 règles d'or d'une bonne Story
                </h2>
                <ul className="space-y-6">
                    <li className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                        <div>
                            <p className="font-bold mb-1">Face Caméra (Authenticité)</p>
                            <p className="text-sm text-gray-300">Concentre-toi sur toi. Parle de ton propre kiff et de la façon dont le Club a changé (ou va changer) tes week-ends.</p>
                        </div>
                    </li>
                    <li className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                        <div>
                            <p className="font-bold mb-1">Clarté du CTA</p>
                            <p className="text-sm text-gray-300">Ne donne qu'une seule action : "Clique sur le lien et mets mon code [TON CODE] pour avoir -10% direct !".</p>
                        </div>
                    </li>
                    <li className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                        <div>
                            <p className="font-bold mb-1">Répétition</p>
                            <p className="text-sm text-gray-300">Une seule Story ne suffit pas. L'idéal est d'en parler 2 à 3 fois dans le mois de manière fluide.</p>
                        </div>
                    </li>
                </ul>
            </section>
        </div>
    );
}
