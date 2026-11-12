type BasketballProps = {
  className?: string
}

export function Basketball({ className = 'ball' }: BasketballProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="ball-highlight" cx="32%" cy="26%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ball-shadow" cx="72%" cy="78%" r="70%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="var(--ball-fill, #e2703a)"
        stroke="var(--ball-line, #7a2f13)"
        strokeWidth="3"
      />
      <circle cx="50" cy="50" r="47" fill="url(#ball-highlight)" />
      <circle cx="50" cy="50" r="47" fill="url(#ball-shadow)" />
      <g
        fill="none"
        stroke="var(--ball-line, #7a2f13)"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        <path d="M50 3v94" />
        <path d="M3 50h94" />
        <path d="M19 9c18 11 18 71 0 82" />
        <path d="M81 9c-18 11-18 71 0 82" />
      </g>
    </svg>
  )
}
