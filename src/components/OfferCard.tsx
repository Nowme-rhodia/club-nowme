import React from 'react';
import { MapPin, Star, Lock } from 'lucide-react';
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
  bookingType
}: OfferCardProps) {
  const { user, isSubscriber, isPartner, isAdmin } = useAuth();
  const hasAccess = isSubscriber || isPartner || isAdmin || (user?.email === 'rhodia@nowme.fr');

  const discount = promoPrice ? Math.round(((price - promoPrice) / price) * 100) : 0;

  const displayLocation = typeof location === 'string'
    ? location
    : (location.address || 'Paris');

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
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
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
            <div className={`text-xs font-semibold text-primary uppercase tracking-wide mb-1 transition-all duration-300 ${!hasAccess ? 'filter blur-[5px] select-none opacity-50 contrast-125' : ''}`}>
              {hasAccess ? partnerName : 'Partenaire Secret A'}
            </div>
          )}
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2 leading-tight">{title}</h3>
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 mb-3 flex-1">{description}</p>

        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className={`truncate ${!hasAccess ? 'filter blur-[5px] select-none opacity-40' : ''}`}>
            {displayLocation}
          </span>
        </div>

        <div className="flex items-end justify-between mt-auto gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {category}
            </div>

            {/* Price display logic */}
            <div className={`flex items-baseline gap-2 ${!hasAccess ? 'filter blur-[5px] select-none opacity-50' : ''}`}>
              {bookingType === 'promo' && promoConditions ? (
                <span className="text-lg font-bold text-pink-600 break-words leading-tight">
                  {promoConditions}
                </span>
              ) : promoPrice ? (
                <>
                  <span className="text-xl font-bold text-primary">
                    {promoPrice}€
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {price}€
                  </span>
                </>
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
