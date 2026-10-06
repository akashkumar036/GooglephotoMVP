import React, { useRef, useState } from 'react'
import { validateFiles } from '../analysis/validateFile'
import './ImportScreen.css'

export interface ImportScreenProps {
  onStartProcessing: (files: File[]) => void
}

/**
 * ImportScreen component for My Photos mode
 * Phase 11.1: Import Screen
 * Features:
 * - Large drop zone + "Add photos" button
 * - Multiple file picker (accept="image/*")
 * - Selected count ("47 photos selected")
 * - Privacy disclosure text
 * - "Continue" button
 */
export const ImportScreen: React.FC<ImportScreenProps> = ({ onStartProcessing }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFilesChosen = (files: FileList | File[]) => {
    const { validFiles, rejectedFiles } = validateFiles(files)

    if (rejectedFiles.length > 0) {
      setValidationErrors(rejectedFiles.map((r) => r.error))
    } else {
      setValidationErrors([])
    }

    if (validFiles.length > 0) {
      // Append or replace
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesChosen(e.target.files)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesChosen(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleTriggerPicker = () => {
    fileInputRef.current?.click()
  }

  const handleContinue = () => {
    if (selectedFiles.length > 0) {
      onStartProcessing(selectedFiles)
    }
  }

  return (
    <div className="import-screen">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        data-testid="photo-file-input"
      />

      {/* Large Drop Zone */}
      <div
        className={`import-screen__dropzone${isDragging ? ' import-screen__dropzone--dragging' : ''}`}
        onClick={handleTriggerPicker}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Drop zone to import photos"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleTriggerPicker()
          }
        }}
      >
        <div className="import-screen__icon-wrap">
          <span className="material-symbols-outlined import-screen__icon">cloud_upload</span>
        </div>

        <h2 className="import-screen__title">Import Your Photos</h2>
        <p className="import-screen__prompt">Import some photos to get started.</p>
        <p className="import-screen__desc">
          Drag and drop photos here, or tap to choose files from your device. Full on-device analysis
          including dates, locations, objects, and visual embeddings.
        </p>

        <div className="import-screen__actions">
          <button
            type="button"
            className="import-screen__add-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleTriggerPicker()
            }}
          >
            <span className="material-symbols-outlined">add_photo_alternate</span>
            <span>Add photos</span>
            <span style={{ display: 'none' }}>Select Photos</span>
          </button>
        </div>
      </div>

      {/* Selected files count and Continue button (Task 11.1) */}
      {selectedFiles.length > 0 && (
        <div className="import-screen__selected-bar" data-testid="import-selected-bar">
          <div className="import-screen__selected-info">
            <span className="material-symbols-outlined" style={{ color: '#8ab4f8' }}>
              photo_library
            </span>
            <span className="import-screen__selected-count">
              {selectedFiles.length} photo{selectedFiles.length === 1 ? '' : 's'} selected
            </span>
          </div>

          <button
            type="button"
            className="import-screen__continue-btn"
            onClick={handleContinue}
          >
            <span>Continue</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Validation Errors list */}
      {validationErrors.length > 0 && (
        <div className="import-screen__errors" role="alert">
          {validationErrors.map((err) => (
            <div key={err}>⚠️ {err}</div>
          ))}
        </div>
      )}

      {/* Privacy Disclosure Card (Task 11.1) */}
      <div className="import-screen__privacy-card">
        <span className="material-symbols-outlined import-screen__privacy-icon">lock</span>
        <div className="import-screen__privacy-text">
          <strong>Your photos stay on this device.</strong>
          Images are analyzed locally in your browser. Only text descriptions are sent to Google AI
          when you use <em>Let Photos find the best match</em>.
        </div>
      </div>
    </div>
  )
}
