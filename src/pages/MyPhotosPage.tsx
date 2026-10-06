import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { ImportScreen } from '../components/ImportScreen'
import { ProcessingScreen } from '../components/ProcessingScreen'
import { PhotoGrid } from '../components/PhotoGrid'
import { ContextMenu } from '../components/ContextMenu'
import { ClearPhotosModal } from '../components/ClearPhotosModal'
import { SessionRestoreNotice } from '../components/SessionRestoreNotice'
import { Toast } from '../components/Toast'
import { processPhotosPipeline } from '../analysis/pipeline'
import { getAllPhotos } from '../storage/photoDb'
import {
  clearAllUserData,
  hasAcknowledgedSession,
  setSessionAcknowledged,
} from '../engine/dataManagement'
import type { Photo } from '../types'
import './MyPhotosPage.css'

export const MyPhotosPage: React.FC = () => {
  const setActiveMode = useAppStore((s) => s.setActiveMode)
  const userPhotos = useAppStore((s) => s.userPhotos)
  const isProcessing = useAppStore((s) => s.isProcessing)
  const processingProgress = useAppStore((s) => s.processingProgress)
  const selectedPhotoId = useAppStore((s) => s.selectedPhotoId)
  const setSelectedPhotoId = useAppStore((s) => s.setSelectedPhotoId)
  const setActiveClueId = useAppStore((s) => s.setActiveClueId)
  const setSheetOpen = useAppStore((s) => s.setSheetOpen)

  const [showImportModal, setShowImportModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [menuState, setMenuState] = useState<{ photoId: string; anchorEl: HTMLElement } | null>(null)
  const [sessionNoticePhotos, setSessionNoticePhotos] = useState<Photo[] | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    setActiveMode('my-photos')
  }, [setActiveMode])

  // Hydrate stored photos from IndexedDB and check for previous session notice (Phase 14.3)
  useEffect(() => {
    getAllPhotos().then((stored) => {
      if (!stored || stored.length === 0) return

      if (!hasAcknowledgedSession()) {
        setSessionNoticePhotos(stored)
        // Also hydrate photos into store so they are ready if user continues
        const photosMap = new Map(useAppStore.getState().photos)
        stored.forEach((p) => photosMap.set(p.id, p))
        useAppStore.setState({ userPhotos: stored, photos: photosMap })
      } else if (useAppStore.getState().userPhotos.length === 0) {
        const photosMap = new Map(useAppStore.getState().photos)
        stored.forEach((p) => photosMap.set(p.id, p))
        useAppStore.setState({ userPhotos: stored, photos: photosMap })
      }
    })
  }, [])

  const handleStartProcessing = (files: File[]) => {
    setShowImportModal(false)
    useAppStore.setState({ isProcessing: true })
    processPhotosPipeline(files)
      .then((res) => {
        if (res.rejectedCount > 0 && res.errors.length > 0) {
          const firstErr = res.errors[0]
          const formatted = firstErr.includes('format not supported')
            ? firstErr.split('(')[0].trim()
            : firstErr
          setToastMessage(formatted)
          setShowToast(true)
        }
      })
      .catch((err) => {
        console.error('Error in photo processing pipeline:', err)
        useAppStore.setState({ isProcessing: false })
        setToastMessage("Couldn't analyze selected photos")
        setShowToast(true)
      })
  }

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

  const handleConfirmClear = async () => {
    setShowClearModal(false)
    setSessionNoticePhotos(null)
    await clearAllUserData()
    setShowImportModal(false)
    setToastMessage('Your photos have been removed')
    setShowToast(true)
  }

  const handleSessionContinue = () => {
    setSessionAcknowledged()
    setSessionNoticePhotos(null)
  }

  const handleSessionClearAndStartFresh = async () => {
    setSessionAcknowledged()
    setSessionNoticePhotos(null)
    await clearAllUserData()
    setShowImportModal(false)
    setToastMessage('Your photos have been removed')
    setShowToast(true)
  }

  const totalPhotosCount = userPhotos.length

  return (
    <div className="my-photos-page">
      <div className="my-photos-page__header">
        <div className="my-photos-page__header-left">
          <h1 className="my-photos-page__title">My Photos</h1>
          {totalPhotosCount > 0 && (
            <span className="my-photos-page__count">{totalPhotosCount} photos</span>
          )}
        </div>

        <div className="my-photos-page__header-actions">
          {/* Phase 14.1 Persistent Privacy Badge with Tooltip */}
          <div
            className="privacy-badge"
            title="Your photos are only used for this prototype session"
            aria-label="Photos stored locally. Your photos are only used for this prototype session"
            tabIndex={0}
          >
            <span className="material-symbols-outlined privacy-badge__icon" aria-hidden="true">
              lock
            </span>
            <span>Photos stored locally</span>
            <div className="privacy-badge__tooltip" role="tooltip">
              Your photos are only used for this prototype session
            </div>
          </div>

          {/* Phase 14.2 Clear My Photos Action */}
          {totalPhotosCount > 0 && !isProcessing && (
            <button
              type="button"
              className="my-photos-page__clear-btn"
              onClick={() => setShowClearModal(true)}
              aria-label="Clear my photos"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                delete
              </span>
              <span>Clear my photos</span>
            </button>
          )}

          {totalPhotosCount > 0 && !isProcessing && (
            <button
              type="button"
              className="my-photos-page__add-more-btn"
              onClick={() => setShowImportModal(true)}
            >
              <span className="material-symbols-outlined">add_photo_alternate</span>
              <span>Add photos</span>
            </button>
          )}
        </div>
      </div>

      {/* Phase 14.3 Session Expiry / Restore Notice */}
      {sessionNoticePhotos && sessionNoticePhotos.length > 0 && !isProcessing && (
        <SessionRestoreNotice
          photoCount={sessionNoticePhotos.length}
          onContinue={handleSessionContinue}
          onClearAndStartFresh={handleSessionClearAndStartFresh}
        />
      )}

      {/* Main Content Area */}
      <div className="my-photos-page__content">
        {isProcessing ? (
          <ProcessingScreen progress={processingProgress} />
        ) : totalPhotosCount === 0 || showImportModal ? (
          <div className="my-photos-page__import-wrap">
            {showImportModal && totalPhotosCount > 0 && (
              <button
                type="button"
                className="my-photos-page__cancel-import-btn"
                onClick={() => setShowImportModal(false)}
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Back to photos</span>
              </button>
            )}
            <ImportScreen onStartProcessing={handleStartProcessing} />
          </div>
        ) : (
          <div className="my-photos-page__grid-wrap">
            <PhotoGrid
              photos={userPhotos}
              selectedPhotoId={selectedPhotoId}
              onSelect={(id) => setSelectedPhotoId(id)}
              onDeselect={() => setSelectedPhotoId(null)}
              onMenuOpen={handleMenuOpen}
            />
          </div>
        )}
      </div>

      {menuState && (
        <ContextMenu
          photoId={menuState.photoId}
          anchorEl={menuState.anchorEl}
          onClose={() => setMenuState(null)}
          onUseAsClue={handleUseAsClue}
        />
      )}

      {/* Phase 14.2 Clear Photos Confirmation Dialog */}
      <ClearPhotosModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleConfirmClear}
        photoCount={totalPhotosCount}
      />

      {/* Phase 14.2 Toast Feedback */}
      <Toast
        isOpen={showToast}
        message={toastMessage || ''}
        onClose={() => setShowToast(false)}
      />
    </div>
  )
}

