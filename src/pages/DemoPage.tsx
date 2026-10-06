/**
 * DemoPage — Demo Photos Library
 * - Photo grid with 50 placeholder images
 * - Inline search bar
 * - Date group headers
 * - Photo selection state via Zustand
 * Context menu and Clue sheet will be added in Phase 4 & 5
 */
import React, { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PhotoGrid } from '../components/PhotoGrid'
import { SearchBar } from '../components/SearchBar'
import { useAppStore } from '../store/appStore'
import { usePlaceholderPhotos } from '../hooks/usePlaceholderPhotos'
import { useDebounce } from '../hooks/useDebounce'
import { buildIndex, searchIndex } from '../engine/searchIndex'
import { ContextMenu } from '../components/ContextMenu'
import { SkeletonGrid } from '../components/SkeletonGrid'
import type { Photo } from '../types'
import './DemoPage.css'

export const DemoPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setActiveMode = useAppStore((s) => s.setActiveMode)
  const selectedPhotoId = useAppStore((s) => s.selectedPhotoId)
  const setSelectedPhotoId = useAppStore((s) => s.setSelectedPhotoId)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setActiveClueId = useAppStore((s) => s.setActiveClueId)
  const setSheetOpen = useAppStore((s) => s.setSheetOpen)

  const [menuState, setMenuState] = React.useState<{ photoId: string; anchorEl: HTMLElement } | null>(null)

  const allPhotos = usePlaceholderPhotos()
  const index = useMemo(() => buildIndex(allPhotos), [allPhotos])
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Initialize mode
  useEffect(() => {
    setActiveMode('demo')
  }, [setActiveMode])

  // Sync URL query param → search
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearchQuery(q)
  }, [searchParams, setSearchQuery])

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return allPhotos
    const results = searchIndex(index, debouncedSearch)
    return results.map((r) => r.photo)
  }, [debouncedSearch, index, allPhotos])

  const handleSelect = (id: string) => setSelectedPhotoId(id)
  const handleDeselect = () => setSelectedPhotoId(null)
  
  const handleMenuOpen = (photoId: string, anchorEl: HTMLElement) => {
    setMenuState({ photoId, anchorEl })
  }

  const handleUseAsClue = (photoId: string) => {
    setMenuState(null)
    setActiveClueId(photoId)
    // 100ms delay to allow menu animation to close (Phase 4 requirement)
    setTimeout(() => {
      setSheetOpen(true)
    }, 100)
  }

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (q.trim()) navigate(`/demo/search?q=${encodeURIComponent(q.trim())}`)
  }

  const handleClear = () => {
    setSearchQuery('')
    navigate('/demo')
  }

  // Group by date for timeline view
  const groups = useMemo(() => {
    if (debouncedSearch.trim()) return null // no groups when searching
    const map = new Map<string, Photo[]>()
    for (const photo of filtered) {
      const key = photo.dateTime
        ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(photo.dateTime)
        : 'Unknown Date'
      const list = map.get(key) ?? []
      list.push(photo)
      map.set(key, list)
    }
    return map
  }, [filtered, debouncedSearch])

  return (
    <div className="demo-page">
      {/* Search bar */}
      <div className="demo-page__search">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={handleClear}
          placeholder="Search demo photos, locations, events…"
          resultCount={debouncedSearch.trim() ? filtered.length : null}
        />
      </div>

      {/* Content */}
      {searchQuery.trim().length > 0 && searchQuery !== debouncedSearch ? (
        <SkeletonGrid label={`Searching for "${searchQuery}"…`} />
      ) : groups ? (
        /* Timeline grouped view */
        <div className="demo-page__timeline">
          {Array.from(groups.entries()).map(([dateLabel, photos]) => (
            <section key={dateLabel} className="timeline-group">
              <h2 className="timeline-group__label">{dateLabel}</h2>
              <PhotoGrid
                photos={photos}
                selectedPhotoId={selectedPhotoId}
                onSelect={handleSelect}
                onDeselect={handleDeselect}
                onMenuOpen={handleMenuOpen}
              />
            </section>
          ))}
        </div>
      ) : (
        /* Flat grid when searching */
        <div className="demo-page__flat-grid">
          <PhotoGrid
            photos={filtered}
            selectedPhotoId={selectedPhotoId}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
            onMenuOpen={handleMenuOpen}
            searchQuery={debouncedSearch}
            emptyMessage={`No photos found for "${debouncedSearch}"`}
          />
        </div>
      )}

      {menuState && (
        <ContextMenu
          photoId={menuState.photoId}
          anchorEl={menuState.anchorEl}
          onClose={() => setMenuState(null)}
          onUseAsClue={handleUseAsClue}
        />
      )}
    </div>
  )
}
