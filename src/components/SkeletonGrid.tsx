import React from 'react'
import './SkeletonGrid.css'

export interface SkeletonGridProps {
  count?: number
  label?: string
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 12,
  label = 'Searching photos…',
}) => {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <div
      className="skeleton-grid"
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      {items.map((i) => (
        <div key={i} className="skeleton-grid__item">
          <div className="skeleton-grid__shimmer" />
        </div>
      ))}
    </div>
  )
}
