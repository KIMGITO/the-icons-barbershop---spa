import { ServiceItem, BarberProfile, GalleryItem, FAQItem, BusinessInfo, BookingRecord, ProductItem } from '../types';

export const BUSINESS_INFO: BusinessInfo = {
  name: "The Icons Barber & Spa",
  tagline: "Premium Grooming & Spa Sanctuary for the Modern Gentleman",
  address: {
    street: "Kiambu Road",
    suite: "Four Ways Village",
    neighborhood: "Four Ways Junction",
    city: "Nairobi",
    country: "Kenya",
    mapsEmbedUrl: "https://www.google.com/maps/place//@-1.2151384,36.8279065,15.25z/data=!4m6!1m5!3m4!2zMcKwMTInNDUuNSJTIDM2wrA1MCcxMS4zIkU!8m2!3d-1.2126399!4d36.836479?entry=ttu&g_ep=EgoyMDI2MDgyNC4wIKXMDSoASAFQAw%3D%3D",
    directionsUrl: "https://maps.google.com/?q=-1.2126399133414822,36.83647898036734",
  },
  phone: "+254743952173",
  phoneDisplay: "+254 743 952 173",
  whatsapp: "+254743952173",
  whatsappUrl: "https://wa.me/254743952173?text=Hello%20The%20Icons%20Barber%20%26%20Spa%2C%20I%20would%20like%20to%20book%20an%20appointment.",
  email: "info@theiconsbarber.co.ke",
  hours: {
    weekdays: "08:00 AM – 08:30 PM",
    saturday: "08:30 AM – 09:00 PM",
    sunday: "09:00 AM – 08:00 PM"
  }
};

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: "serv-1",
    slug: "classic-haircut",
    name: "Classic Icon Haircut",
    category: "haircut",
    shortDescription: "Precision master haircut tailored to your head profile, hair texture, and signature style.",
    fullDescription: "Our signature haircut experience begins with a thorough personal consultation, assessing facial geometry and hair density. Includes an invigorating organic peppermint scalp wash, bespoke precision scissor and clipper work, neck taper, and hot towel neck finish with artisanal aftershave tonic.",
    durationMinutes: 45,
    priceKsh: 1500,
    features: [
      "Personal style & hair density consultation",
      "Precision shear & clipper sculpting",
      "Organic shampoo & scalp stimulation",
      "Straight razor neck cleanup",
      "Steamed hot towel & gold aftershave balm"
    ],
    imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
    isPopular: true,
    recommendedFor: "Gentlemen seeking timeless precision and crisp styling."
  },
  {
    id: "serv-2",
    slug: "skin-fade-taper",
    name: "Executive Skin Fade & Taper",
    category: "haircut",
    shortDescription: "Flawless low, mid, or high fade with seamless blend and razor-sharp perimeter alignment.",
    fullDescription: "Engineered for uncompromising sharpness. Our master faders use foil shavers and multi-guard clippers to create a gradient from skin to length. Finished with sharp contour lining and matte or sheen styling pomade.",
    durationMinutes: 50,
    priceKsh: 1800,
    features: [
      "Custom fade elevation (Low, Mid, High, or Drop)",
      "Zero-gap foil shaver skin transition",
      "Crisp perimeter blade alignment",
      "Post-fade scalp cooling mist",
      "Texturizing styling & finish"
    ],
    imageUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=800&auto=format&fit=crop",
    isPopular: true,
    recommendedFor: "Modern professionals desiring clean, razor-sharp gradient cuts."
  },
  {
    id: "serv-3",
    slug: "beard-grooming",
    name: "Royal Hot Towel Beard Sculpting",
    category: "beard",
    shortDescription: "Complete beard shaping, organic oil steam infusion, and sharp straight-razor detailing.",
    fullDescription: "A multi-step ritual dedicated to facial hair excellence. Features beard volume balancing, free-hand trimming, botanical oil deep-conditioning under warm therapeutic steam towels, and razor-sharp cheek and jawline edging.",
    durationMinutes: 40,
    priceKsh: 1200,
    features: [
      "Facial symmetry & length trimming",
      "Double essential-oil hot towel steam",
      "Jojoba & Argan beard hydration massage",
      "Cut-throat straight razor edge alignment",
      "Gold sheen conditioning balm finish"
    ],
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800&auto=format&fit=crop",
    isPopular: true,
    recommendedFor: "Gentlemen cultivating a sharp, nourished, and well-defined beard."
  },
  {
    id: "serv-4",
    slug: "hair-spa",
    name: "Moroccan Scalp Detox & Hair Spa",
    category: "spa",
    shortDescription: "Deep follicle exfoliation, herbal clay therapy, and tension-relieving acupressure scalp massage.",
    fullDescription: "Revitalize exhausted scalp and hair roots. Combines organic Moroccan rhassoul clay, botanical steam mist, and a 20-minute acupressure head and temple massage to eliminate buildup, stimulate blood circulation, and nourish hair follicles.",
    durationMinutes: 50,
    priceKsh: 2800,
    features: [
      "Micro-exfoliating scalp scrub",
      "Herbal clay deep follicle treatment",
      "Warm therapeutic steam hood infusion",
      "20-minute acupressure scalp & neck massage",
      "Keratin & vitamin root nourishment tonic"
    ],
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop",
    isPopular: false,
    recommendedFor: "Combating scalp dryness, stress, hair thinning, or product buildup."
  },
  {
    id: "serv-5",
    slug: "executive-facial",
    name: "Gentleman's Charcoal Purifying Facial",
    category: "spa",
    shortDescription: "Targeted men's skincare treatment to unclog pores, eliminate blackheads, and soothe razor irritation.",
    fullDescription: "Formulated specifically for men's skin profile. Includes deep ultrasound cleansing, active bamboo charcoal pore vacuuming, hot eucalyptus towel compression, and a cooling hyaluronic hydration mask.",
    durationMinutes: 45,
    priceKsh: 3200,
    features: [
      "Deep ultrasonic pore extraction",
      "Active charcoal detoxifying mask",
      "Eucalyptus & tea tree warm compresses",
      "Ingrown hair treatment & prevention",
      "SPF & anti-fatigue moisturizer seal"
    ],
    imageUrl: "https://images.unsplash.com/photo-1512290900672-1f5be6343516?q=80&w=800&auto=format&fit=crop",
    isPopular: false,
    recommendedFor: "Men combating urban pollution, oily skin, or razor bumps."
  },
  {
    id: "serv-6",
    slug: "the-ceo-experience",
    name: "The CEO Signature Experience",
    category: "packages",
    shortDescription: "The ultimate 100-minute head-to-toe grooming ritual in our private executive VIP suite.",
    fullDescription: "Our flagship VIP package crafted for high-impact leaders. Includes precision master haircut, royal hot towel beard sculpting, scalp detox massage, express clarifying facial, and complimentary single-malt scotch or artisanal espresso in our soundproof VIP chamber.",
    durationMinutes: 100,
    priceKsh: 6500,
    features: [
      "Private VIP Suite reservation",
      "Master Haircut & precision fade",
      "Royal Hot Towel Beard Sculpting",
      "Scalp Detox Therapy & Neck massage",
      "Express facial & hot stones shoulder ease",
      "Complimentary private lounge bar beverage"
    ],
    imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop",
    isPopular: true,
    recommendedFor: "Special events, weddings, executive meetings, or monthly self-mastery."
  },
  {
    id: "serv-7",
    slug: "father-and-son",
    name: "The Icons Legacy (Father & Son)",
    category: "packages",
    shortDescription: "Side-by-side simultaneous luxury haircuts for father and young gentleman.",
    fullDescription: "A bonding ritual rooted in timeless tradition. Two dedicated master barbers attend to father and son simultaneously, delivering tailored cuts, refreshing hair washes, and signature styling with soft beverages.",
    durationMinutes: 60,
    priceKsh: 2800,
    features: [
      "Two master barbers side-by-side",
      "1 Executive Adult Haircut + Wash",
      "1 Junior Icon Haircut + Fun Styling",
      "Complimentary beverage service",
      "Commemorative polaroid portrait"
    ],
    imageUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop",
    isPopular: false,
    recommendedFor: "Fathers wanting to pass down the ritual of grooming to their sons."
  },
  {
    id: "serv-8",
    slug: "royal-hot-lather-shave",
    name: "Traditional Straight Razor Hot Lather Shave",
    category: "beard",
    shortDescription: "Old-world barbering with rich warm lather, multiple hot towels, and Japanese steel precision.",
    fullDescription: "Experience the smoothest shave imaginable. Pre-shave sandalwood oil prep, three infused steaming towels, badger-hair brush lathering with luxury shaving soap, and a two-pass blade shave followed by cold witch hazel astringent and collagen balm.",
    durationMinutes: 45,
    priceKsh: 1600,
    features: [
      "Sandalwood pre-shave hydration barrier",
      "Triple infused hot towel treatment",
      "Warm badger-brush artisanal foam",
      "Two-pass Japanese straight razor shave",
      "Cold-towel pore closure & calming balm"
    ],
    imageUrl: "https://images.unsplash.com/photo-1532710093739-9470acff878f?q=80&w=800&auto=format&fit=crop",
    isPopular: false,
    recommendedFor: "Gentlemen who appreciate classic straight-razor smoothness."
  }
];

