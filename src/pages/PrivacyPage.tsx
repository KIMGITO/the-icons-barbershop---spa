import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { updatePageSEO } from '../utils/seo';
import { ArrowRight, ChevronRight, Lock, Database, Cookie, UserCheck, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface PrivacySection {
  title: string;
  icon?: React.ReactNode;
  paragraphs: string[];
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: '1. Information We Collect',
    icon: <Database className="w-3.5 h-3.5" />,
    paragraphs: [
      'The Icons Barber & Spa collects information you provide directly to us, such as when you book an appointment, create a customer profile, purchase a product, subscribe to our newsletter, or contact our concierge team. This may include your name, phone number, email address, appointment preferences, preferred barber or specialist, service history, and payment details where applicable.',
      'We also automatically collect limited technical information when you visit our website, including your browser type, device type, IP address, pages visited, and approximate location - gathered through cookies and similar technologies to improve your experience and our service quality.'
    ]
  },
  {
    title: '2. How We Use Your Information',
    icon: <UserCheck className="w-3.5 h-3.5" />,
    paragraphs: [
      'We use the information we collect to: confirm and manage your bookings; send appointment reminders and updates; process product purchases; personalise your grooming experience and recommendations; improve our services and website; respond to your enquiries through our concierge; and, where you opt in, send bespoke loyalty offers and service reminders.',
      'We do not sell, rent, or trade your personal information to third parties for marketing purposes.'
    ]
  },
  {
    title: '3. Legal Basis & Consent (Data Protection Act, 2019)',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    paragraphs: [
      'In accordance with the Kenya Data Protection Act, 2019 and the General Data Protection Regulation (GDPR) where applicable, we process your personal data on the following lawful bases: (a) your consent, which you may withdraw at any time; (b) performance of a contract with you (such as completing a booking or purchase); (c) compliance with our legal obligations; and (d) our legitimate interests in operating and improving our business in a manner that respects your rights.',
      'You have the right to access, correct, or delete your personal information, to object to or restrict certain processing, and to lodge a complaint with the Office of the Data Protection Commissioner (ODPC) of Kenya if you believe your data protection rights have been infringed.'
    ]
  },
  {
    title: '4. Data Security & Retention',
    icon: <Lock className="w-3.5 h-3.5" />,
    paragraphs: [
      'The Icons respects client confidentiality. Your contact and appointment records are encrypted and strictly used for confirmation notices, bespoke loyalty offerings, and booking reminders. We implement appropriate technical and organisational measures, including secure transmission (HTTPS/TLS), access controls, and strict staff confidentiality obligations, to protect your information against unauthorised access, alteration, disclosure, or destruction.',
      'We retain personal information only for as long as necessary to fulfil the purposes described in this policy, meet legal and regulatory requirements, or resolve disputes. After that time, your data is securely deleted or anonymised.'
    ]
  },
  {
    title: '5. Cookies & Analytics',
    icon: <Cookie className="w-3.5 h-3.5" />,
    paragraphs: [
      'Our website uses cookies and similar tracking technologies to remember your preferences, understand how visitors interact with the site, and improve performance. You may block or delete cookies through your browser settings at any time. However, certain features of the site may not function optimally without them.',
      'If you choose to leave this site via links to other non-The Icons Barber & Spa sites, including those of advertisers, The Icons Barber & Spa is not responsible for the privacy policies of those sites or the cookies those sites use.'
    ]
  },
  {
    title: '6. Sharing & Disclosure',
    paragraphs: [
      'We only share your personal information with trusted service providers who help us operate our business (for example, payment processors, SMS/notification providers, and booking infrastructure) and who are bound by confidentiality obligations. We will disclose your information without your permission only when required by law, or in good faith belief that such action is necessary to investigate or protect against harmful activities to The Icons Barber & Spa and its affiliates, or property (including this site), or to others.'
    ]
  },
  {
    title: '7. Your Rights & Choices',
    icon: <UserCheck className="w-3.5 h-3.5" />,
    paragraphs: [
      'You may request access to the personal information we hold about you, ask us to correct inaccurate data, request deletion of your data, withdraw consent for marketing communications at any time, and object to or restrict certain types of processing. To exercise any of these rights, contact us using the details below and we will respond within the timeframe required by applicable law.',
      'If you are not satisfied with our response, you have the right to lodge a complaint with the Office of the Data Protection Commissioner (ODPC) of Kenya at P.O. Box 50691 - 00200 Nairobi.'
    ]
  },
  {
    title: '8. Children\'s Privacy',
    paragraphs: [
      'Our services are directed to adults. We do not knowingly collect personal information from children under the age of 18. If you believe a child has provided us with personal information, please contact us so we can take appropriate action.'
    ]
  },
  {
    title: '9. Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will revise the "Last updated" date at the top of this page and, where appropriate, notify you by email or a prominent notice on our website. Your continued use of the site after changes take effect constitutes acceptance of the revised policy.'
    ]
  },
  {
    title: '10. Contact Us',
    icon: <Mail className="w-3.5 h-3.5" />,
    paragraphs: [
      'If you have any questions about this Privacy Policy, your personal data, or our data protection practices, please contact our Data Protection contact at The Icons Barber & Spa.',
      'Email: info@theiconsbarber.co.ke | Phone: +254 743 952 173 | Address: Four Ways Village, Kiambu Road, Nairobi, Kenya.'
    ]
  }
];

