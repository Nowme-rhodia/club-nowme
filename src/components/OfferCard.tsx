import React from 'react';
import { MapPin, Star, Lock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface OfferCardProps {
  id: string;
  title: string;
  description: string;
  location: string | { lat: number; lng: number; address?: string };
  price: number;
  promoPrice?: number;
  imageUrl: string;
  rating: number; // Kept for interface compatibility but not displayed
  category: string;
  badge?: string;
  partnerName?: string;
  promoConditions?: string;
  bookingType?: string;
  date?: string;
}

export function OfferCard({
  id,
  title,
  description,
  location,
  price,
  promoPrice,
  imageUrl,
  rating,
  category,
  badge,
  partnerName,
  promoConditions,
  bookingType,
  date
}: OfferCardProps) {
  const { user, isSubscriber, isPartner, isAdmin } = useAuth();
  const hasAccess = isSubscriber || isPartner || isAdmin || (user?.email === 'rhodia@nowme.fr');

  const discount = promoPrice ? Math.round(((price - promoPrice) / price) * 100) : 0;

  const displayLocation = typeof location === 'string'
    ? location
    : (location.address || 'Paris');

  // Format date if present
  const formattedDate = date ? new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  }) : null;

  return (
    <Link
      to={`/offres/${id}`}
      className="group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl block h-full flex flex-col"
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden shrink-0">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Date Badge (Top Left) */}
        {formattedDate && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-lg shadow-sm flex flex-col items-center leading-tight min-w-[50px] border border-gray-100">
              <span className="text-xs font-semibold uppercase text-red-500">{new Date(date!).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
              <span className="text-xl font-bold">{new Date(date!).getDate()}</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
          {badge && (
            <div className="bg-white/90 backdrop-blur-sm text-primary px-3 py-1.5 rounded-full font-semibold text-xs shadow-sm uppercase tracking-wider">
              {badge}
            </div>
          )}
          {promoPrice && (
            <div className="bg-primary text-white px-3 py-1.5 rounded-full font-semibold text-sm shadow-lg">
              -{discount}%
            </div>
          )}
        </div>

        {/* Helper overlay for non-access */}
        {!hasAccess && (
          <div className="absolute top-4 left-4">
            <div className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-full font-semibold text-xs shadow-sm flex items-center gap-1">
              <Lock className="w-3 h-3" /> Réservé membre
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2">
          {partnerName && (
            <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1 transition-all duration-300">
              {partnerName}
            </div>
          )}
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2 leading-tight">{title}</h3>
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 mb-3 flex-1">{description.replace(/<[^>]+>/g, '')}</p>

        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {displayLocation}
          </span>
        </div>

        <div className="flex items-end justify-between mt-auto gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {category}
            </div>

            <div className="flex flex-col gap-1 items-baseline">
              {/* Badges container */}
              <div className="flex flex-wrap gap-2 mb-2">
                {/* Theme Badge */}
                <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  🏷️ {category || 'Événement'}
                </span>

                {/* Department Badge */}
                {displayLocation && displayLocation.match(/\b(97|2A|2B|[0-9]{2})[0-9]{3}\b/) && (
                  <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                    📍 {displayLocation.match(/\b(97|2A|2B|[0-9]{2})[0-9]{3}\b/)?.[1]}
                  </span>
                )}

                {/* Wallet Pack Badge */}
                {bookingType === 'wallet_pack' && (
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                    💳 Pack Ardoise
                  </span>
                )}
              </div>

              {bookingType === 'promo' && promoConditions ? (
                <span className="text-lg font-bold text-pink-600 break-words leading-tight">
                  {promoConditions}
                </span>
              ) : promoPrice ? (
                <div className="flex flex-col items-start gap-0.5">
                  {/* Prix Public */}
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                    <span>Public :</span>
                    <span className="line-through decoration-red-400 decoration-2 font-medium">{price}€</span>
                  </div>

                  {/* Prix Club */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      Club
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-primary drop-shadow-sm">
                      {promoPrice}€
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-900">{price}€</span>
              )}
            </div>
          </div>

          <div className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 group-hover:shadow-md whitespace-nowrap shrink-0 ${!hasAccess
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-primary text-white group-hover:bg-primary-dark'
            }`}>
            {hasAccess ? 'Réserver' : "Voir l'offre"}
          </div>
        </div>
      </div>
    </Link>
  );
}