export const INITIAL_BARBERS: BarberProfile[] = [
  {
    id: "barber-1",
    slug: "samuel-king-mwangi",
    name: "Samuel Mwangi",
    title: "Lead Master Barber & Founder",
    specialty: "Executive Scissor Work & Skin Fades",
    bio: "With over 11 years perfecting men's grooming across Nairobi and London, Samuel is renowned for his surgical clipper precision and anatomical head-shape tailoring. He has styled high-profile executives, athletes, and creative directors.",
    yearsExperience: 11,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    quote: "A haircut is your visual business card. We don't just cut hair; we sculpt confidence.",
    servicesOfferedIds: ["serv-1", "serv-2", "serv-3", "serv-6", "serv-7"],
    instagramHandle: "@samuel.theicon"
  },
  {
    id: "barber-2",
    slug: "eric-omondi-blade",
    name: "James Mwangi",
    title: "Senior Beard Architect & Hot Towel Specialist",
    specialty: "Beard Sculpting & Straight Razor Craft",
    bio: "A master of facial symmetry, Eric brings 8 years of dedicated straight-razor experience. His signature hot towel rituals and organic oil treatments transform coarse and unruly beards into sculpted works of art.",
    yearsExperience: 8,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
    workingDays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    quote: "Every beard tells a story. My job is to make sure yours speaks of power and refinement.",
    servicesOfferedIds: ["serv-1", "serv-3", "serv-6", "serv-8"],
    instagramHandle: "@eric.bladecraft"
  },
  {
    id: "barber-3",
    slug: "david-kiprono-spa",
    name: "David Njenga",
    title: "Head of Spa & Scalp Therapy",
    specialty: "Trichology, Scalp Detox & Acupressure",
    bio: "Certified in scalp health and therapeutic acupressure massage, David specializes in rejuvenating overworked executives. He combines natural African botanicals with modern therapeutic massage techniques.",
    yearsExperience: 7,
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop",
    workingDays: ["Monday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    quote: "True grooming goes deeper than the surface. It is a moment of deep physical restoration.",
    servicesOfferedIds: ["serv-4", "serv-5", "serv-6"],
    instagramHandle: "@david.theiconsspa"
  },
  {
    id: "barber-4",
    slug: "brian-mutua-styling",
    name: "Brian Mutua",
    title: "Senior Stylist & Texture Specialist",
    specialty: "Afro Wave Artistry, Tapering & Color",
    bio: "Brian brings unmatched mastery in afro hair textures, 360 waves enhancement, subtle gray-blending color, and modern burst fades. Known for his keen eye for contemporary urban luxury aesthetics.",
    yearsExperience: 6,
    avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop",
    workingDays: ["Monday", "Tuesday", "Thursday", "Friday", "Saturday", "Sunday"],
    quote: "Precision is in the millimeters. That's what separates a good haircut from an iconic one.",
    servicesOfferedIds: ["serv-1", "serv-2", "serv-3", "serv-7"],
    instagramHandle: "@brian.iconcuts"
  },
  {
    id: "barber-5",
    slug: "lucas-vance-clippers",
    name: "Lucas Vance",
    title: "Master Fade & Line-Up Specialist",
    specialty: "Surgical Fades & Sharp Contour Lineups",
    bio: "Internationally trained in geometric contouring and low-drop skin fades. Lucas brings unrivaled speed and millimeter blade accuracy to every bespoke session.",
    yearsExperience: 9,
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop",
    workingDays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    quote: "A clean taper transforms a profile. Crisp lines build undeniable presence.",
    servicesOfferedIds: ["serv-1", "serv-2", "serv-3", "serv-8"],
    instagramHandle: "@lucas.vancecuts"
  },
  {
    id: "barber-6",
    slug: "elena-wambui-colorist",
    name: "Elena Wambui",
    title: "Senior Colorist & Royal Facialist",
    specialty: "Platinum Highlights, Gray Camouflage & Hydro Facials",
    bio: "Elena specializes in luxury men's hair toning, bespoke gray camouflage, and deep purifying pore facials with clinical organic botanicals.",
    yearsExperience: 8,
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop",
    workingDays: ["Monday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    quote: "Subtle enhancements speak the loudest. Elevated men's skincare and tones are art forms.",
    servicesOfferedIds: ["serv-4", "serv-5", "serv-6"],
    instagramHandle: "@elena.royalspa"
  }
];

export const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: "gal-1",
    title: "Precision Skin Fade with Clean Beard Transition",
    alt: "Precision skin fade haircut and sharp beard lineup at The Icons Barber in Kilimani Nairobi",
    category: "haircut",
    imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop",
    caption: "Low taper skin fade with seamless texture on top."
  },
  {
    id: "gal-2",
    title: "Executive Straight Razor Beard Shave Ritual",
    alt: "Master barber performing hot lather straight razor shave at The Icons Barber and Spa",
    category: "beard",
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1000&auto=format&fit=crop",
    caption: "Steamed hot towel and straight razor cheek lining."
  },
  {
    id: "gal-3",
    title: "The Icons VIP Studio Atmosphere",
    alt: "Luxury dark leather barber chairs and gold accents inside The Icons Barber and Spa studio",
    category: "interior",
    imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1000&auto=format&fit=crop",
    caption: "Handcrafted Italian leather grooming chairs and private suites."
  },
  {
    id: "gal-4",
    title: "Acupressure Scalp & Hair Spa Session",
    alt: "Relaxing deep scalp massage and botanical steam treatment in luxury spa room",
    category: "spa",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1000&auto=format&fit=crop",
    caption: "Scalp detox with essential Moroccan botanical oils."
  },
  {
    id: "gal-5",
    title: "Surgical Clipper Detail & Hairline Edge",
    alt: "Professional master barber carving sharp geometric hairline on client",
    category: "haircut",
    imageUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop",
    caption: "Micro-detailed line-up with zero-gap precision clippers."
  },
  {
    id: "gal-6",
    title: "Sterilized Professional Implements",
    alt: "Autoclave sterilized Japanese barber shears and gold trimming tools",
    category: "interior",
    imageUrl: "https://images.unsplash.com/photo-1512690459411-b9245aed614b?q=80&w=1000&auto=format&fit=crop",
    caption: "Hospital-grade sterilization for every single client implement."
  },
  {
    id: "gal-7",
    title: "Purifying Charcoal Men's Facial Treatment",
    alt: "Gentleman receiving organic charcoal facial treatment and hot towel cleanse",
    category: "spa",
    imageUrl: "https://images.unsplash.com/photo-1512290900672-1f5be6343516?q=80&w=1000&auto=format&fit=crop",
    caption: "Deep pore purification and ingrown hair soothing therapy."
  },
  {
    id: "gal-8",
    title: "The Master Barbers Craft Team",
    alt: "The Icons Barber and Spa team of professional groomers and spa specialists in Nairobi",
    category: "team",
    imageUrl: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?q=80&w=1000&auto=format&fit=crop",
    caption: "Our certified master barbers and wellness specialists."
  }
];

