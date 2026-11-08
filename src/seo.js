// What search engines and link previews (WhatsApp, Facebook) show for each page.
// Used by the site (App.jsx) and at build time (scripts/seo-build.mjs writes one HTML file per page,
// the sitemap and robots.txt). Keep titles under about 60 characters and descriptions under about 155.
export const SITE_URL = 'https://pottershouseoutreachministriesinternational.com';
export const SITE_NAME = "Potter's House Outreach Ministries International";

export const PAGES = [
  ['/', "Potter's House Church, Burweta, Butebo, Uganda | PHOMI",
    "Potter's House Outreach Ministries International (PHOMI): a church and free Bible study in Burweta, Butebo District, Uganda. Sundays 8:30am. All are welcome.", 1.0],
  ['/about', "About Potter's House Church | PHOMI, Butebo, Uganda",
    "Our story, vision and values. Potter's House Outreach Ministries International serves Burweta and Butebo District through the gospel of Jesus Christ.", 0.8],
  ['/ministries', 'Ministries: worship, outreach, Bible study | PHOMI',
    "Sunday worship, prayer, free Bible study and outreach crusades in Burweta and across Butebo District. Find your place at Potter's House.", 0.8],
  ['/sermons', "Sermons and videos | Potter's House Church, Uganda",
    "Watch and listen to recent sermons and moments from Potter's House Outreach Ministries International in Burweta, Butebo District, Uganda.", 0.7],
  ['/bible', 'Read the Bible online: KJV and WEB, Verse of the Day | PHOMI',
    "Read the whole Bible free (King James Version and World English Bible), search any verse, and get the Verse of the Day by email or SMS from Potter's House.", 0.9],
  ['/events', "Church events and outreach crusades | Potter's House, Butebo",
    "Coming services, crusades and outreach events at Potter's House Outreach Ministries International, Burweta, Butebo District, Uganda.", 0.7],
  ['/gallery', "Photo gallery | Potter's House Church, Burweta, Uganda",
    "Photos of worship, outreach, children's ministry and building the church at Potter's House Outreach Ministries International, Butebo District.", 0.6],
  ['/prayer', "Send a prayer request | Potter's House Church, Uganda",
    'Send a prayer request to the pastors and prayer team at Potter\'s House. We pray every week, and you can ask us to pray for you in confidence.', 0.6],
  ['/testimonies', "Testimonies: what God has done | Potter's House, Uganda",
    "Read, listen to and watch testimonies from members and friends of Potter's House in Burweta, Butebo District, and share what God has done for you.", 0.7],
  ['/give', "Give by Mobile Money (MTN, Airtel) | Potter's House Church",
    "Support the work of Potter's House Outreach Ministries International with MTN MoMo or Airtel Money. Tithes, offerings, outreach and building.", 0.6],
  ['/contact', "Contact and directions | Potter's House, Burweta, Butebo",
    "Visit Potter's House in Burweta, Butebo District, near Mbale, Uganda. Phone, WhatsApp, email and a map. Sunday service 8:30am to 12:00pm.", 0.8],
];

export const pageMeta = (path) => PAGES.find(([p]) => p === path) || null;

// Church details for Google (schema.org), so searches like "church in Butebo" can show the address and times
export const churchSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Church',
  '@id': `${SITE_URL}/#church`,
  name: SITE_NAME,
  alternateName: ['PHOMI', "Potter's House Church", "Potter's House Burweta"],
  url: SITE_URL,
  logo: `${SITE_URL}/favicon-512.png`,
  image: `${SITE_URL}/img/og-image.jpg`,
  description: 'A church and free Bible study in Burweta, Butebo District, Uganda, transforming lives through the gospel of Jesus Christ.',
  email: 'church@pottershouseoutreachministriesinternational.com',
  telephone: '+256772496781',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Burweta',
    addressLocality: 'Butebo',
    addressRegion: 'Butebo District',
    postOfficeBoxNumber: '260208',
    addressCountry: 'UG',
  },
  areaServed: ['Butebo District', 'Mbale', 'Eastern Uganda'],
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Sunday', opens: '08:30', closes: '12:00' }],
  sameAs: ['https://www.facebook.com/share/19w99MmbKY/'],
});
