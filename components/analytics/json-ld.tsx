export function RestaurantJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: "Ur' Shawarma Express",
    description: 'Order the best tasting Nigerian-style shawarma delivered fresh to your doorstep in Awka. Fast delivery in 30 minutes!',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    image: `${baseUrl}/og-image.png`,
    telephone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '',
    email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || 'Awka',
      addressLocality: 'Awka',
      addressRegion: 'Anambra',
      addressCountry: 'NG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: process.env.NEXT_PUBLIC_BUSINESS_LAT || '6.2106',
      longitude: process.env.NEXT_PUBLIC_BUSINESS_LNG || '7.0742',
    },
    priceRange: '₦₦',
    servesCuisine: ['Nigerian', 'Shawarma', 'Fast Food', 'African'],
    acceptsReservations: false,
    hasDeliveryMethod: {
      '@type': 'DeliveryMethod',
      name: 'Home Delivery',
    },
    areaServed: {
      '@type': 'City',
      name: 'Awka',
      containedInPlace: {
        '@type': 'State',
        name: 'Anambra',
      },
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '10:00',
        closes: '22:00',
      },
    ],
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: baseUrl,
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: ['http://purl.org/goodrelations/v1#DeliveryModeOwnFleet'],
    },
    sameAs: [
      process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
      process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
      process.env.NEXT_PUBLIC_TWITTER_URL || '',
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function WebsiteJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: "Ur' Shawarma Express",
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/menu?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function LocalBusinessJsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/#localbusiness`,
    name: "Ur' Shawarma Express",
    image: `${baseUrl}/og-image.png`,
    url: baseUrl,
    telephone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || 'Awka',
      addressLocality: 'Awka',
      addressRegion: 'Anambra',
      postalCode: '',
      addressCountry: 'NG',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
