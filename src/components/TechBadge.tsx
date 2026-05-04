import type { CSSProperties } from 'react'
import { getTechVisual } from '../utils/languageVisuals'

interface TechBadgeProps {
  label: string
  count?: number
  className?: string
}

export function TechBadge({ label, count, className = '' }: TechBadgeProps) {
  const visual = getTechVisual(label)

  return (
    <span
      className={`pill pill--tech ${className}`.trim()}
      style={
        {
          '--badge-bg': visual.background,
          '--badge-border': visual.border,
          '--badge-color': visual.color,
        } as CSSProperties
      }
    >
      {visual.iconUrl ? (
        <img className="pill__icon" src={visual.iconUrl} alt="" aria-hidden="true" />
      ) : (
        <span className="pill__icon-fallback" aria-hidden="true">
          {visual.shortLabel}
        </span>
      )}
      <span>{label}</span>
      {typeof count === 'number' ? <small>{count}</small> : null}
    </span>
  )
}