export const PrivacyPage: React.FC = () => {
  const { businessInfo, navigateTo } = useApp();

  useEffect(() => {
    updatePageSEO({
      title: 'Privacy Policy',
      description: 'Read the Privacy Policy of The Icons Barber & Spa, covering how we collect, use, protect, and respect your personal information in accordance with the Kenya Data Protection Act, 2019.',
      canonicalUrl: 'https://theiconsbarber.co.ke/privacy',
      schemaType: 'LocalBusiness',
      customSchema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': 'Privacy Policy',
        'description': 'Privacy policy for The Icons Barber & Spa, Nairobi.',
        'url': 'https://theiconsbarber.co.ke/privacy',
        'isPartOf': {
          '@type': 'WebSite',
          'name': businessInfo.name,
          'url': 'https://theiconsbarber.co.ke'
        }
      }
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [businessInfo.name]);

  return (
    <div className="min-h-screen bg-background text-white pt-24 pb-20">
      {/* Compact Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-8 text-center" aria-label="Privacy Policy Header">
        <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 text-[11px] text-muted-foreground mb-4 w-full ">
          <button onClick={() => navigateTo('/')} className="hover:text-white transition-colors cursor-pointer">Home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary font-medium">Privacy Policy</span>
        </nav>


        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
          Privacy <span className="text-primary">Policy</span>
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
          Last updated: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })} • {businessInfo.name}
        </p>

      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Summary / At-a-Glance Card */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-base sm:text-lg font-bold text-white">Our Commitment to Your Privacy</h2>
              <p className="text-xs sm:text-sm text-muted-foreground-light leading-relaxed font-light">
                Your contact and appointment records are encrypted and strictly used for confirmation notices, bespoke loyalty offerings, and booking reminders. We are committed to protecting your personal information and being transparent about how we use it.
              </p>
            </div>
          </div>
        </div>

        {/* Numbered Sections */}
        {PRIVACY_SECTIONS.map((section, index) => (
          <section key={section.title} id={`privacy-section-${index + 1}`} className="bg-card border border-border rounded-2xl p-5 sm:p-6" aria-label={section.title}>
            <h2 className="font-serif text-sm sm:text-base font-bold text-white tracking-wide mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/25 text-primary flex items-center justify-center text-[10px] font-mono shrink-0">{index + 1}</span>
              {section.title.replace(/^\d+\.\s*/, '')}
              {section.icon && <span className="text-primary/70 ml-1">{section.icon}</span>}
            </h2>
            <div className="space-y-2.5">
              {section.paragraphs.map((paragraph, pi) => (
                <p key={pi} className="text-xs sm:text-sm text-muted-foreground-light leading-relaxed font-light pl-8">{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        {/* Contact Callout */}
        <section className="p-6 sm:p-8 bg-card border border-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left" aria-label="Data Protection Contact">
          <div className="space-y-1">
            <h3 className="font-serif text-base sm:text-lg text-white font-bold">Questions about your data?</h3>
            <p className="text-xs text-muted-foreground font-light">Contact our data protection contact in Nairobi — we respond promptly.</p>
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-2 text-[11px] text-muted-foreground-light">
              <a href={`mailto:${businessInfo.email}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                <Mail className="w-3 h-3 text-primary" />
                {businessInfo.email}
              </a>
              <a href={`tel:${businessInfo.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                <Phone className="w-3 h-3 text-primary" />
                {businessInfo.phoneDisplay}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
            <Button variant="outline" size="sm" onClick={() => navigateTo('/terms')} className="text-xs px-4 py-2.5 rounded-xl">
              View Terms & Conditions
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            <Button variant="primary" size="sm" onClick={() => { navigateTo('/services'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md">
              Book Appointment
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};