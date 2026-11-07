const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

const PATHS = {
  church: <path {...S} d="M12 2v4M10 4h4M6 22V11l6-5 6 5v11M3 22h18M10 22v-5h4v5" />,
  heart: <path {...S} d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />,
  book: (
    <g {...S}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </g>
  ),
  globe: (
    <g {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </g>
  ),
  clock: (
    <g {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </g>
  ),
  pin: (
    <g {...S}>
      <path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </g>
  ),
  phone: <path {...S} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
  chat: <path {...S} d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" />,
  mail: (
    <g {...S}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </g>
  ),
  facebook: <path {...S} d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3.5h2V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" />,
  tiktok: <path {...S} d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.2 4.4 5 4.6" />,
  video: (
    <g {...S}>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <polygon points="10,9 15,12 10,15" />
    </g>
  ),
  instagram: (
    <g {...S}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
    </g>
  ),
  image: (
    <g {...S}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-9 9" />
    </g>
  ),
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
  pause: <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />,
  menu: <path {...S} strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />,
  close: <path {...S} strokeWidth="2" d="M6 6l12 12M18 6L6 18" />,
  left: <path {...S} strokeWidth="2" d="M15 5l-7 7 7 7" />,
  right: <path {...S} strokeWidth="2" d="M9 5l7 7-7 7" />,
  check: <path {...S} strokeWidth="2.2" d="M5 12l5 5 9-10" />,
  bell: <path {...S} d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" />,
  plus: <path {...S} strokeWidth="2" d="M12 5v14M5 12h14" />,
  trash: <path {...S} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  edit: <path {...S} d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  upload: <path {...S} d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  inbox: <path {...S} d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5" />,
  gift: <path {...S} d="M4 11h16v10H4zM2 7h20v4H2zM12 7v14M12 7S10 2 7.5 3.5 9 7 12 7zm0 0s2-5 4.5-3.5S15 7 12 7z" />,
  cog: <path {...S} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
  users: <path {...S} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
  out: <path {...S} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  refresh: <path {...S} d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  mic: <path {...S} d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
};

export default function Icon({ name, size = 26, style, label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      {PATHS[name]}
    </svg>
  );
}
