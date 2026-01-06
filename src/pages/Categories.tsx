import React from 'react';
import { categories } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';
import { WaveDecoration } from '../components/WaveDecoration';
import { SEO } from '../components/SEO';

export default function Categories() {
  return (
    <div className="relative">
      <SEO
        title="Catégories"
        description="Découvrez toutes nos catégories d'activités et trouvez votre prochain kiff !"
      />

      <div className="absolute inset-x-0 top-0 h-72 pointer-events-none">
        <WaveDecoration />
      </div>

      <div className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
              Trouve ton <span className="text-primary-light">kiff</span>
            </h1>
            <div className="relative z-10 inline-block px-8 py-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg">
              <p className="text-primary font-semibold animate-fade-in max-w-2xl mx-auto text-base sm:text-lg">
                Découvre notre sélection de services et d'activités pour enrichir ton quotidien
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 auto-rows-fr">
            {categories.map((category, index) => (
              <div
                key={category.slug}
                className="animate-slide-up"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <CategoryCard
                  category={category}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}