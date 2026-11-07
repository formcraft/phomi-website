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
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
  pause: <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />,
  menu: <path {...S} strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />,
  close: <path {...S} strokeWidth="2" d="M6 6l12 12M18 6L6 18" />,
  left: <path {...S} strokeWidth="2" d="M15 5l-7 7 7 7" />,
  right: <path {...S} strokeWidth="2" d="M9 5l7 7-7 7" />,
  check: <path {...S} strokeWidth="2.2" d="M5 12l5 5 9-10" />
};

export default function Icon({ name, size = 26, style, label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      {PATHS[name]}
    </svg>
  );
}
