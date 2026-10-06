import React, { useState, useRef, useCallback } from 'react'
import type { RetrievalResult, RetrievalMode } from '../types'
import { useAppStore } from '../store/appStore'
import './ResultCard.css'

export interface ResultCardProps {
  result: RetrievalResult
  mode?: RetrievalMode
  isSelected: boolean
  onSelect: (photoId: string) => void
  onDeselect: (photoId: string) => void
  onMenuOpen: (photoId: string, anchorEl: HTMLElement) => void
  onEnlarge?: (photoId: string) => void
  showExplanation?: boolean
}

const LONG_PRESS_DURATION = 500

/**
 * ResultCard component — dedicated result card for the retrieval experience.
 * Features:
 * - Color-coded reason chips (opacity 0.85, subtle, typed)
 * - Three-dots menu button for "Use this photo as a clue" (Phase 9.5 & 10)
 * - Bottom explanation footer for Best Match mode (Phase 9.3)
 */
export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  mode,
  isSelected,
  onSelect,
  onDeselect,
  onMenuOpen,
  onEnlarge,
  showExplanation = mode === 'best',
}) => {
  const { photo, reasons } = result
  const primaryReason = reasons[0]
  const [imgLoaded, setImgLoaded] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (isSelected) {
      onDeselect(photo.id)
    } else {
      onSelect(photo.id)
    }

    const isBadgeClick = Boolean((e?.target as HTMLElement)?.closest?.('.result-card__sel-badge'))
    if (!isBadgeClick) {
      if (onEnlarge) {
        onEnlarge(photo.id)
      } else {
        useAppStore.getState().setEnlargedPhotoId(photo.id)
      }
    }
  }

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onMenuOpen(photo.id, e.currentTarget)
  }

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      onSelect(photo.id)
    }, LONG_PRESS_DURATION)
  }, [photo.id, onSelect])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onMenuOpen(photo.id, e.currentTarget as HTMLElement)
  }

  const chipTypeClass = primaryReason?.type
    ? `result-card__chip--${primaryReason.type}`
    : 'result-card__chip--visual'

  return (
    <div
      className={`result-card${isSelected ? ' result-card--selected' : ''}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Photo result: ${photo.description || photo.filename}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="result-card__thumb-container">
        {/* Loading Skeleton */}
        {!imgLoaded && <div className="result-card__skeleton" aria-hidden="true" />}

        {/* Thumbnail Image */}
        <img
          src={photo.thumbnailUrl || photo.imageUrl}
          alt={photo.description || photo.filename}
          className={`result-card__img${imgLoaded ? ' result-card__img--loaded' : ''}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />

        {/* Hover overlay gradient */}
        <div className="result-card__overlay" aria-hidden="true" />

        {/* Selection badge (top-left checkmark) */}
        <div className="result-card__sel-badge" aria-hidden="true">
          <span className="material-symbols-outlined">check_circle</span>
        </div>

        {/* ⋮ context menu button (top-right, hover or mobile tap) */}
        <button
          className="result-card__menu-btn"
          onClick={handleMenuClick}
          aria-label="More options"
          type="button"
          tabIndex={0}
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>

        {/* Reason chip (pill over bottom of thumbnail, Phase 9.2 & Phase 18.1) */}
        {primaryReason && (
          <div
            className={`result-card__chip ${chipTypeClass}${imgLoaded ? ' result-card__chip--loaded' : ' result-card__chip--pending'}`}
            aria-label={`Reason: ${primaryReason.label}`}
          >
            {primaryReason.label}
          </div>
        )}
      </div>

      {/* Best Match explanation under thumbnail (Phase 9.3) */}
      {showExplanation && primaryReason && (
        <div className="result-card__explanation">
          <span className="material-symbols-outlined result-card__explanation-icon">
            auto_awesome
          </span>
          <span className="result-card__explanation-text">{primaryReason.label}</span>
        </div>
      )}
    </div>
  )
}
