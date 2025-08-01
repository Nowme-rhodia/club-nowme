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
      {Array.isArray(offers) && offers.map((offer) => (
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
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-gray-900">{offer.title}</h3>
              {offer.isFeatured && (
                <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  <Star className="w-4 h-4 inline mr-1" /> Coup de cœur
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">{offer.description}</p>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-1" /> {offer.location}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}