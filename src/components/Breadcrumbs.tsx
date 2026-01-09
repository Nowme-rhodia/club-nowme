import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export interface BreadcrumbItem {
    label: string;
    path?: string; // If no path, it's the current page (text only)
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    // Helper to generate JSON-LD
    const generateJsonLd = () => {
        const breadcrumbList = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Accueil",
                    "item": "https://club.nowme.fr/"
                },
                ...items.map((item, index) => ({
                    "@type": "ListItem",
                    "position": index + 2,
                    "name": item.label,
                    "item": item.path ? `https://club.nowme.fr${item.path}` : undefined
                }))
            ]
        };
        return JSON.stringify(breadcrumbList);
    };

    return (
        <nav aria-label="Breadcrumb" className={`text-sm text-gray-500 mb-6 ${className}`}>
            <Helmet>
                <script type="application/ld+json">
                    {generateJsonLd()}
                </script>
            </Helmet>
            <ol className="list-none p-0 inline-flex items-center flex-wrap gap-2">
                <li className="flex items-center">
                    <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        <span className="sr-only">Accueil</span>
                    </Link>
                </li>
                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
                        {item.path ? (
                            <Link to={item.path} className="hover:text-primary transition-colors font-medium">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-gray-900 font-semibold truncate max-w-[200px] sm:max-w-xs" title={item.label}>
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
