// Site content and settings for Potter's House Outreach Ministries International (PHOMI).
// Edit this file to update contact details, giving numbers, photos and videos.

export const CHURCH = {
  name: "Potter's House Outreach Ministries International",
  short: "Potter's House",
  tagline: 'Church & Bible Study',
  vision:
    'To transform the spiritual, physical, intellectual, social and economic lives of our community through the power of the gospel of Jesus Christ.',
  mission:
    'To preach the gospel, sensitize and train individuals and communities, and care for their physical and spiritual well-being.',
  address: ['PHOMI, Burweta, Butebo District', 'P.O. Box 1972, Mbale, Uganda'],
  phones: ['+256 772 496 781', '+256 761 838 682', '+256 775 672 562'],
  whatsapp: '+256 775 672 762',
  whatsappDigits: '256775672762',
  email: 'church@pottershouseoutreachministriesinternational.com',
  facebook: 'https://www.facebook.com/share/19w99MmbKY/',
  instagram: '', // add link when ready
  tiktok: '', // add link when ready
  youtube: '', // the church's YouTube channel, when ready
  whatsappChannel: '', // the church's WhatsApp Channel link, when ready
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Burweta%2C+Butebo+District%2C+Uganda'
};

// Weekly gatherings. Use null for anything still to be confirmed.
export const TIMES = {
  sunday: 'Every Sunday · 8:30am – 12:00pm',
  prayerDay: null, // e.g. 'Wednesday'
  prayerTime: '6:30pm – 8:30pm',
  bibleStudyDay: null,
  bibleStudyTime: null
};

// Mobile Money giving. Fill in the church's registered numbers and names.
// The dial codes open the network's send-money menu with number and amount filled in.
// Test one small gift on each network after filling these in.
export const MOMO = {
  mtn: { name: 'MTN MoMo', menu: '*165#', path: (n) => `*165*1*1*${n}*`, num: '', reg: '' },
  airtel: { name: 'Airtel Money', menu: '*185#', path: (n) => `*185*1*1*${n}*`, num: '', reg: '' }
};

export const BANK = { bank: null, accountName: CHURCH.name, accountNumber: null, swift: null };

export const AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export const FUNDS = [
  ['tithe', 'Tithe & Offering'],
  ['outreach', 'Outreach & Care'],
  ['bible-study', 'Bible Study']
];

// [path, English label, text key in src/text.js]
export const NAV = [
  ['/', 'Home', 'nav.home'],
  ['/about', 'About', 'nav.about'],
  ['/ministries', 'Ministries', 'nav.ministries'],
  ['/sermons', 'Sermons', 'nav.sermons'],
  ['/bible', 'Bible', 'nav.bible'],
  ['/events', 'Events', 'nav.events'],
  ['/gallery', 'Gallery', 'nav.gallery'],
  ['/prayer', 'Prayer Requests', 'nav.prayer'],
  ['/contact', 'Contact', 'nav.contact']
];

export const VALUES = [
  ['P', 'Passionate'], ['O', 'Obedience'], ['T', 'Time conscious'], ['T', 'Trustworthiness'],
  ['E', 'Exemplary'], ['R', 'Reachable'], ['S', 'Supportive'],
  ['H', 'Honesty'], ['O', 'Orderly'], ['U', 'Understanding'], ['S', 'Servanthood'], ['E', 'Ethical living']
];

