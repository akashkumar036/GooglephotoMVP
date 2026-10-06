import React, { useEffect } from 'react'
import './ClearPhotosModal.css'

export interface ClearPhotosModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  photoCount?: number
}

export const ClearPhotosModal: React.FC<ClearPhotosModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="clear-modal__backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="clear-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-photos-title"
        aria-describedby="clear-photos-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clear-modal__icon-wrap">
          <span className="material-symbols-outlined clear-modal__icon">delete_forever</span>
        </div>

        <h2 id="clear-photos-title" className="clear-modal__title">
          Clear all photos?
        </h2>

        <p id="clear-photos-desc" className="clear-modal__description">
          This will remove all your imported photos and associated data from this device.
        </p>

        <div className="clear-modal__actions">
          <button
            type="button"
            className="clear-modal__btn clear-modal__btn--cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="clear-modal__btn clear-modal__btn--confirm"
            onClick={onConfirm}
          >
            Clear photos
          </button>
        </div>
      </div>
    </div>
  )
}