export const INITIAL_FAQS: FAQItem[] = [
  // Category: Appointments
  {
    id: "faq-1",
    question: "How do I book an appointment?",
    answer: "You can book directly via our online booking engine on this website in under 60 seconds. Simply select your desired grooming or spa service, choose your preferred master barber, pick a date and time slot, and enter your details for instant confirmation.",
    category: "Appointments",
    order: 1,
    isFeaturedOnHome: true,
    internalLink: { text: "Book an Appointment", url: "/services" }
  },
  {
    id: "faq-2",
    question: "Can I choose my preferred barber?",
    answer: "Yes, absolutely. You can select any of our certified master barbers based on their specialty (such as Samuel Mwangi for precision fades or Eric Omondi for hot towel beard sculpting). You may also choose 'Any Available Master' for earlier openings.",
    category: "Appointments",
    order: 2,
    isFeaturedOnHome: true,
    internalLink: { text: "View Master Barbers", url: "/barbers" }
  },
  {
    id: "faq-3",
    question: "How much deposit is required?",
    answer: "We do not charge an upfront deposit for standard single appointments booked online. For private VIP CEO packages or groups (e.g. groomsmen parties of 3+), our concierge will reach out via WhatsApp to confirm your slot.",
    category: "Payments",
    order: 3,
    isFeaturedOnHome: true,
    internalLink: { text: "Explore Services", url: "/services" }
  },
  {
    id: "faq-4",
    question: "Can I reschedule my appointment?",
    answer: "Yes. You can reschedule or cancel at no charge up to 2 hours before your scheduled appointment time by clicking the link in your booking confirmation email or messaging our concierge on WhatsApp (+254 712 345 678).",
    category: "Appointments",
    order: 4,
    isFeaturedOnHome: false
  },
  {
    id: "faq-5",
    question: "How early should I arrive?",
    answer: "We recommend arriving 5 to 10 minutes prior to your scheduled time. Enjoy a complimentary single-origin Kenyan pour-over coffee, cold brew, or sparkling mineral water in our executive lounge while your master barber prepares your dedicated station.",
    category: "Appointments",
    order: 5,
    isFeaturedOnHome: false
  },

  // Category: Payments
  {
    id: "faq-6",
    question: "What payment methods are accepted?",
    answer: "We accept Safaricom M-Pesa (Till & Paybill), Visa, Mastercard, American Express, Apple Pay, and Cash at checkout in our Kilimani studio.",
    category: "Payments",
    order: 6,
    isFeaturedOnHome: false
  },
  {
    id: "faq-7",
    question: "When do I pay the remaining balance?",
    answer: "Full payment is settled comfortably at our reception counter immediately following your finished grooming and styling session.",
    category: "Payments",
    order: 7,
    isFeaturedOnHome: false
  },

  // Category: Services
  {
    id: "faq-8",
    question: "How long does a haircut take?",
    answer: "Our signature haircuts typically take 45 to 60 minutes. This includes a pre-cut scalp and lifestyle consultation, precision shear or clipper sculpting, razor neck cleanup, hair wash, and professional blow-dry styling.",
    category: "Services",
    order: 8,
    isFeaturedOnHome: false,
    internalLink: { text: "View All Haircuts", url: "/services" }
  },
  {
    id: "faq-9",
    question: "What services are available?",
    answer: "We offer master haircuts, hot lather straight razor shaves, botanical beard sculpting, restorative scalp treatments, manicures, pedicures, and signature executive packages such as The CEO Experience.",
    category: "Services",
    order: 9,
    isFeaturedOnHome: false,
    internalLink: { text: "Explore Service Menu", url: "/services" }
  },
  {
    id: "faq-10",
    question: "Can I book multiple services?",
    answer: "Yes, you can combine multiple grooming and wellness treatments into a single visit. When booking, select all desired treatments and our system will allocate consecutive time slots with your designated master.",
    category: "Services",
    order: 10,
    isFeaturedOnHome: false
  },

  // Category: Barbers
  {
    id: "faq-11",
    question: "Can I choose a specific barber?",
    answer: "Every master barber at The Icons has a dedicated profile detailing their years of craftsmanship, signature specialties, and customer ratings. You can pick your specific barber whenever you reserve.",
    category: "Barbers",
    order: 11,
    isFeaturedOnHome: false,
    internalLink: { text: "Meet Our Team", url: "/barbers" }
  },
  {
    id: "faq-12",
    question: "What happens if my preferred barber is unavailable?",
    answer: "If your chosen artisan is fully booked on your preferred date, you can opt for another senior master of equivalent craft level, or contact our concierge via WhatsApp to be placed on our VIP priority standby list.",
    category: "Barbers",
    order: 12,
    isFeaturedOnHome: false
  },

  // Category: Products
  {
    id: "faq-13",
    question: "Can I purchase grooming products?",
    answer: "Yes, our curated line of botanical scalp clarifiers, argan beard oils, matte clays, and executive travel sets are available for direct purchase both online with doorstep delivery and at our Kilimani salon boutique.",
    category: "Products",
    order: 13,
    isFeaturedOnHome: false,
    internalLink: { text: "Browse Grooming Products", url: "/products" }
  },
  {
    id: "faq-14",
    question: "Are products available at the shop?",
    answer: "All products showcased in our digital apothecary are stocked at our Penthouse Suite. Your barber can demonstrate application techniques and recommend formulas tailored to your hair and skin profile.",
    category: "Products",
    order: 14,
    isFeaturedOnHome: false
  },

  // Category: Policies
  {
    id: "faq-15",
    question: "What happens if I cancel or miss my appointment?",
    answer: "We kindly request at least 2 hours advance notice for cancellations or rescheduling. For no-shows on private suites or group packages, a re-booking fee may apply to respect our artisans' reserved time.",
    category: "Policies",
    order: 15,
    isFeaturedOnHome: false
  },
  {
    id: "faq-16",
    question: "What hygiene and sterilization standards do you maintain?",
    answer: "We enforce clinical hospital-grade hygiene protocols. Metal clippers, guards, and shears undergo ultrasonic cleaning and autoclave sterilization between clients. Straight razor blades are strictly 100% single-use and disposed of in medical sharps containers.",
    category: "Policies",
    order: 16,
    isFeaturedOnHome: false
  }
];

