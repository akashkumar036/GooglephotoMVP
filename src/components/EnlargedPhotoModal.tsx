/**
 * EnlargedPhotoModal — Google Photos authentic full-screen photo viewer
 * Modeled after the Google Photos web lightbox interface.
 * Features:
 * - Solid pure black backdrop (#000000)
 * - Top-left back button (arrow_back)
 * - Top-right Google Photos toolbar: Share, Edit (tune), Search/Lens, Info, Favorite (star), Delete, 3-dot (more_vert)
 * - 3-Dot Dropdown Menu matching Google Photos:
 *   - Use this photo as a clue
 *   - Slideshow
 *   - Download (Shift+D)
 *   - Rotate left (Shift+R)
 *   - Add to album
 *   - Add to documents
 *   - Add to screenshots & recordings
 *   - Archive (Shift+A)
 *   - Move to Locked Folder
 * - Floating side navigation arrows (< and >)
 * - Keyboard shortcuts: Escape, ArrowLeft, ArrowRight, Shift+D, Shift+R, 'i'
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../store/appStore'
import { findPhotoById } from '../utils/getPhoto'
import { demoPhotos } from '../data/demoPhotos'
import type { Photo } from '../types'
import './EnlargedPhotoModal.css'

export interface EnlargedPhotoModalProps {
  photoId?: string | null
  photosList?: Photo[]
  onClose?: () => void
}

export const EnlargedPhotoModal: React.FC<EnlargedPhotoModalProps> = ({
  photoId: propPhotoId,
  photosList: propPhotosList,
  onClose: propOnClose,
}) => {
  const storePhotoId = useAppStore((s) => s.enlargedPhotoId)
  const setEnlargedPhotoId = useAppStore((s) => s.setEnlargedPhotoId)
  const setActiveClueId = useAppStore((s) => s.setActiveClueId)
  const setSheetOpen = useAppStore((s) => s.setSheetOpen)
  const userPhotos = useAppStore((s) => s.userPhotos)
  const photosMap = useAppStore((s) => s.photos)
  const activeMode = useAppStore((s) => s.activeMode)

  const activeId = propPhotoId !== undefined ? propPhotoId : storePhotoId

  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)

  // Current photo
  const currentPhoto = useMemo(() => {
    return findPhotoById(activeId, userPhotos, photosMap)
  }, [activeId, userPhotos, photosMap])

  // Context photo collection for prev / next navigation
  const activePhotos = useMemo(() => {
    if (propPhotosList && propPhotosList.length > 0) return propPhotosList
    if (activeMode === 'my-photos' && userPhotos.length > 0) return userPhotos
    return demoPhotos
  }, [propPhotosList, activeMode, userPhotos])

  const currentIndex = useMemo(() => {
    if (!currentPhoto) return -1
    return activePhotos.findIndex((p) => p.id === currentPhoto.id)
  }, [currentPhoto, activePhotos])

  // Reset rotation when switching photo
  const [prevId, setPrevId] = useState(activeId)
  if (prevId !== activeId) {
    setPrevId(activeId)
    setRotation(0)
  }

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 2200)
  }, [])

  const handleClose = useCallback(() => {
    setMenuOpen(false)
    setInfoOpen(false)
    if (propOnClose) {
      propOnClose()
    } else {
      setEnlargedPhotoId(null)
    }
  }, [propOnClose, setEnlargedPhotoId])

  const handlePrev = useCallback(() => {
    if (currentIndex <= 0) return
    const prevPhoto = activePhotos[currentIndex - 1]
    if (prevPhoto) setEnlargedPhotoId(prevPhoto.id)
  }, [currentIndex, activePhotos, setEnlargedPhotoId])

  const handleNext = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= activePhotos.length - 1) return
    const nextPhoto = activePhotos[currentIndex + 1]
    if (nextPhoto) setEnlargedPhotoId(nextPhoto.id)
  }, [currentIndex, activePhotos, setEnlargedPhotoId])

  const handleUseAsClue = useCallback(() => {
    if (!currentPhoto) return
    const id = currentPhoto.id
    handleClose()
    setActiveClueId(id)
    setTimeout(() => {
      setSheetOpen(true)
    }, 80)
  }, [currentPhoto, handleClose, setActiveClueId, setSheetOpen])

  const handleDownload = useCallback(() => {
    if (!currentPhoto) return
    setMenuOpen(false)
    const link = document.createElement('a')
    link.href = currentPhoto.imageUrl
    link.download = currentPhoto.filename || `photo-${currentPhoto.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Downloading photo…')
  }, [currentPhoto, showToast])

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => r - 90)
    setMenuOpen(false)
    showToast('Rotated 90° left')
  }, [showToast])

  const handleToggleFavorite = useCallback(() => {
    setIsFavorite((fav) => {
      const next = !fav
      showToast(next ? 'Added to favorites' : 'Removed from favorites')
      return next
    })
  }, [showToast])

  const handleCopyId = useCallback(() => {
    if (!currentPhoto) return
    navigator.clipboard?.writeText(currentPhoto.id).catch(() => {})
    setMenuOpen(false)
    showToast(`Copied photo ID: ${currentPhoto.id}`)
  }, [currentPhoto, showToast])

  // Keyboard shortcuts (Google Photos shortcuts)
  useEffect(() => {
    if (!activeId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false)
        else if (infoOpen) setInfoOpen(false)
        else handleClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        handleDownload()
      } else if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault()
        handleRotateLeft()
      } else if (e.key === 'i' || e.key === 'I') {
        setInfoOpen((o) => !o)
      } else if (e.key === 'c' || e.key === 'C') {
        handleUseAsClue()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeId, menuOpen, infoOpen, handleClose, handlePrev, handleNext, handleDownload, handleRotateLeft, handleUseAsClue])

  // Dismiss menu on outside click
  useEffect(() => {
    if (!menuOpen) return

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  if (!activeId || !currentPhoto) return null

  const formattedDate = currentPhoto.dateTime
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(currentPhoto.dateTime)
    : 'Unknown date'

  const modalContent = (
    <div
      className="gp-lightbox-root"
      role="dialog"
      aria-modal="true"
      aria-label={`Enlarged photo: ${currentPhoto.description || currentPhoto.filename}`}
    >
      {/* Toast Notification */}
      {toastMessage && <div className="gp-lightbox__toast">{toastMessage}</div>}

      {/* Top Bar (Exact Google Photos Layout) */}
      <header className="gp-lightbox__header">
        {/* Left: Back Arrow Button */}
        <div className="gp-lightbox__header-left">
          <button
            className="gp-lightbox__icon-btn"
            onClick={handleClose}
            aria-label="Close enlarged view"
            title="Back (Esc)"
            type="button"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>

        {/* Right: Google Photos Toolbar (Share, Edit, Search, Info, Favorite, Delete, 3-Dot) */}
        <div className="gp-lightbox__header-right">
          {/* Share */}
          <button
            className="gp-lightbox__icon-btn"
            onClick={() => {
              handleCopyId()
            }}
            aria-label="Share"
            title="Share"
            type="button"
          >
            <span className="material-symbols-outlined">share</span>
          </button>

          {/* Edit (tune) */}
          <button
            className="gp-lightbox__icon-btn"
            onClick={() => {
              showToast('Edit mode (preset filters ready)')
            }}
            aria-label="Edit"
            title="Edit"
            type="button"
          >
            <span className="material-symbols-outlined">tune</span>
          </button>

          {/* Search / Lens */}
          <button
            className="gp-lightbox__icon-btn"
            onClick={handleUseAsClue}
            aria-label="Search with clue"
            title="Search with Memory Clue"
            type="button"
          >
            <span className="material-symbols-outlined">search</span>
          </button>

          {/* Info */}
          <button
            className={`gp-lightbox__icon-btn${infoOpen ? ' gp-lightbox__icon-btn--active' : ''}`}
            onClick={() => setInfoOpen(!infoOpen)}
            aria-label="Photo info and details"
            title="Info (i)"
            type="button"
          >
            <span className="material-symbols-outlined">info</span>
          </button>

          {/* Favorite (Star) */}
          <button
            className={`gp-lightbox__icon-btn${isFavorite ? ' gp-lightbox__icon-btn--favorite' : ''}`}
            onClick={handleToggleFavorite}
            aria-label="Favorite"
            title={isFavorite ? 'Remove from favorites' : 'Favorite'}
            type="button"
          >
            <span className="material-symbols-outlined">
              {isFavorite ? 'star' : 'star_border'}
            </span>
          </button>

          {/* Delete (Trash) */}
          <button
            className="gp-lightbox__icon-btn"
            onClick={() => showToast('Demo photo is protected')}
            aria-label="Delete"
            title="Delete"
            type="button"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>

          {/* 3-Dot More options Setting Button */}
          <button
            ref={settingsBtnRef}
            className={`gp-lightbox__icon-btn${menuOpen ? ' gp-lightbox__icon-btn--active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="More photo options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="More options"
            type="button"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>

          {/* 3-Dot Dropdown Menu (Exact Google Photos Screenshot 2) */}
          {menuOpen && (
            <div
              ref={menuRef}
              className="gp-lightbox__menu"
              role="menu"
              aria-label="Photo options menu"
            >
              {/* Highlighted Clue Action */}
              <button
                className="gp-lightbox__menu-item gp-lightbox__menu-item--accent"
                role="menuitem"
                onClick={handleUseAsClue}
                type="button"
              >
                <div className="gp-lightbox__menu-item-left">
                  <span className="material-symbols-outlined">magic_button</span>
                  <span>Use this photo as a clue</span>
                </div>
                <span className="gp-lightbox__menu-shortcut">C</span>
              </button>

              <div className="gp-lightbox__menu-divider" />

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  showToast('Starting slideshow…')
                }}
                type="button"
              >
                <span>Slideshow</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={handleDownload}
                type="button"
              >
                <span>Download</span>
                <span className="gp-lightbox__menu-shortcut">Shift+D</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={handleRotateLeft}
                type="button"
              >
                <span>Rotate left</span>
                <span className="gp-lightbox__menu-shortcut">Shift+R</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  showToast('Added to album')
                }}
                type="button"
              >
                <span>Add to album</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  showToast('Categorized under documents')
                }}
                type="button"
              >
                <span>Add to documents</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  showToast('Added to screenshots & recordings')
                }}
                type="button"
              >
                <span>Add to screenshots & recordings</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  showToast('Archived photo')
                }}
                type="button"
              >
                <span>Archive</span>
                <span className="gp-lightbox__menu-shortcut">Shift+A</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  showToast('Moved to Locked Folder')
                }}
                type="button"
              >
                <span>Move to Locked Folder</span>
              </button>

              <div className="gp-lightbox__menu-divider" />

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setInfoOpen(true)
                }}
                type="button"
              >
                <span>Photo details & metadata</span>
                <span className="gp-lightbox__menu-shortcut">i</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={handleCopyId}
                type="button"
              >
                <span>Copy photo ID</span>
              </button>

              <button
                className="gp-lightbox__menu-item"
                role="menuitem"
                onClick={() => {
                  window.open(currentPhoto.imageUrl, '_blank')
                  setMenuOpen(false)
                }}
                type="button"
              >
                <span>Open image in new tab</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Center Image Stage */}
      <div
        className="gp-lightbox__stage"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
      >
        {/* Floating Left Chevron Navigation Arrow */}
        {currentIndex > 0 && (
          <button
            className="gp-lightbox__nav-btn gp-lightbox__nav-btn--prev"
            onClick={handlePrev}
            aria-label="Previous photo"
            title="Previous (Left arrow)"
            type="button"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        )}

        {/* Center Image Display */}
        <div className="gp-lightbox__img-container">
          <img
            key={currentPhoto.id}
            src={currentPhoto.imageUrl || currentPhoto.thumbnailUrl}
            alt={currentPhoto.description || currentPhoto.filename}
            className="gp-lightbox__img"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        </div>

        {/* Floating Right Chevron Navigation Arrow */}
        {currentIndex >= 0 && currentIndex < activePhotos.length - 1 && (
          <button
            className="gp-lightbox__nav-btn gp-lightbox__nav-btn--next"
            onClick={handleNext}
            aria-label="Next photo"
            title="Next (Right arrow)"
            type="button"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        )}
      </div>

      {/* Info Sidebar Drawer (Google Photos info panel) */}
      {infoOpen && (
        <aside className="gp-lightbox__info-panel" aria-label="Photo metadata drawer">
          <div className="gp-lightbox__info-header">
            <h2 className="gp-lightbox__info-title">Photo Info</h2>
            <button
              className="gp-lightbox__icon-btn"
              onClick={() => setInfoOpen(false)}
              aria-label="Close info panel"
              title="Close"
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="gp-lightbox__info-section">
            <span className="gp-lightbox__info-label">Title / Caption</span>
            <span className="gp-lightbox__info-val">
              {currentPhoto.description || currentPhoto.filename}
            </span>
          </div>

          <div className="gp-lightbox__info-section">
            <span className="gp-lightbox__info-label">Date & Time</span>
            <span className="gp-lightbox__info-val">
              <span className="material-symbols-outlined">calendar_today</span>
              {formattedDate}
            </span>
          </div>

          {currentPhoto.locationName && (
            <div className="gp-lightbox__info-section">
              <span className="gp-lightbox__info-label">Location</span>
              <span className="gp-lightbox__info-val">
                <span className="material-symbols-outlined">location_on</span>
                {currentPhoto.locationName}
              </span>
              {currentPhoto.latitude && currentPhoto.longitude && (
                <span style={{ fontSize: '0.8rem', color: '#9aa0a6', marginLeft: 28 }}>
                  {currentPhoto.latitude.toFixed(4)}° N, {currentPhoto.longitude.toFixed(4)}° E
                </span>
              )}
            </div>
          )}

          {currentPhoto.objects && currentPhoto.objects.length > 0 && (
            <div className="gp-lightbox__info-section">
              <span className="gp-lightbox__info-label">Detected Objects</span>
              <div className="gp-lightbox__chips-row">
                {currentPhoto.objects.map((obj) => (
                  <span key={obj} className="gp-lightbox__chip">
                    {obj}
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentPhoto.labels && currentPhoto.labels.length > 0 && (
            <div className="gp-lightbox__info-section">
              <span className="gp-lightbox__info-label">Categories</span>
              <div className="gp-lightbox__chips-row">
                {currentPhoto.labels.map((lbl) => (
                  <span key={lbl} className="gp-lightbox__chip">
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentPhoto.ocrText && (
            <div className="gp-lightbox__info-section">
              <span className="gp-lightbox__info-label">Detected Text (OCR)</span>
              <div className="gp-lightbox__ocr-box">{currentPhoto.ocrText}</div>
            </div>
          )}

          <div className="gp-lightbox__info-section">
            <span className="gp-lightbox__info-label">Details</span>
            <span className="gp-lightbox__info-val">
              <span className="material-symbols-outlined">image</span>
              {currentPhoto.filename} ({currentPhoto.width || 800} × {currentPhoto.height || 600})
            </span>
          </div>
        </aside>
      )}

      {/* Bottom Floating Bar */}
      {currentIndex >= 0 && (
        <footer className="gp-lightbox__footer">
          <span className="gp-lightbox__counter">
            {currentIndex + 1} of {activePhotos.length}
          </span>
        </footer>
      )}
    </div>
  )

  return createPortal(modalContent, document.body)
}
