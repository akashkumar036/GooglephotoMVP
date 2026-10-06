import React from 'react'
import type { ClueChain, RetrievalMode } from '../types'
import { useAppStore } from '../store/appStore'
import { findPhotoById } from '../utils/getPhoto'
import './ClueBreadcrumb.css'

export interface ClueBreadcrumbProps {
  chain: ClueChain | null
  onStepClick: (stepIndex: number) => void
  onStartOver: () => void
  onSearchClick?: () => void
}

const getShortModeName = (mode: RetrievalMode): string => {
  switch (mode) {
    case 'similar':
      return 'Similar'
    case 'memory':
      return 'Memory'
    case 'best':
      return 'Best'
    default:
      return 'Clue'
  }
}

/**
 * ClueBreadcrumb — Breadcrumb navigation for multi-hop clue chaining.
 * Appears above results when chain depth > 1 (Phase 10.2).
 * Formats: Search → [medicine-2023] Similar → [medicine-2025] Memory → Results
 */
export const ClueBreadcrumb: React.FC<ClueBreadcrumbProps> = ({
  chain,
  onStepClick,
  onStartOver,
  onSearchClick = onStartOver,
}) => {
  const userPhotos = useAppStore((s) => s.userPhotos)
  const photosMap = useAppStore((s) => s.photos)

  // Do not show on first clue (chain depth <= 1)
  if (!chain || chain.steps.length <= 1) {
    return null
  }

  return (
    <nav className="clue-breadcrumb" aria-label="Clue chain navigation">
      <div className="clue-breadcrumb__track">
        {/* Initial Search link */}
        <button
          type="button"
          className="clue-breadcrumb__node clue-breadcrumb__node--search"
          onClick={onSearchClick}
          title="Return to search / photo library"
          aria-label="Return to library search"
        >
          <span className="material-symbols-outlined clue-breadcrumb__icon" style={{ fontSize: '16px' }}>
            search
          </span>
          <span>Search</span>
        </button>

        {/* Chain steps */}
        {chain.steps.map((step, idx) => {
          const photo = findPhotoById(step.cluePhotoId, userPhotos, photosMap)
          const label =
            step.label ||
            photo?.eventId ||
            (photo?.filename ? photo.filename.replace(/\.[^/.]+$/, '') : `Clue ${idx + 1}`)
          const modeLabel = getShortModeName(step.mode)
          const isCurrent = idx === chain.steps.length - 1

          return (
            <React.Fragment key={`${step.cluePhotoId}-${idx}`}>
              <span className="clue-breadcrumb__separator" aria-hidden="true">
                →
              </span>
              <button
                type="button"
                className={`clue-breadcrumb__node clue-breadcrumb__node--step${
                  isCurrent ? ' clue-breadcrumb__node--current' : ''
                }`}
                onClick={() => onStepClick(idx)}
                aria-current={isCurrent ? 'step' : undefined}
                title={`Step ${idx + 1}: ${label} (${modeLabel})`}
              >
                {photo && (
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt=""
                    className="clue-breadcrumb__thumb"
                    aria-hidden="true"
                  />
                )}
                <span className="clue-breadcrumb__clue-label">[{label}]</span>
                <span className="clue-breadcrumb__mode-label">{modeLabel}</span>
              </button>
            </React.Fragment>
          )
        })}

        <span className="clue-breadcrumb__separator" aria-hidden="true">
          →
        </span>
        <span className="clue-breadcrumb__current-badge">Results</span>
      </div>

      <button
        type="button"
        className="clue-breadcrumb__start-over-btn"
        onClick={onStartOver}
        aria-label="Start over"
        title="Reset clue chain and start over"
      >
        <span className="material-symbols-outlined">restart_alt</span>
        <span>Start over</span>
      </button>
    </nav>
  )
}
