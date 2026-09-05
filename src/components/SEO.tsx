import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FAQItem, ServiceItem } from '../types';

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  type?: 'website' | 'article' | 'service' | 'product';
  schemaType?: 'LocalBusiness' | 'Service' | 'FAQPage' | 'Breadcrumbs' | 'Product';
  customSchema?: object;
  faqs?: FAQItem[];
  services?: ServiceItem[];
  businessPhone?: string;
  businessAddress?: {
    suite: string;
    street: string;
    neighborhood: string;
    city: string;
  };
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl = 'https://theiconsbarber.co.ke/',
  ogImage = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop',
  type = 'website',
  schemaType,
  customSchema,
  faqs,
  services,
  businessPhone,
  businessAddress
}) => {
  const baseTitle = 'The Icons Barber & Spa';
  const fullTitle = title ? `${title} | ${baseTitle}` : `${baseTitle} | Luxury Men's Grooming & Spa in Nairobi`;
  const defaultDesc = "Experience bespoke haircuts, luxury hot towel beard grooming, and rejuvenating spa treatments at The Icons Barber & Spa. Nairobi's premier gentlemen's grooming destination. Book online.";
  const metaDescription = description || defaultDesc;

  // Build Structured Data
  let structuredData: any;

  if (customSchema) {
    structuredData = customSchema;
  } else if (schemaType === 'FAQPage') {
    structuredData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": (faqs || []).map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  } else {
    structuredData = {
      "@context": "https://schema.org",
      "@type": ["BarberShop", "HealthAndBeautyBusiness", "LocalBusiness"],
      "name": "The Icons Barber & Spa",
      "image": ogImage,
      "description": metaDescription,
      "url": "https://theiconsbarber.co.ke",
      ...(businessPhone ? { "telephone": businessPhone } : {}),
      ...(businessAddress ? {
        "address": {
          "@type": "PostalAddress",
          "streetAddress": `${businessAddress.suite}, ${businessAddress.street}`,
          "addressLocality": businessAddress.neighborhood,
          "addressRegion": businessAddress.city,
          "postalCode": "00100",
          "addressCountry": "KE"
        }
      } : {}),
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": -1.291771,
        "longitude": 36.787682
      },
      ...(services && services.length > 0 ? {
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Barber & Spa Grooming Services",
          "itemListElement": services.map((s, index) => ({
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": s.name,
              "description": s.shortDescription
            },
            "price": s.priceKsh,
            "priceCurrency": "KES",
            "position": index + 1
          }))
        }
      } : {})
    };
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};