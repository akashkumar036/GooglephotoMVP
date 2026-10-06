/**
 * PhotoCard component — individual photo tile in the grid
 * Features: thumbnail, hover overlay, checkmark, selection state, ⋮ menu trigger
 */
import React, { useRef, useState, useCallback } from 'react'
import type { Photo } from '../types'
import { useAppStore } from '../store/appStore'
import './PhotoCard.css'

interface PhotoCardProps {
  photo: Photo
  isSelected: boolean
  onSelect: (photoId: string) => void
  onDeselect: (photoId: string) => void
  onMenuOpen: (photoId: string, anchorEl: HTMLElement) => void
  /** Optional callback to enlarge photo */
  onEnlarge?: (photoId: string) => void
  /** Optional reason chip to display (Phase 9) */
  reasonLabel?: string
  reasonType?: 'visual' | 'temporal' | 'location' | 'people' | 'event' | 'text'
}

const LONG_PRESS_DURATION = 500

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isSelected,
  onSelect,
  onDeselect,
  onMenuOpen,
  onEnlarge,
  reasonLabel,
  reasonType,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (isSelected) {
      onDeselect(photo.id)
    } else {
      onSelect(photo.id)
    }

    const isBadgeClick = Boolean((e?.target as HTMLElement)?.closest?.('.photo-card__sel-badge'))
    // Tap on image / card enlarges the photo unless user clicked selection badge
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

  // Long press → treat same as selection
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

  const chipClass = reasonType ? `reason-chip reason-chip--${reasonType}` : 'reason-chip'

  return (
    <div
      className={`photo-card${isSelected ? ' photo-card--selected' : ''}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Photo: ${photo.description || photo.filename}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
    >
      {/* Skeleton loader */}
      {!imgLoaded && <div className="photo-card__skeleton" aria-hidden="true" />}

      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.description || photo.filename}
        className={`photo-card__img${imgLoaded ? ' photo-card__img--loaded' : ''}`}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        draggable={false}
      />

      {/* Hover overlay gradient */}
      <div className="photo-card__overlay" aria-hidden="true" />

      {/* Selection badge (top-left checkmark) */}
      <div className="photo-card__sel-badge" aria-hidden="true">
        <span className="material-symbols-outlined">check_circle</span>
      </div>

      {/* ⋮ context menu button (top-right, hover only on desktop) */}
      <button
        className="photo-card__menu-btn"
        onClick={handleMenuClick}
        aria-label="More options"
        type="button"
        tabIndex={0}
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {/* Reason chip (bottom, Phase 9) */}
      {reasonLabel && (
        <div className={chipClass} aria-label={`Reason: ${reasonLabel}`}>
          {reasonLabel}
        </div>
      )}
    </div>
  )
}