export const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: "bk-101",
    referenceNumber: "ICN-7821",
    serviceIds: ["serv-1", "serv-3"],
    serviceNames: ["Classic Icon Haircut", "Royal Hot Towel Beard Sculpting"],
    barberId: "barber-1",
    barberName: "Samuel Mwangi",
    date: "2026-08-27",
    timeSlot: "11:30 AM",
    customerName: "Kiplagat Tanui",
    customerPhone: "+254722100200",
    customerEmail: "kiplagat.t@gmail.com",
    specialRequests: "Prefer low taper fade and warm towel eucalyptus scent.",
    totalPriceKsh: 2700,
    totalDurationMinutes: 85,
    status: "confirmed",
    createdAt: "2026-08-27T08:15:00Z"
  },
  {
    id: "bk-102",
    referenceNumber: "ICN-7822",
    serviceIds: ["serv-6"],
    serviceNames: ["The CEO Signature Experience"],
    barberId: "barber-2",
    barberName: "Eric Omondi",
    date: "2026-08-27",
    timeSlot: "02:00 PM",
    customerName: "Eng. Joshua Kamau",
    customerPhone: "+254733456789",
    customerEmail: "joshua.kamau@horizontech.ke",
    specialRequests: "Board meeting prep, executive VIP room requested.",
    totalPriceKsh: 6500,
    totalDurationMinutes: 100,
    status: "confirmed",
    createdAt: "2026-08-26T16:20:00Z"
  }
];