// [file name in /public/img, caption, gallery category]
export const PHOTOS = [
  ['sunday-pulpit', 'Preaching from the pulpit at a special Sunday service', 'Worship'],
  ['women-praise', 'Mothers of the church rejoicing in praise', 'Worship'],
  ['worship-outdoor', 'Praise team leading worship under the trees', 'Worship'],
  ['worship-leader', 'A worship leader stirring the congregation', 'Worship'],
  ['worship-chairs', 'Members greeting one another before service', 'Worship'],
  ['hall-gathering', 'A full gathering inside the new hall', 'Worship'],
  ['outdoor-service', 'Open-air service with the sound desk ready', 'Worship'],
  ['crusade-field', 'Crowds gathered on the field for an outreach crusade', 'Outreach'],
  ['children-crowd', 'Children and families at an outreach meeting', 'Outreach'],
  ['children', 'Children of the community at an outreach', 'Outreach'],
  ['kids-visit', 'Visiting children in the community', 'Outreach'],
  ['field-gathering', 'An evening outreach on the open field', 'Outreach'],
  ['kneeling-prayer', 'Kneeling in prayer at an open-air meeting', 'Outreach'],
  ['fellowship', 'Fellowship and welcome after a service', 'Fellowship'],
  ['young-men', 'Young men of the church standing for prayer', 'Fellowship'],
  ['celebration', 'Cutting the cake at a church celebration', 'Fellowship'],
  ['class-room', 'Bible study in session', 'Bible Study'],
  ['class-room-2', 'Studying the Word together', 'Bible Study'],
  ['service-family', 'Honouring a family at a special service', 'Special service'],
  ['service-blessing', 'Blessing and dedication at the altar', 'Special service'],
  ['service-prayer', 'Prayer over a mother of the church', 'Special service'],
  ['service-honour', 'Laying on of hands at the special service', 'Special service'],
  ['service-elders', 'The pastor with elders of the church', 'Special service'],
  ['service-hall', 'The decorated hall ready for celebration', 'Special service'],
  ['build-foundation', 'Laying the foundation of the church', 'Building'],
  ['build-walls', 'The first walls rising', 'Building'],
  ['build-slab', 'Pouring the floor slab', 'Building'],
  ['build-interior', 'Inside the hall as the roof went on', 'Building'],
  ['church-tree', 'The finished church building at Burweta', 'Building'],
  ['church-dusk', 'The church at dusk', 'Building'],
  ['church-front', 'Front of the church and the compound', 'Building'],
  ['church-circle', 'The church compound and garden circle', 'Building']
];

export const GALLERY_CATS = ['All', 'Worship', 'Outreach', 'Special service', 'Bible Study', 'Fellowship', 'Building'];

export const CLIPS = [
  { v: 'sunday-service', t: 'Sunday Service at PHOMI', k: 'Worship', d: '0:47', p: 'Praise and the Word in the hall at Burweta.' },
  { v: 'hall-worship', t: 'Evening Worship in the Hall', k: 'Worship', d: '0:45', p: 'Worship and dance before the altar.' },
  { v: 'open-air-preaching', t: 'Open-Air Preaching', k: 'Outreach', d: '0:40', p: 'The gospel preached under the trees.' },
  { v: 'outdoor-worship', t: 'Praise Under the Trees', k: 'Worship', d: '0:40', p: 'The congregation rising in song outdoors.' },
  { v: 'children-dance', t: 'Children Rejoicing', k: 'Outreach', d: '0:40', p: 'Children dancing at a community outreach.' },
  { v: 'crusade-ground', t: 'On the Crusade Ground', k: 'Outreach', d: '0:40', p: 'Gathering the community for a crusade.' }
];

// Add dated events here: { day: '14', mon: 'Dec', kind: 'Outreach Mission', name: '...', time: '9:00am', venue: '...', photo: 'crusade-field' }
export const EVENTS = [];

export const BUILD_STEPS = [
  ['build-foundation', 'Step 1', 'The foundation', 'Trenches dug and the first courses of brick laid in the red earth.'],
  ['build-walls', 'Step 2', 'Walls rise', 'Block walls climb as members give time, materials and strength.'],
  ['build-slab', 'Step 3', 'The floor', 'The floor slab is poured for the main hall.'],
  ['build-interior', 'Step 4', 'Under one roof', 'The roof trusses go on and the hall takes shape.'],
  ['church-tree', 'Today', 'A house of worship', 'A finished home for worship, prayer and Bible study.']
];

// Built-in media live in /public/img and /public/video. Media added from the admin page or by email
// are full paths under /uploads, and are used as they are.
const isPath = (name) => /^(\/|https?:)/.test(name);
export const img = (name) => (isPath(name) ? name : `/img/${name}.jpg`);
// Phones get the 640px copy in /img/sm (about a fifth of the size); bigger screens the full photo
export const srcSet = (name) => (isPath(name) ? undefined : `/img/sm/${name}.jpg 640w, /img/${name}.jpg 1080w`);
export const video = (name) => (isPath(name) ? name : `/video/${name}.mp4`);
export const fmt = (n) => Number(n).toLocaleString('en-US');
