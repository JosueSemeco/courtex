import { Basketball } from './Basketball'

type CourtPanelProps = {
  tone: 'brand' | 'ink'
  side: 'start' | 'end'
}

export function CourtPanel({ tone, side }: CourtPanelProps) {
  return (
    <aside className="court-panel" data-tone={tone} data-side={side} aria-hidden="true">
      <svg
        className="court-art"
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        focusable="false"
      >
        <rect x="8" y="140" width="384" height="520" />
        <path d="M154 140a46 46 0 0 0 92 0" />
        <rect x="137" y="512" width="126" height="148" />
        <circle cx="200" cy="512" r="46" />
        <path d="M168 620a32 32 0 0 1 64 0" />
        <path d="M31 660V583A173 173 0 0 1 369 583V660" />
        <path d="M177 629h46" strokeWidth="2.4" />
        <circle cx="200" cy="620" r="6.5" />
      </svg>

      <div className="court-panel__inner">
        <p className="wordmark">
          Court<span>EX</span>
        </p>
        <span className="wordmark-rule" />
        <p className="wordmark-sub">
          Plantilla, entrenamientos y partidos.
        </p>
      </div>

      <Basketball />
    </aside>
  )
}
