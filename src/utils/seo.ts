import { BUSINESS_INFO, INITIAL_SERVICES, INITIAL_FAQS } from '../data/initialData';

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  type?: 'website' | 'article' | 'service' | 'product';
  schemaType?: 'LocalBusiness' | 'Service' | 'FAQPage' | 'Breadcrumbs' | 'Product';
  customSchema?: object;
}

export function updatePageSEO({
  title,
  description,
  canonicalUrl = 'https://theiconsbarber.co.ke/',
  ogImage = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop',
  type = 'website',
  schemaType,
  customSchema
}: SEOProps) {
  // Update Title
  const baseTitle = 'The Icons Barber & Spa';
  const fullTitle = title ? `${title} | ${baseTitle}` : `${baseTitle} | Luxury Men's Grooming & Spa in Nairobi`;
  document.title = fullTitle;

  // Update Meta Description
  const defaultDesc = "Experience bespoke haircuts, luxury hot towel beard grooming, and rejuvenating spa treatments at The Icons Barber & Spa. Nairobi's premier gentlemen's grooming destination. Book online.";
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description || defaultDesc);
  }

  // Update Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', fullTitle);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description || defaultDesc);

  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg) ogImg.setAttribute('content', ogImage);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

  const ogType = document.querySelector('meta[property="og:type"]');
  if (ogType) ogType.setAttribute('content', type);

  // Canonical tag
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonicalUrl;

  // Structured Data (JSON-LD)
  let scriptTag = document.getElementById('json-ld-structured-data') as HTMLScriptElement | null;
  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.id = 'json-ld-structured-data';
    scriptTag.type = 'application/ld+json';
    document.head.appendChild(scriptTag);
  }

  let structuredData: object;

  if (customSchema) {
    structuredData = customSchema;
  } else if (schemaType === 'FAQPage') {
    structuredData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": INITIAL_FAQS.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  } else {
    // Default: LocalBusiness / BarberShop Schema
    structuredData = {
      "@context": "https://schema.org",
      "@type": ["BarberShop", "HealthAndBeautyBusiness", "LocalBusiness"],
      "name": BUSINESS_INFO.name,
      "image": ogImage,
      "description": description || defaultDesc,
      "url": "https://theiconsbarber.co.ke",
      "telephone": BUSINESS_INFO.phone,
      "priceRange": "KSh 1,200 - KSh 6,500",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": `${BUSINESS_INFO.address.suite}, ${BUSINESS_INFO.address.street}`,
        "addressLocality": BUSINESS_INFO.address.neighborhood,
        "addressRegion": BUSINESS_INFO.address.city,
        "postalCode": "00100",
        "addressCountry": "KE"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": -1.291771,
        "longitude": 36.787682
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "07:30",
          "closes": "20:30"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Saturday"],
          "opens": "07:30",
          "closes": "21:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Sunday"],
          "opens": "09:00",
          "closes": "19:00"
        }
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Barber & Spa Grooming Services",
        "itemListElement": INITIAL_SERVICES.map((s, index) => ({
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
    };
  }

  scriptTag.textContent = JSON.stringify(structuredData);
}
