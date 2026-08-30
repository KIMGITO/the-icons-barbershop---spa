import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { updatePageSEO } from '../utils/seo';
import { ArrowRight, ChevronRight, FileText, ShieldCheck, Mail, Phone } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface TermsSection {
  title: string;
  paragraphs: string[];
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Agreement to These Terms',
    paragraphs: [
      'These terms and conditions govern your use of this site, and constitute an agreement between you and The Icons Barber & Spa (Four Ways Village, Kiambu Road, Nairobi).',
      'By using, viewing, transmitting, caching, storing and/or otherwise utilising this site, the services or functions offered hereon and/or the contents and information on this site ("The Icons Barber & Spa Information"), you have agreed to each and all of the terms and conditions set forth below, and waive any right to claim ambiguity or error in this Agreement.',
      'Should you not agree to each and every term and condition set out herein, you are asked not to use the site and to leave immediately. Periodic or continued users of this site are reminded that following the posting of changes or amendments to this Agreement from time to time will imply that such changes or amendments are accepted by you.'
    ]
  },
  {
    title: '2. Use of Site Content',
    paragraphs: [
      'The Icons Barber & Spa Information is the property of The Icons Barber & Spa. The downloading, reproduction, or retransmission of The Icons Barber & Spa Information, other than for non-commercial individual use, is strictly prohibited.'
    ]
  },
  {
    title: '3. Intellectual Property',
    paragraphs: [
      'The Icons Barber & Spa\'s Internet sites may contain or refer to trademarks, patents, copyrighted materials, trade secrets, technologies, products, processes or other proprietary rights of The Icons Barber & Spa and/or third parties. No license to or right in any such trademarks, patents, copyrighted materials, trade secrets, technologies, products, processes and other proprietary rights of The Icons Barber & Spa and/or other parties is granted to or conferred upon you.'
    ]
  },
  {
    title: '4. Acceptable Use & Interference',
    paragraphs: [
      'You agree that you will not use any device, software or other instrumentality to interfere or attempt to interfere with the proper working of this site, and that you will not take any action that imposes an unreasonable or disproportionately large load on our infrastructure.',
      'In addition, you agree that you will not use any robot, spider, other automatic device, or manual process to monitor or copy our web pages or the content contained herein, without the prior express consent from an authorised The Icons Barber & Spa representative (such consent is deemed given for standard search engine technology employed by Internet search web sites to direct Internet users to this site).'
    ]
  },
  {
    title: '5. Disclaimer of Warranties',
    paragraphs: [
      'All The Icons Barber & Spa Information is provided "as is" and without warranty of any kind, either express or implied, including, but not limited to the implied warranties of merchantability, fitness for a particular purpose, or non-infringement. Some jurisdictions do not allow the exclusion of implied warranties, so the above exclusion may not apply to you.'
    ]
  },
  {
    title: '6. Your Communications',
    paragraphs: [
      'With respect to all communications you make to The Icons Barber & Spa regarding The Icons Barber & Spa Information, including but not limited to feedback, questions, comments, suggestions and the like: (a) you shall have no right of confidentiality in your communications and The Icons Barber & Spa shall have no obligation to protect your communications from disclosure; (b) The Icons Barber & Spa shall be free to reproduce, use, disclose and distribute your communications to others without limitation; and (c) The Icons Barber & Spa shall be free to use any ideas, concepts, know-how, content or techniques contained in your communications for any purpose whatsoever, including but not limited to the development, production and marketing of products and services that incorporate such information. Provided that the above shall not affect any legal obligations of The Icons Barber & Spa under Data Protection Laws as may apply from time to time.',
      'In Kenya, your personal data is also protected under the Data Protection Act, 2019. We process personal information strictly in accordance with our Privacy Policy and applicable law.'
    ]
  },
  {
    title: '7. Accuracy of Information',
    paragraphs: [
      'The Icons Barber & Spa Information may contain technical inaccuracies and typographical errors, including but not limited to inaccuracies relating to pricing. The Icons Barber & Spa shall not assume responsibility or liability for any such inaccuracies, errors or omissions, and shall have no obligation to honour venue bookings or information affected by such inaccuracies.',
      'The Icons Barber & Spa reserves the right to make changes, corrections, cancellations and/or improvements to The Icons Barber & Spa Information, and to the products and events described in such information, at any time without notice, including after confirmation of a transaction.'
    ]
  },
  {
    title: '8. External Links',
    paragraphs: [
      'If you choose to leave this The Icons Barber & Spa site via links to other non-The Icons Barber & Spa sites, including those of advertisers, The Icons Barber & Spa is not responsible for the privacy policies of those sites or the cookies those sites use.',
      'In addition, because The Icons Barber & Spa has no control over such sites and resources, you acknowledge and agree that The Icons Barber & Spa is not responsible for the availability of such external sites or resources and does not endorse and is not responsible or liable for any content, advertising, products, or other materials on or available from such sites or resources.'
    ]
  },
  {
    title: '9. Governing Law & Disclosure',
    paragraphs: [
      'This is a Kenyan website and is subject to the laws of the Republic of Kenya. The Icons Barber & Spa will disclose any information regarding the use of this site including personal information pertaining to you without your permission when required by law, or in good faith belief that such action is necessary to investigate or protect against harmful activities to The Icons Barber & Spa and its affiliates, or property (including this site), or to others.'
    ]
  },
  {
    title: '10. Contact Us',
    paragraphs: [
      'If you would like to view the privacy practices that govern this site please review our Privacy Policy. If you have questions about these terms and conditions please contact us by email at info@theiconsbarber.co.ke or by phone at +254 743 952 173.'
    ]
  }
];