export const WHY_CHOOSE_THE_ICONS = [
  {
    title: "Master Barbers & Artisans",
    subtitle: "Precision Over Speed",
    description: "Our groomers are certified artisans with a minimum of 6 years of elite salon and barbershop experience, constantly trained in contemporary precision fades, beard geometry, and trichology."
  },
  {
    title: "Hospital-Grade Sterilization",
    subtitle: "Absolute Hygiene Standard",
    description: "Every clipper guard and shear undergoes multi-stage medical sterilization. All straight razor blades are 100% single-use and unsealed right in front of you."
  },
  {
    title: "Executive Private Suites",
    subtitle: "Sanctuary of Tranquility",
    description: "Escape the noise of generic walk-in shops. Enjoy ergonomic Italian leather grooming chairs, acoustic dampening, personal entertainment, and complimentary barista espresso or single-malt whisky."
  },
  {
    title: "Guaranteed Zero-Wait Booking",
    subtitle: "Respect For Your Time",
    description: "Your reserved chair is prepped and waiting the moment you step through our doors. Seamless digital scheduling ensures punctual, unhurried service from start to finish."
  }
];

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: "prod-1",
    slug: "antibacterial-shampoo",
    name: "Antibacterial Scalp & Beard Clarifying Shampoo",
    category: "scalp-care",
    shortDescription: "Therapeutic deep-cleansing shampoo formulated with tea tree oil, zinc PCA, and organic peppermint to eliminate follicle impurities.",
    detailedDescription: "The Icons Antibacterial Scalp & Beard Clarifying Shampoo delivers a clinical-grade cleanse without stripping hair of vital moisture. Engineered specifically for active gentlemen and coarse to medium hair textures, this clarifying formula targets micro-bacterial build-up from workouts, styling clays, and urban pollution. It soothes irritated scalp tissue, helps prevent folliculitis, and leaves the hair and beard with a cool, tingling sensation of botanical freshness.",
    priceKsh: 3200,
    originalPriceKsh: 3600,
    availability: "in-stock",
    imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1608248597359-586b245037d4?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "BESTSELLER",
    rating: 4.9,
    reviewCount: 137,
    reviews: [
      {
        id: "rev-1",
        authorName: "Dr. Patrick Mwiti",
        rating: 5,
        date: "2026-08-14",
        comment: "Completely cleared my post-workout itchy scalp within 10 days. The cooling peppermint sensation is invigorating.",
        verifiedPurchase: true
      },
      {
        id: "rev-2",
        authorName: "Arnold O.",
        rating: 5,
        date: "2026-07-28",
        comment: "Excellent on both head and beard. Doesn't dry out coarse hair like supermarket shampoos.",
        verifiedPurchase: true
      },
      {
        id: "rev-3",
        authorName: "Kariuki M.",
        rating: 5,
        date: "2026-07-02",
        comment: "Purchased this right after my Scalp Detox treatment in the Kilimani studio. Essential grooming staple.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "250 ml / 8.45 fl oz",
      origin: "Formulated in London, Bottled for The Icons Nairobi",
      scentProfile: "Wild Mint, Tea Tree Leaf & Crisp Eucalyptus",
      keyIngredients: [
        "Tea Tree Leaf Essential Oil (Melaleuca Alternifolia)",
        "Zinc PCA Anti-Dandruff Complex",
        "Organic Peppermint Oil",
        "Hydrolyzed Wheat Protein",
        "Aloe Barbadensis Leaf Juice"
      ],
      usageFrequency: "2 to 3 times weekly for optimal scalp microbiome balance"
    },
    howToUse: [
      "Thoroughly wet hair and beard with warm water to open cuticles.",
      "Dispense a nickel-sized amount into palms and work into a rich, aromatic lather.",
      "Massage firmly into the scalp using circular finger pad motions for 60 to 90 seconds.",
      "Allow active botanical botanicals to penetrate for 2 minutes before rinsing with cool water."
    ],
    suitableFor: "Men with oily scalp, flaking, athletic lifestyles, or heavy hair product users.",
    relatedServiceSlugs: ["hair-spa", "classic-haircut", "skin-fade-taper"],
    relatedProductSlugs: ["tr2-scalp-therapy-lotion", "serenoa-healthy-hair", "moroccan-argan-beard-oil"]
  },
  {
    id: "prod-2",
    slug: "tr2-scalp-therapy-lotion",
    name: "TR2 Scalp Therapy Botanical Lotion",
    category: "follicle-health",
    shortDescription: "Concentrated trichological leave-in dropper lotion with botanical vasodilators and peptides to fortify thinning follicles.",
    detailedDescription: "The Icons TR2 Scalp Therapy Botanical Lotion is an intensive leave-in follicle activator developed in collaboration with leading trichologists. Packaged in an amber apothecary glass dropper, it delivers a potent blend of saw palmetto extract, niacinamide, and caffeine directly to micro-capillary roots. It improves blood flow around hair bulbs, reduces cellular oxidative stress, and helps sustain strong, dense hair growth cycles.",
    priceKsh: 3800,
    originalPriceKsh: 4200,
    availability: "in-stock",
    imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1608248597359-586b245037d4?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "CLINICAL GRADE",
    rating: 4.9,
    reviewCount: 129,
    reviews: [
      {
        id: "rev-4",
        authorName: "Eng. Brian K.",
        rating: 5,
        date: "2026-08-05",
        comment: "Noticeable reduction in hair shedding along my crown after 5 weeks of daily evening application.",
        verifiedPurchase: true
      },
      {
        id: "rev-5",
        authorName: "Farhan A.",
        rating: 5,
        date: "2026-07-19",
        comment: "Non-greasy, absorbs fast, and smells like clean cedarwood and rosemary. Highly recommend.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "100 ml / 3.38 fl oz Amber Dropper",
      origin: "Artisanal Formulation, UK Laboratory Certified",
      scentProfile: "Fresh Rosemary, Bergamot & Virgin Cedarwood",
      keyIngredients: [
        "Saw Palmetto Berry Extract (Serenoa Serrulata)",
        "Niacinamide (Vitamin B3) 5%",
        "Caffeine Micro-Encapsulated Complex",
        "Biotinoyl Tripeptide-1",
        "Centella Asiatica (Gotu Kola) Extract"
      ],
      usageFrequency: "Daily (morning or evening) on dry or towel-damp scalp"
    },
    howToUse: [
      "Part hair into sections where thinning or scalp stress is most evident.",
      "Using the precision dropper, apply 1 to 2 ml directly onto the scalp surface.",
      "Gently press and massage in with fingertips for 2 minutes until absorbed.",
      "Leave in without rinsing. Style hair as desired."
    ],
    suitableFor: "Men experiencing early hairline recession, crown thinning, or scalp sluggishness.",
    relatedServiceSlugs: ["hair-spa", "the-ceo-experience"],
    relatedProductSlugs: ["anagen-10-amino-collagen", "serenoa-healthy-hair", "antibacterial-shampoo"]
  },
  {
    id: "prod-3",
    slug: "serenoa-healthy-hair",
    name: "Serenoa + Scalp Vitality & Hair Health Booster",
    category: "follicle-health",
    shortDescription: "Daily nutraceutical dietary supplement with standardized saw palmetto, marine silica, and essential zinc.",
    detailedDescription: "Nourish hair strength from the inside out. Serenoa + is our proprietary daily dietary nutraceutical capsule packed with standardized Serenoa Repens (Saw Palmetto), bio-available zinc bisglycinate, bamboo silica, and full-spectrum Vitamin B complex. Formulated to support internal hormonal balance and promote keratin synthesis across both scalp hair and beard follicles.",
    priceKsh: 2900,
    originalPriceKsh: 3300,
    availability: "in-stock",
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "DAILY NUTRACEUTICAL",
    rating: 4.8,
    reviewCount: 148,
    reviews: [
      {
        id: "rev-6",
        authorName: "Victor M.",
        rating: 5,
        date: "2026-08-11",
        comment: "Beard feels significantly thicker and less patchy after 2 months on this supplement.",
        verifiedPurchase: true
      },
      {
        id: "rev-7",
        authorName: "Captain Hassan",
        rating: 5,
        date: "2026-07-22",
        comment: "Clean ingredients, zero stomach discomfort, and great results on hairline resilience.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "60 Vegetarian Capsules (30-Day Supply)",
      origin: "GMP-Certified Facility",
      scentProfile: "Neutral Unflavored Plant Capsule",
      keyIngredients: [
        "Standardized Saw Palmetto Extract (Serenoa Repens 45% fatty acids)",
        "Zinc Bisglycinate (High Absorption)",
        "Organic Bamboo Silica (70% extract)",
        "Biotin (D-Biotin 5000 mcg)",
        "Selenium & Copper Chelate"
      ],
      usageFrequency: "2 capsules taken daily with breakfast or lunch"
    },
    howToUse: [
      "Take 2 capsules once daily with a meal and a full glass of water.",
      "Maintain consistent daily usage for minimum 60 to 90 days for optimal hair cycle results.",
      "Store in a cool, dry place away from direct sunlight."
    ],
    suitableFor: "Men seeking systemic nutritional fortification for hair thickness, beard density, and nail strength.",
    relatedServiceSlugs: ["hair-spa", "the-ceo-experience", "classic-haircut"],
    relatedProductSlugs: ["tr2-scalp-therapy-lotion", "anagen-10-amino-collagen"]
  },
  {
    id: "prod-4",
    slug: "anagen-10-amino-collagen",
    name: "Anagen 10 Amino-Collagen Follicle Ampoules",
    category: "follicle-health",
    shortDescription: "10-vial intensive trichology ampoule treatment packed with multi-peptide collagen and bio-placental proteins.",
    detailedDescription: "The ultimate salon-grade restorative treatment for tired hair roots. Anagen 10 contains 10 concentrated glass ampoules designed for intensive 5-week restorative cycles. Packed with hydrolysed marine collagen peptides, keratin bio-amino acids, and plant stem cell extracts, it re-energizes sluggish hair matrix cells, reinforcing tensile strength against breakage.",
    priceKsh: 4500,
    originalPriceKsh: 5200,
    availability: "in-stock",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1608248597359-586b245037d4?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "10 BOTTLE PACK",
    rating: 5.0,
    reviewCount: 139,
    reviews: [
      {
        id: "rev-8",
        authorName: "Dennis Ndegwa",
        rating: 5,
        date: "2026-08-18",
        comment: "This is the exact ampoule David used during my executive spa session. Immediate boost in hair density and texture.",
        verifiedPurchase: true
      },
      {
        id: "rev-9",
        authorName: "Samuel G.",
        rating: 5,
        date: "2026-08-01",
        comment: "Remarkable product. Worth every single shilling for anyone taking their grooming seriously.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "10 x 10 ml Sealed Ampoules with Applicator Nozzle",
      origin: "Switzerland Trichological Laboratory",
      scentProfile: "Subtle Vetiver & Crisp Citrus",
      keyIngredients: [
        "Marine Collagen Hydrolysate Peptides",
        "Swiss Apple Stem Cell Culture (PhytoCellTec)",
        "Keratin Amino Acid Complex",
        "Adenosine Follicle Stimulator",
        "Panax Ginseng Root Extract"
      ],
      usageFrequency: "2 ampoules weekly for 5 consecutive weeks"
    },
    howToUse: [
      "Snap the ampoule cap cleanly using the provided safety opener sleeve.",
      "Attach the flexible applicator nozzle onto the vial tip.",
      "Dispense droplets evenly along clean scalp or thinning beard patches.",
      "Massage deeply for 3 minutes. Do not rinse out."
    ],
    suitableFor: "Men undergoing seasonal hair loss, post-braid recovery, or seeking maximum density boost.",
    relatedServiceSlugs: ["hair-spa", "the-ceo-experience"],
    relatedProductSlugs: ["tr2-scalp-therapy-lotion", "serenoa-healthy-hair", "antibacterial-shampoo"]
  },
  {
    id: "prod-5",
    slug: "moroccan-argan-beard-oil",
    name: "Organic Moroccan Argan & Sandalwood Beard Oil",
    category: "beard-grooming",
    shortDescription: "Cold-pressed virgin argan, jojoba, and sandalwood oil blend for exceptional beard softness and skin hydration.",
    detailedDescription: "Handcrafted to tame the wildest facial hair and soothe dry, irritated skin beneath. Our Moroccan Argan & Sandalwood Beard Oil is 100% organic, blending golden argan, cold-pressed jojoba, and sweet almond oil with rich East African sandalwood and amber notes. It absorbs instantly without leaving a sticky or oily residue, giving your beard an iconic natural sheen and irresistible aroma.",
    priceKsh: 2400,
    originalPriceKsh: 2800,
    availability: "in-stock",
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "SIGNATURE SCENT",
    rating: 4.9,
    reviewCount: 94,
    reviews: [
      {
        id: "rev-10",
        authorName: "Collins Rotich",
        rating: 5,
        date: "2026-08-16",
        comment: "The scent is pure class—masculine sandalwood without being overpowering. Keeps my beard soft all day.",
        verifiedPurchase: true
      },
      {
        id: "rev-11",
        authorName: "Jackson W.",
        rating: 5,
        date: "2026-07-30",
        comment: "Eric used this during my Hot Towel Beard Sculpting. Bought a bottle immediately and haven't looked back.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "50 ml / 1.7 fl oz Frosted Dropper Bottle",
      origin: "Morocco & Kenya Artisanal Blend",
      scentProfile: "Smoky Sandalwood, Warm Amber, Cardamom & Cedar",
      keyIngredients: [
        "100% Organic Virgin Argan Kernel Oil",
        "Cold-Pressed Golden Jojoba Seed Oil",
        "Sweet Almond Oil",
        "Vitamin E Tocopherol",
        "Pure East African Sandalwood Essential Oil"
      ],
      usageFrequency: "Daily every morning and post-shower"
    },
    howToUse: [
      "Dispense 4 to 6 drops into palms (adjust for beard length).",
      "Rub hands together to warm and activate botanical oils.",
      "Work upward into the skin beneath the beard first, then downward through the hairs.",
      "Comb or brush through with a sandalwood or boar-bristle brush."
    ],
    suitableFor: "All beard lengths from short stubble to full executive beards.",
    relatedServiceSlugs: ["beard-grooming", "royal-hot-lather-shave", "the-ceo-experience"],
    relatedProductSlugs: ["botanical-beard-balm", "antibacterial-shampoo", "the-icons-executive-grooming-kit"]
  },
  {
    id: "prod-6",
    slug: "matte-finish-hair-clay",
    name: "Matte Texture High-Hold Hair Styling Clay Wax",
    category: "hair-styling",
    shortDescription: "Natural bentonite clay and beeswax for strong, reworkable hold with a zero-shine textured matte finish.",
    detailedDescription: "Master any style from textured crops to clean executive side-parts. The Icons Matte Texture Clay provides all-day pliable hold with a clean matte aesthetic that never looks greasy or flaky. Infused with natural bentonite clay to absorb excess scalp oils and beeswax to lock in shape throughout long Nairobi days and evening engagements.",
    priceKsh: 2200,
    originalPriceKsh: 2500,
    availability: "in-stock",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "BARBER'S CHOICE",
    rating: 4.8,
    reviewCount: 112,
    reviews: [
      {
        id: "rev-12",
        authorName: "Kelvin Mutiso",
        rating: 5,
        date: "2026-08-12",
        comment: "Holds my textured crop all day without turning hard like gel. Rinses out effortlessly with warm water.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "100 g / 3.5 oz Matte Black Tin",
      origin: "Formulated in London, Made for African Climates",
      scentProfile: "Bergamot, Black Pepper & Tobacco Leaf",
      keyIngredients: [
        "Natural Bentonite Clay",
        "Organic Cera Alba (Beeswax)",
        "Kaolin Powder",
        "Shea Butter (Butyrospermum Parkii)",
        "Carnauba Wax"
      ],
      usageFrequency: "Daily styling as needed"
    },
    howToUse: [
      "Scoop a small dime-sized amount and rub vigorously between palms until warm.",
      "Work evenly through dry or towel-damp hair from roots to ends.",
      "Shape and texture using fingers or a wide-tooth styling comb.",
      "Re-style throughout the day with damp hands if desired."
    ],
    suitableFor: "Short to medium hair lengths, fades, textured crops, quiffs, and pompadours.",
    relatedServiceSlugs: ["classic-haircut", "skin-fade-taper", "father-and-son"],
    relatedProductSlugs: ["antibacterial-shampoo", "moroccan-argan-beard-oil"]
  },
  {
    id: "prod-7",
    slug: "botanical-beard-balm",
    name: "Artisanal Shea & Cedarwood Beard Conditioning Balm",
    category: "beard-grooming",
    shortDescription: "Rich butter formulation combining unrefined Nilotica shea butter, beeswax, and cedarwood to tame stray hairs.",
    detailedDescription: "Designed for gentlemen who require light styling hold alongside deep conditioning. Our Artisanal Beard Balm blends unrefined East African shea butter with organic beeswax and sweet almond oil. It seals in hydration, tames flyaways, and gives the beard a thicker, denser appearance while providing an all-day shield against dry weather and pollution.",
    priceKsh: 2100,
    originalPriceKsh: 2400,
    availability: "in-stock",
    imageUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "NATURAL BUTTERS",
    rating: 4.9,
    reviewCount: 76,
    reviews: [
      {
        id: "rev-13",
        authorName: "Titus K.",
        rating: 5,
        date: "2026-08-08",
        comment: "Great medium control. Eliminates beard itch completely and pairs wonderfully with the argan oil.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "80 g / 2.8 oz Gold Foil Lidded Jar",
      origin: "Kenya & Uganda Sustainable Sourcing",
      scentProfile: "Cedarwood, Bourbon Vanilla & Frankincense",
      keyIngredients: [
        "Unrefined Nilotica Shea Butter",
        "Raw Yellow Beeswax",
        "Avocado Oil",
        "Jojoba Esters",
        "Atlas Cedarwood Essential Oil"
      ],
      usageFrequency: "Daily after beard oil or morning grooming"
    },
    howToUse: [
      "Scrape a thumbnail amount with the back of your nail.",
      "Rub between palms until melted into a warm balm.",
      "Apply evenly down the length of your beard, shaping stray hairs into place.",
      "Finish with a wooden comb or boar bristle brush for uniform distribution."
    ],
    suitableFor: "Medium to long beards, coarse textures, and unruly facial hair.",
    relatedServiceSlugs: ["beard-grooming", "the-ceo-experience"],
    relatedProductSlugs: ["moroccan-argan-beard-oil", "antibacterial-shampoo", "the-icons-executive-grooming-kit"]
  },
  {
    id: "prod-8",
    slug: "the-icons-executive-grooming-kit",
    name: "The Icons Executive Grooming Travel Collection",
    category: "kits",
    shortDescription: "Complete 5-piece luxury grooming ritual set in a handcrafted genuine leather dopp bag.",
    detailedDescription: "The definitive gift of self-mastery. The Icons Executive Grooming Travel Collection houses our 5 highest-rated products in a bespoke full-grain black leather dopp bag with gold brass hardware. Includes the Clarifying Shampoo (100ml), Argan Beard Oil (50ml), Matte Styling Clay (100g), Sandalwood Pocket Comb, and TR2 Scalp Therapy sample vial. Perfect for international travel, executive gym bags, or a prestigious gift.",
    priceKsh: 8500,
    originalPriceKsh: 10500,
    availability: "low-stock",
    imageUrl: "https://images.unsplash.com/photo-1512690459411-b9245aed614b?q=80&w=800&auto=format&fit=crop",
    secondaryImages: [
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800&auto=format&fit=crop"
    ],
    badge: "LIMITED EDITION",
    rating: 5.0,
    reviewCount: 52,
    reviews: [
      {
        id: "rev-14",
        authorName: "Martin Kimani",
        rating: 5,
        date: "2026-08-20",
        comment: "The quality of the leather bag alone is worth half the price. Every product in this set is exceptional.",
        verifiedPurchase: true
      }
    ],
    specifications: {
      volume: "5 Full & Travel Size Items + Leather Pouch",
      origin: "Assembled exclusively for The Icons Nairobi",
      scentProfile: "Signature The Icons Sandalwood & Mint Blend",
      keyIngredients: [
        "Full-Grain Handcrafted Leather Dopp Bag",
        "Antibacterial Shampoo (100ml)",
        "Moroccan Argan Beard Oil (50ml)",
        "Matte Styling Clay (100g)",
        "Hand-Carved Sandalwood Beard Comb"
      ],
      usageFrequency: "Comprehensive daily routine"
    },
    howToUse: [
      "Use Shampoo for 2-3 weekly hair and beard clarifying.",
      "Apply Argan Beard Oil daily to towel-dry facial hair.",
      "Style with Matte Hair Clay for clean structure and hold.",
      "Keep essentials protected in the luxury travel case."
    ],
    suitableFor: "Frequent travelers, groomsmen gifts, executives, and clients seeking the complete routine.",
    relatedServiceSlugs: ["the-ceo-experience", "classic-haircut", "beard-grooming"],
    relatedProductSlugs: ["moroccan-argan-beard-oil", "antibacterial-shampoo", "tr2-scalp-therapy-lotion"]
  }
];

