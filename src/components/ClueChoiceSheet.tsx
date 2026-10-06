import React, { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BottomSheet } from './BottomSheet'
import { useAppStore } from '../store/appStore'
import { findPhotoById } from '../utils/getPhoto'
import type { RetrievalMode } from '../types'
import './ClueChoiceSheet.css'

interface RetrievalOption {
  mode: RetrievalMode
  emoji: string
  iconName: string
  title: string
  description: string
  badgeLabel: string
}

const RETRIEVAL_OPTIONS: RetrievalOption[] = [
  {
    mode: 'similar',
    emoji: '🔍',
    iconName: 'search',
    title: 'Search similar to this photo',
    description: 'Find photos that look like this',
    badgeLabel: 'Visual similarity',
  },
  {
    mode: 'memory',
    emoji: '📍',
    iconName: 'place',
    title: 'Search around this memory',
    description: 'Find photos connected to this moment, place, people or event',
    badgeLabel: 'Context & timeline',
  },
  {
    mode: 'best',
    emoji: '✨',
    iconName: 'auto_awesome',
    title: 'Let Photos find the best match',
    description: "Use the clues most likely to find what you're looking for",
    badgeLabel: 'Smart clue match',
  },
]

export interface ClueChoiceSheetProps {
  onRetrievalTriggered?: (mode: RetrievalMode, cluePhotoId: string) => void
}

export const ClueChoiceSheet: React.FC<ClueChoiceSheetProps> = ({ onRetrievalTriggered }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const sheetOpen = useAppStore((s) => s.sheetOpen)
  const setSheetOpen = useAppStore((s) => s.setSheetOpen)
  const activeClueId = useAppStore((s) => s.activeClueId)
  const setSelectedMode = useAppStore((s) => s.setSelectedMode)
  const userPhotos = useAppStore((s) => s.userPhotos)
  const photosMap = useAppStore((s) => s.photos)
  const activeMode = useAppStore((s) => s.activeMode)

  const cluePhoto = useMemo(() => {
    return findPhotoById(activeClueId, userPhotos, photosMap)
  }, [activeClueId, userPhotos, photosMap])

  const handleClose = () => {
    setSheetOpen(false)
  }

  const handleSelectMode = (mode: RetrievalMode) => {
    if (!activeClueId) return

    // 1. Update mode in store
    setSelectedMode(mode)

    // 2. Update clue chain (Phase 10.1)
    const currentChain = useAppStore.getState().clueChain
    const addClueStep = useAppStore.getState().addClueStep
    const stepLabel = cluePhoto?.eventId || cluePhoto?.filename

    if (!currentChain || currentChain.steps.length === 0) {
      addClueStep({
        stepIndex: 0,
        cluePhotoId: activeClueId,
        mode,
        resultIds: [],
        label: stepLabel,
      })
    } else {
      const lastStep = currentChain.steps[currentChain.steps.length - 1]
      if (lastStep.cluePhotoId !== activeClueId) {
        addClueStep({
          stepIndex: currentChain.steps.length,
          cluePhotoId: activeClueId,
          mode,
          resultIds: [],
          label: stepLabel,
        })
      }
    }

    // 3. Close sheet
    setSheetOpen(false)

    // 4. Optional callback hook for retrieval engines
    onRetrievalTriggered?.(mode, activeClueId)

    // 5. Navigate to results view
    const isUserMode = activeMode === 'my-photos' || location.pathname.startsWith('/my-photos')
    const basePath = isUserMode ? '/my-photos' : '/demo'
    navigate(`${basePath}/results?mode=${mode}&clue=${encodeURIComponent(activeClueId)}`)
  }

  return (
    <BottomSheet
      isOpen={sheetOpen}
      onClose={handleClose}
      ariaLabel="Use this photo as a clue"
      className="clue-choice-sheet"
    >
      <div className="clue-choice-sheet__container">
        {/* Header with 60x60px clue thumbnail and title */}
        <div className="clue-choice-sheet__header">
          <div className="clue-choice-sheet__thumb-wrapper">
            {cluePhoto ? (
              <img
                src={cluePhoto.thumbnailUrl || cluePhoto.imageUrl}
                alt={cluePhoto.description || 'Clue photo'}
                className="clue-choice-sheet__thumb"
                data-testid="clue-thumbnail"
              />
            ) : (
              <div className="clue-choice-sheet__thumb clue-choice-sheet__thumb--placeholder">
                <span className="material-symbols-outlined">image</span>
              </div>
            )}
          </div>

          <div className="clue-choice-sheet__header-info">
            <h2 className="clue-choice-sheet__title">Use this photo as a clue</h2>
            <p className="clue-choice-sheet__subtitle" data-testid="clue-choice-sheet-subtitle">
              {"What do you think this photo tells you about the memory you're looking for?"}
            </p>
          </div>
        </div>

        {/* 3 Strategy Option Cards */}
        <div className="clue-choice-sheet__options" role="list">
          {RETRIEVAL_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              role="listitem"
              aria-label={`${opt.title}: ${opt.description}`}
              className={`clue-choice-sheet__card clue-choice-sheet__card--${opt.mode}`}
              onClick={() => handleSelectMode(opt.mode)}
              data-testid={`clue-option-${opt.mode}`}
            >
              <div className="clue-choice-sheet__card-icon-container">
                <span className="clue-choice-sheet__emoji" aria-hidden="true">
                  {opt.emoji}
                </span>
              </div>

              <div className="clue-choice-sheet__card-text">
                <div className="clue-choice-sheet__card-title">{opt.title}</div>
                <div className="clue-choice-sheet__card-desc">{opt.description}</div>
              </div>

              <div className="clue-choice-sheet__card-arrow">
                <span className="material-symbols-outlined">chevron_right</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