export const TermsPage: React.FC = () => {
  const { businessInfo, navigateTo } = useApp();

  // Update SEO Title, Meta Description & JSON-LD Structured Data
  useEffect(() => {
    updatePageSEO({
      title: 'Terms & Conditions',
      description: 'Review the terms and conditions governing the use of The Icons Barber & Spa website, including booking policies, intellectual property, acceptable use, and governing law.',
      canonicalUrl: 'https://theiconsbarber.co.ke/terms',
      schemaType: 'LocalBusiness',
      customSchema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': 'Terms & Conditions',
        'description': 'Terms and conditions for The Icons Barber & Spa website.',
        'url': 'https://theiconsbarber.co.ke/terms',
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
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-8 text-center" aria-label="Terms & Conditions Header">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 text-[11px] text-muted-foreground mb-4 w-full">
          <button
            onClick={() => navigateTo('/')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary font-medium">Terms & Conditions</span>
        </nav>



        {/* H1 Heading */}
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
          Terms & <span className="text-primary">Conditions</span>
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
          Last updated: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })} • {businessInfo.name}
        </p>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed mt-3">
          These terms and conditions govern your use of this site, and constitute an agreement between you and {businessInfo.name}, located at {businessInfo.address.suite}, {businessInfo.address.street}, {businessInfo.address.city}.
        </p>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Consent Intro Card */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-base sm:text-lg font-bold text-white">
                Acceptance of These Terms
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground-light leading-relaxed font-light">
                By using, viewing, transmitting, caching, storing and/or otherwise utilising this site, the services or functions offered hereon and/or the contents and information on this site ("{businessInfo.name} Information"), you have agreed to each and all of the terms and conditions set forth below, and waive any right to claim ambiguity or error in this Agreement.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground-light leading-relaxed font-light">
                Should you not agree to each and every term and condition set out herein, you are asked not to use the site and to leave immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Numbered Sections */}
        {TERMS_SECTIONS.map((section, index) => (
          <section
            key={section.title}
            id={`terms-section-${index + 1}`}
            className="bg-card border border-border rounded-2xl p-5 sm:p-6"
            aria-label={section.title}
          >
            <h2 className="font-serif text-sm sm:text-base font-bold text-white tracking-wide mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/25 text-primary flex items-center justify-center text-[10px] font-mono shrink-0">
                {index + 1}
              </span>
              {section.title.replace(/^\d+\.\s*/, '')}
            </h2>
            <div className="space-y-2.5">
              {section.paragraphs.map((paragraph, pi) => (
                <p
                  key={pi}
                  className="text-xs sm:text-sm text-muted-foreground-light leading-relaxed font-light pl-8"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}

        {/* Contact Callout */}
        <section className="p-6 sm:p-8 bg-card border border-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left" aria-label="Questions About These Terms">
          <div className="space-y-1">
            <h3 className="font-serif text-base sm:text-lg text-white font-bold">
              Questions about these terms?
            </h3>
            <p className="text-xs text-muted-foreground font-light">
              Our executive concierge team is available 7 days a week in Nairobi.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-2 text-[11px] text-muted-foreground-light">
              <a
                href={`mailto:${businessInfo.email}`}
                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Mail className="w-3 h-3 text-primary" />
                {businessInfo.email}
              </a>
              <a
                href={`tel:${businessInfo.phone}`}
                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Phone className="w-3 h-3 text-primary" />
                {businessInfo.phoneDisplay}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo('/privacy')}
              className="text-xs px-4 py-2.5 rounded-xl"
            >
              View Privacy Policy
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                navigateTo('/services');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md"
            >
              Book Appointment
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};