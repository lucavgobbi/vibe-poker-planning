type Props = {
  size?: number;
};

export default function LogoIcon({ size = 40 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Poker Planning logo"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <filter id="logoshadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>

      <g transform="translate(50, 58) rotate(-8) translate(-28, -39)">
        <rect x="0" y="0" width="56" height="78" rx="7" fill="url(#logoGrad)" filter="url(#logoshadow)" />
        <path d="M28 10 L44 39 L28 68 L12 39 Z" fill="white" opacity="0.2" />
        <path d="M28 18 L37 39 L28 60 L19 39 Z" fill="white" opacity="0.3" />
        <path d="M28 26 L32 39 L28 52 L24 39 Z" fill="white" opacity="0.4" />
        <rect x="4" y="4" width="48" height="70" rx="5" stroke="white" strokeWidth="1.2" opacity="0.25" fill="none" />
      </g>

      <g transform="translate(50, 52) rotate(6) translate(-28, -39)">
        <rect x="0" y="0" width="56" height="78" rx="7" fill="url(#logoGrad)" filter="url(#logoshadow)" />
        <text x="28" y="45" textAnchor="middle" fontSize="18" fill="white" fontWeight="700">
          ♠
        </text>
        <text x="7" y="14" fontSize="9" fill="white" fontWeight="700" opacity="0.8">
          Q
        </text>
      </g>

      <g transform="translate(50, 46) rotate(-4) translate(-28, -39)">
        <rect x="0" y="0" width="56" height="78" rx="7" fill="url(#logoGrad)" filter="url(#logoshadow)" />
        <line x1="28" y1="16" x2="28" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="28" cy="13" r="2.4" fill="white" />
        <rect x="16" y="28" width="10" height="12" rx="2" fill="white" />
        <rect x="30" y="28" width="10" height="12" rx="2" fill="white" />
        <rect x="21" y="48" width="14" height="3" rx="1.5" fill="white" />
      </g>
    </svg>
  );
}
