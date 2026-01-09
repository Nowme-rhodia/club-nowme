import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
}

export const SEO = ({ title, description, canonical, image }: SEOProps) => {
  const siteTitle = 'Nowme - Ton kiff au féminin';
  const fullTitle = `${title} | ${siteTitle}`;
  const defaultImage = 'https://i.imgur.com/or3q8gE.png';
  const siteUrl = 'https://club.nowme.fr';

  // Clean canonical: Remove query params
  const cleanCanonical = canonical ? canonical.split('?')[0] : siteUrl;

  return (
    <Helmet>
      {/* Balises de base */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={cleanCanonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image || defaultImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={cleanCanonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || defaultImage} />

      {/* Canonical URL */}
      {cleanCanonical && <link rel="canonical" href={cleanCanonical} />}

      {/* Autres méta-données importantes */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#BF2778" />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="fr" />
    </Helmet>
  );
};