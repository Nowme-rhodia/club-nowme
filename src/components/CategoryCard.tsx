import React from 'react';
import * as Icons from 'lucide-react';
import type { Category } from '../data/categories';
import { Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CategoryCardProps {
  category: Category;
  highlightTerm?: string;
}

export function CategoryCard({ category, highlightTerm }: CategoryCardProps) {
  const navigate = useNavigate();
  const IconComponent = category.icon && (Icons[category.icon as keyof typeof Icons] as React.ComponentType);
  const FinalIcon = IconComponent || Folder;

  const handleCardClick = () => {
    navigate(`/tous-les-kiffs?category=${category.slug}`);
  };

  const handleSubcategoryClick = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/tous-les-kiffs?category=${category.slug}&subcategory=${slug}`);
  };

  const highlightText = (text: string) => {
    if (!highlightTerm?.trim()) return text;

    const parts = text.split(new RegExp(`(${highlightTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlightTerm?.toLowerCase() ? (
            <span key={i} className="bg-primary/20 text-primary font-medium rounded px-1">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      className="card-border group h-full cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="p-4 sm:p-5 bg-white rounded-lg shadow-soft transition-all duration-500 ease-in-out hover:shadow-hover h-full flex flex-col">
        <div className="flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-5">
          <div className="p-2 sm:p-2.5 rounded-md bg-primary/10 transition-all duration-300 ease-in-out group-hover:scale-110 shrink-0">
            <FinalIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary transition-all duration-300 ease-in-out" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight transition-colors duration-300 ease-in-out group-hover:text-primary">
            {highlightText(category.name)}
          </h2>
        </div>
        {category.description && (
          <p className="text-gray-600 mb-4 sm:mb-5 text-sm leading-relaxed">
            {highlightText(category.description)}
          </p>
        )}
        <div className="h-px mb-4 sm:mb-5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"></div>
        <ul className="space-y-2.5 sm:space-y-3.5 flex-grow">
          {Array.isArray(category.subcategories) && category.subcategories.map((subcategory) => (
            <li
              key={subcategory.slug}
              onClick={(e) => handleSubcategoryClick(subcategory.slug, e)}
              className="subcategory-item flex items-center text-gray-600 text-sm transition-all duration-300 ease-in-out hover:text-gray-900 group/item cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary/40 mr-2 sm:mr-3 transition-all duration-300"></span>
              <span className="font-medium tracking-wide">
                {highlightText(subcategory.name)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
