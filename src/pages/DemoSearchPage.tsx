/**
 * DemoSearchPage — shows filtered grid for search results under /demo/search or /my-photos/search
 */
import React, { useEffect, useMemo } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { PhotoGrid } from '../components/PhotoGrid'
import { useAppStore } from '../store/appStore'
import { usePlaceholderPhotos } from '../hooks/usePlaceholderPhotos'
import { useDebounce } from '../hooks/useDebounce'
import { buildIndex, searchIndex } from '../engine/searchIndex'
import { ContextMenu } from '../components/ContextMenu'
import { SkeletonGrid } from '../components/SkeletonGrid'
import { getAllPhotos } from '../storage/photoDb'
import './DemoSearchPage.css'

export const DemoSearchPage: React.FC = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const activeMode = useAppStore((s) => s.activeMode)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const selectedPhotoId = useAppStore((s) => s.selectedPhotoId)
  const setSelectedPhotoId = useAppStore((s) => s.setSelectedPhotoId)
  const setActiveClueId = useAppStore((s) => s.setActiveClueId)
  const setSheetOpen = useAppStore((s) => s.setSheetOpen)
  const userPhotos = useAppStore((s) => s.userPhotos)

  const isUserMode = activeMode === 'my-photos' || location.pathname.startsWith('/my-photos')

  const [menuState, setMenuState] = React.useState<{ photoId: string; anchorEl: HTMLElement } | null>(null)

  // Hydrate user photos from IndexedDB if entering /my-photos/search directly
  useEffect(() => {
    if (isUserMode && userPhotos.length === 0) {
      getAllPhotos().then((stored) => {
        if (stored && stored.length > 0) {
          const map = new Map(useAppStore.getState().photos)
          stored.forEach((p) => map.set(p.id, p))
          useAppStore.setState({ userPhotos: stored, photos: map })
        }
      })
    }
  }, [isUserMode, userPhotos.length])

  const demoPhotosList = usePlaceholderPhotos()
  const allPhotos = useMemo(() => {
    return isUserMode ? userPhotos : demoPhotosList
  }, [isUserMode, userPhotos, demoPhotosList])

  const index = useMemo(() => buildIndex(allPhotos), [allPhotos])
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Sync URL param on mount
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q && q !== searchQuery) setSearchQuery(q)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return allPhotos
    const results = searchIndex(index, debouncedSearch)
    return results.map((r) => r.photo)
  }, [debouncedSearch, index, allPhotos])

  const handleMenuOpen = (photoId: string, anchorEl: HTMLElement) => {
    setMenuState({ photoId, anchorEl })
  }

  const handleUseAsClue = (photoId: string) => {
    setMenuState(null)
    setActiveClueId(photoId)
    setTimeout(() => {
      setSheetOpen(true)
    }, 100)
  }

  const emptyMessage = useMemo(() => {
    if (isUserMode && allPhotos.length === 0) {
      return 'No photos in your library. Import photos to get started.'
    }
    return `No photos match "${debouncedSearch}"`
  }, [isUserMode, allPhotos.length, debouncedSearch])

  return (
    <div className="demo-search-page">
      {debouncedSearch.trim() && (
        <div className="demo-search-page__header">
          <span className="demo-search-page__count">
            {filtered.length} {filtered.length === 1 ? 'photo' : 'photos'} found
          </span>
        </div>
      )}

      {searchQuery.trim().length > 0 && searchQuery !== debouncedSearch ? (
        <SkeletonGrid label={`Searching for "${searchQuery}"…`} />
      ) : (
        <PhotoGrid
          photos={filtered}
          selectedPhotoId={selectedPhotoId}
          onSelect={(id) => setSelectedPhotoId(id)}
          onDeselect={() => setSelectedPhotoId(null)}
          onMenuOpen={handleMenuOpen}
          searchQuery={debouncedSearch}
          emptyMessage={emptyMessage}
        />
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

