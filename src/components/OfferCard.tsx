import React from 'react';
import { MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OfferCardProps {
  id: string;
  title: string;
  description: string;
  location: string | { lat: number; lng: number };
  price: number;
  promoPrice?: number;
  imageUrl: string;
  rating: number;
  category: string;
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
}: OfferCardProps) {
  const discount = promoPrice ? Math.round(((price - promoPrice) / price) * 100) : 0;
  
  // Si location est un objet avec lat/lng, on affiche juste "Paris"
  const displayLocation = typeof location === 'string' ? location : 'Paris';

  return (
    <Link 
      to={`/offres/${id}`}
      className="group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl block"
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {promoPrice && (
          <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1.5 rounded-full font-semibold text-sm shadow-lg">
            -{discount}%
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2">{title}</h3>
          <div className="flex items-center gap-1 text-yellow-500 shrink-0">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
          </div>
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{description}</p>

        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <MapPin className="w-4 h-4" />
          <span>{displayLocation}</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {category}
            </div>
            <div className="flex items-baseline gap-2">
              {promoPrice ? (
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
          <div className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium transition-all duration-300 group-hover:bg-primary-dark group-hover:shadow-md">
            Réserver
          </div>
        </div>
      </div>
    </Link>
  );
}