import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { Team } from '../../lib/data'

type TeamTabsProps = {
  teams: Team[]
  activeId: string
  onSelect: (id: string) => void
}

export function TeamTabs({ teams, activeId, onSelect }: TeamTabsProps) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const index = teams.findIndex((team) => team.id === activeId)
    buttons.current[index]?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeId, teams])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = teams.findIndex((team) => team.id === activeId)
    let next = -1

    if (event.key === 'ArrowRight') next = (current + 1) % teams.length
    else if (event.key === 'ArrowLeft') next = (current - 1 + teams.length) % teams.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = teams.length - 1

    if (next >= 0) {
      event.preventDefault()
      onSelect(teams[next].id)
      buttons.current[next]?.focus()
    }
  }

  return (
    <div className="sub-nav" role="tablist" aria-label="Equipos" onKeyDown={handleKeyDown}>
      {teams.map((team, index) => (
        <button
          key={team.id}
          ref={(node) => {
            buttons.current[index] = node
          }}
          type="button"
          role="tab"
          id={`team-tab-${team.id}`}
          aria-selected={team.id === activeId}
          aria-controls="team-panel"
          tabIndex={team.id === activeId ? 0 : -1}
          className="team-tab"
          onClick={() => onSelect(team.id)}
        >
          {team.name}
        </button>
      ))}
    </div>
  )
}
