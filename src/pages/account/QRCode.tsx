import React from 'react';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../lib/auth';
import { QrCode, Download, Share2 } from 'lucide-react';

export default function QRCode() {
  const { profile } = useAuth();

  const handleDownload = () => {
    const imgElement = document.querySelector('img[alt="QR Code"]') as HTMLImageElement;
    if (imgElement) {
      const link = document.createElement('a');
      link.href = imgElement.src;
      link.download = 'qr-code-nowme.png';
      link.click();
    } else {
      console.error("QR Code image not found");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mon QR Code Nowme',
          text: 'Voici mon QR code personnel Nowme !',
          url: window.location.href
        });
      } catch (error) {
        console.error('Erreur lors du partage:', error);
      }
    } else {
      alert("Le partage n'est pas supporté sur votre appareil.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Mon QR Code"
        description="Accédez à votre QR code personnel Nowme."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Mon QR Code personnel
            </h1>
            <p className="text-gray-600">
              Présentez ce QR code chez nos partenaires pour profiter de vos avantages
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl shadow-lg inline-block mb-8">
            {profile?.qr_code ? (
              <img
                src={profile.qr_code}
                alt="QR Code"
                className="w-64 h-64"
              />
            ) : (
              <p className="text-gray-500">Aucun QR Code disponible. Veuillez contacter le support.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              Télécharger
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center px-6 py-3 rounded-full bg-white text-primary border-2 border-primary hover:bg-primary/5 transition-colors"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Partager
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-2xl shadow-soft p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Comment utiliser mon QR Code ?
          </h2>
          <ol className="space-y-4">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </span>
              <p className="text-gray-600">
                Téléchargez ou prenez une capture d'écran de votre QR code
              </p>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </span>
              <p className="text-gray-600">
                Présentez-le à l'accueil de nos établissements partenaires
              </p>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </span>
              <p className="text-gray-600">
                Profitez de vos réductions et avantages exclusifs !
              </p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
