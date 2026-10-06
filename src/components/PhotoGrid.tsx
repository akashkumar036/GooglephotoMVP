/**
 * PhotoGrid — responsive masonry-like CSS grid of photo tiles
 * 2 cols mobile → 4 cols tablet → 6 cols desktop
 */
import React from 'react'
import type { Photo } from '../types'
import { PhotoCard } from './PhotoCard'
import './PhotoGrid.css'

interface PhotoGridProps {
  photos: Photo[]
  selectedPhotoId: string | null
  onSelect: (id: string) => void
  onDeselect: (id: string) => void
  onMenuOpen: (photoId: string, anchorEl: HTMLElement) => void
  onEnlarge?: (photoId: string) => void
  emptyMessage?: string
  searchQuery?: string
  /** Map of photoId → reason chip data for results grid (Phase 9) */
  reasons?: Record<string, { label: string; type: 'visual' | 'temporal' | 'location' | 'people' | 'event' | 'text' }>
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  selectedPhotoId,
  onSelect,
  onDeselect,
  onMenuOpen,
  onEnlarge,
  emptyMessage = 'No photos found',
  searchQuery,
  reasons,
}) => {
  if (photos.length === 0) {
    if (searchQuery && searchQuery.trim().length > 0) {
      return (
        <div className="photo-grid__empty photo-grid__empty--search" role="status" aria-label="No search results">
          <span className="material-symbols-outlined photo-grid__empty-icon">search_off</span>
          <h3 className="photo-grid__empty-title">No photos found for "{searchQuery.trim()}"</h3>
          <p className="photo-grid__empty-subtitle">Try a different search term.</p>
        </div>
      )
    }

    return (
      <div className="photo-grid__empty" role="status">
        <span className="material-symbols-outlined photo-grid__empty-icon">image_not_supported</span>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="photo-grid" role="list" aria-label="Photo grid">
      {photos.map((photo, idx) => {
        const reason = reasons?.[photo.id]
        return (
          <div
            key={photo.id}
            className="photo-grid__cell"
            role="listitem"
            style={{ animationDelay: `${Math.min(idx * 18, 300)}ms` }}
          >
            <PhotoCard
              photo={photo}
              isSelected={selectedPhotoId === photo.id}
              onSelect={onSelect}
              onDeselect={onDeselect}
              onMenuOpen={onMenuOpen}
              onEnlarge={onEnlarge}
              reasonLabel={reason?.label}
              reasonType={reason?.type}
            />
          </div>
        )
      })}
    </div>
  )
}
