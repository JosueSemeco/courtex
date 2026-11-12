import courtSvg from '../../assets/court-fiba.svg?raw'
import ballSvg from '../../assets/basketball.svg'

type CourtPanelProps = {
  tone: 'brand' | 'ink'
  side: 'start' | 'end'
}

// Cancha: "Basketball court fiba.svg" de Jenspo, CC BY 3.0 (ver CREDITS.md).
export function CourtPanel({ tone, side }: CourtPanelProps) {
  return (
    <aside className="court-panel" data-tone={tone} data-side={side} aria-hidden="true">
      <div className="court-panel__art" dangerouslySetInnerHTML={{ __html: courtSvg }} />

      <div className="court-panel__inner">
        <p className="wordmark">
          Court<span>EX</span>
        </p>
        <span className="wordmark-rule" />
        <p className="wordmark-sub">Plantilla, entrenamientos y partidos.</p>
      </div>

      <img className="ball" src={ballSvg} alt="" />
    </aside>
  )
}
