import { useId } from 'react';

// The PHOMI Refined Seal (Option A, chosen 3 Nov 2026): the clay pot inside a double clay ring.
export default function Seal({ size = 64, className, label }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 400 400"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <path id={`${id}t`} d="M 42,200 A 158,158 0 0,1 358,200" />
        <path id={`${id}b`} d="M 19,200 A 181,181 0 0,0 381,200" />
      </defs>
      <circle cx="200" cy="200" r="198" fill="#FBF7F0" />
      <circle cx="200" cy="200" r="192" fill="none" stroke="#A03207" strokeWidth="6" />
      <circle cx="200" cy="200" r="148" fill="none" stroke="#A03207" strokeWidth="2" />
      <text fontFamily="Cinzel, serif" fontWeight="700" fontSize="25" letterSpacing="2" fill="#1B2A47">
        <textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">POTTER’S HOUSE OUTREACH</textPath>
      </text>
      <text fontFamily="Cinzel, serif" fontWeight="700" fontSize="21" letterSpacing="2" fill="#1B2A47">
        <textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">MINISTRIES INTERNATIONAL</textPath>
      </text>
      <path d="M14 200h18M23 191v18M368 200h18M377 191v18" stroke="#C99A3E" strokeWidth="3" />
      <image href="/img/pot.png" x="106" y="122" width="188" height="157" />
    </svg>
  );
}
