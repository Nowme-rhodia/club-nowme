import React from 'react';
import { Link } from 'react-router-dom';
import { Offer } from '../data/offers';
import { MapPin, Star } from 'lucide-react';

interface SimilarOffersProps {
  currentOfferId: string;
  offers: Offer[];
}

export function SimilarOffers({ currentOfferId, offers }: SimilarOffersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {offers.map((offer) => (
        <Link
          key={offer.id}
          to={`/offres/${offer.id}`}
          className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="aspect-[3/2] overflow-hidden">
            <img
              src={offer.imageUrl}
              alt={offer.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-gray-900 line-clamp-1">{offer.title}</h3>
              <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm">{offer.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{offer.location}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}