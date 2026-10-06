import React, { useMemo, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { findPhotoById } from '../utils/getPhoto'
import { retrieveSimilar } from '../engine/retrieveSimilar'
import { retrieveMemory } from '../engine/retrieveMemory'
import { retrieveBest } from '../engine/retrieveBest'
import { demoPhotos } from '../data/demoPhotos'
import { ResultsGrid } from '../components/ResultsGrid'
import { ClueBreadcrumb } from '../components/ClueBreadcrumb'
import { ContextMenu } from '../components/ContextMenu'
import { AiDisclosureModal } from '../components/AiDisclosureModal'
import { FeedbackPrompt } from '../components/FeedbackPrompt'
import { FeedbackDebugPanel } from '../components/FeedbackDebugPanel'
import { getAllPhotos } from '../storage/photoDb'
import { rankCandidatesWithAi, getAvailableAiProvider } from '../engine/aiRankingClient'
import type { BestMatchResult } from '../engine/retrieveBest'
import type { RetrievalMode, RetrievalResult } from '../types'
import './ResultsPage.css'

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const modeParam = searchParams.get('mode') as RetrievalMode | null
  const clueParam = searchParams.get('clue')

  const selectedMode = useAppStore((s) => s.selectedMode) || modeParam || 'similar'
  const activeClueId = useAppStore((s) => s.activeClueId) || clueParam
  const userPhotos = useAppStore((s) => s.userPhotos)
  const photosMap = useAppStore((s) => s.photos)
  const activeMode = useAppStore((s) => s.activeMode)
  const selectedPhotoId = useAppStore((s) => s.selectedPhotoId)
  const clueChain = useAppStore((s) => s.clueChain)
  const setSelectedPhotoId = useAppStore((s) => s.setSelectedPhotoId)
  const setActiveClueId = useAppStore((s) => s.setActiveClueId)
  const setSelectedMode = useAppStore((s) => s.setSelectedMode)
  const setSheetOpen = useAppStore((s) => s.setSheetOpen)
  const setClueResults = useAppStore((s) => s.setClueResults)
  const addClueStep = useAppStore((s) => s.addClueStep)
  const truncateChainToStep = useAppStore((s) => s.truncateChainToStep)
  const updateStepResultIds = useAppStore((s) => s.updateStepResultIds)
  const resetClueChain = useAppStore((s) => s.resetClueChain)

  const [menuState, setMenuState] = useState<{ photoId: string; anchorEl: HTMLElement } | null>(null)
  const [aiResults, setAiResults] = useState<RetrievalResult[] | null>(null)
  const [isAiRanking, setIsAiRanking] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [hasDismissedDisclosure, setHasDismissedDisclosure] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const showDisclosure = useMemo(() => {
    if (selectedMode !== 'best' || hasDismissedDisclosure) return false
    if (getAvailableAiProvider() === 'none') return false
    if (typeof window === 'undefined') return false
    return localStorage.getItem('memory_clue_ai_consent') === null
  }, [selectedMode, hasDismissedDisclosure])

  const isUserMode = activeMode === 'my-photos' || window.location.pathname.startsWith('/my-photos')
  const basePath = isUserMode ? '/my-photos' : '/demo'

  // Hydrate user photos from IndexedDB if entering user results directly
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

  const cluePhoto = useMemo(() => {
    return findPhotoById(activeClueId, userPhotos, photosMap)
  }, [activeClueId, userPhotos, photosMap])

  // Select target dataset (userPhotos or demoPhotos)
  const dataset = useMemo(() => {
    return isUserMode ? userPhotos : demoPhotos
  }, [isUserMode, userPhotos])

  // Auto-initialize first clue step if chain is empty (Phase 10.1)
  useEffect(() => {
    if (activeClueId && (!clueChain || clueChain.steps.length === 0)) {
      addClueStep({
        stepIndex: 0,
        cluePhotoId: activeClueId,
        mode: selectedMode,
        resultIds: [],
        label: cluePhoto?.eventId || cluePhoto?.filename,
      })
    }
  }, [activeClueId, selectedMode, clueChain, addClueStep, cluePhoto])

  // Previous clues in chain to exclude (Phase 10.3)
  const priorClueIds = useMemo(() => {
    if (!clueChain || clueChain.steps.length <= 1) return []
    return clueChain.steps
      .slice(0, clueChain.steps.length - 1)
      .map((s) => s.cluePhotoId)
  }, [clueChain])

  // Result IDs already seen in previous hops to penalize (Phase 10.3)
  const seenResultIds = useMemo(() => {
    if (!clueChain || clueChain.steps.length <= 1) return []
    return clueChain.steps
      .slice(0, clueChain.steps.length - 1)
      .flatMap((s) => s.resultIds)
  }, [clueChain])

  // Compute local retrieval results based on mode with chaining exclusion & penalty
  const results = useMemo(() => {
    if (!activeClueId) return []

    const retrievalOptions = {
      excludeIds: priorClueIds,
      seenResultIds,
    }

    if (selectedMode === 'similar') {
      return retrieveSimilar(activeClueId, dataset, retrievalOptions)
    }

    if (selectedMode === 'memory') {
      return retrieveMemory(activeClueId, dataset, retrievalOptions)
    }

    if (selectedMode === 'best') {
      return retrieveBest(activeClueId, dataset, retrievalOptions)
    }

    return []
  }, [selectedMode, activeClueId, dataset, priorClueIds, seenResultIds])

  // AI re-ranking for Best Match mode (Phase 13)
  useEffect(() => {
    let isCancelled = false

    if (selectedMode === 'best' && cluePhoto && results.length > 0) {
      const provider = getAvailableAiProvider()
      if (provider === 'none') {
        return
      }

      const consent = typeof window !== 'undefined' ? localStorage.getItem('memory_clue_ai_consent') : null
      if (consent === 'accepted') {
        queueMicrotask(() => {
          if (!isCancelled) {
            setIsAiRanking(true)
            setAiError(null)
          }
        })

        const localCandidates = results as BestMatchResult[]
        rankCandidatesWithAi(cluePhoto, localCandidates, provider)
          .then((res) => {
            if (isCancelled) return
            if (res.usedAi) {
              setAiResults(res.results)
            } else {
              setAiResults(null)
              if (res.error) setAiError(res.error)
            }
          })
          .catch((err) => {
            if (isCancelled) return
            console.warn('AI ranking error:', err)
            setAiResults(null)
            setAiError('Best match is temporarily unavailable. Using local analysis instead.')
          })
          .finally(() => {
            if (!isCancelled) setIsAiRanking(false)
          })
      }
    }

    return () => {
      isCancelled = true
    }
  }, [selectedMode, activeClueId, cluePhoto, results, hasDismissedDisclosure])

  const handleAcceptDisclosure = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('memory_clue_ai_consent', 'accepted')
    }
    setHasDismissedDisclosure(true)
  }

  const handleDeclineDisclosure = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('memory_clue_ai_consent', 'declined')
    }
    setHasDismissedDisclosure(true)
    setAiResults(null)
  }


  const displayResults = (selectedMode === 'best' && aiResults) ? aiResults : results

  // Synchronize computed results with store
  useEffect(() => {
    setClueResults(displayResults)
  }, [displayResults, setClueResults])

  // Record computed result IDs into current step for subsequent hop exclusion
  useEffect(() => {
    if (clueChain && clueChain.steps.length > 0 && displayResults.length > 0) {
      const currentIdx = clueChain.steps.length - 1
      const currentStep = clueChain.steps[currentIdx]
      if (currentStep.cluePhotoId === activeClueId && currentStep.resultIds.length === 0) {
        updateStepResultIds(currentIdx, displayResults.map((r) => r.photo.id))
      }
    }
  }, [clueChain, activeClueId, displayResults, updateStepResultIds])


  const getModeTitle = (mode: RetrievalMode) => {
    switch (mode) {
      case 'similar':
        return 'Search similar to this photo'
      case 'memory':
        return 'Search around this memory'
      case 'best':
        return 'Let Photos find the best match'
      default:
        return 'Related Photos'
    }
  }

  const getModeBadgeLabel = (mode: RetrievalMode) => {
    switch (mode) {
      case 'similar':
        return 'Similar photos'
      case 'memory':
        return 'Memory results'
      case 'best':
        return 'Best matches'
      default:
        return 'Related photos'
    }
  }

  const getModeIcon = (mode: RetrievalMode) => {
    switch (mode) {
      case 'similar':
        return '🔍'
      case 'memory':
        return '📍'
      case 'best':
        return '✨'
      default:
        return '✦'
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (!clueChain || !clueChain.steps[stepIndex]) return
    const targetStep = clueChain.steps[stepIndex]
    truncateChainToStep(stepIndex)
    setActiveClueId(targetStep.cluePhotoId)
    setSelectedMode(targetStep.mode)
    navigate(`${basePath}/results?mode=${targetStep.mode}&clue=${encodeURIComponent(targetStep.cluePhotoId)}`)
  }

  const handleStartOver = () => {
    resetClueChain()
    navigate(basePath)
  }

  const handleBack = () => {
    if (clueChain && clueChain.steps.length > 1) {
      handleStepClick(clueChain.steps.length - 2)
    } else {
      resetClueChain()
      navigate(-1)
    }
  }

  const handleChangeStrategy = () => {
    setSheetOpen(true)
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

  // Feedback prompt trigger: after 10s of viewing results (Task 16.1)
  useEffect(() => {
    if (displayResults.length === 0) return

    const timer = setTimeout(() => {
      setShowFeedback(true)
    }, 10000)

    return () => clearTimeout(timer)
  }, [displayResults.length, activeClueId, selectedMode])

  const handleSelectResult = (id: string) => {
    setSelectedPhotoId(id)
    setShowFeedback(true)
  }

  return (
    <div className="results-page">
      {/* Top Results Header (Phase 9.1) */}
      <header className="results-page__header">
        <button
          type="button"
          className="results-page__back-btn"
          onClick={handleBack}
          aria-label="Back to library"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="results-page__clue-summary">
          {cluePhoto && (
            <div className="results-page__clue-thumb-wrap">
              <img
                src={cluePhoto.thumbnailUrl || cluePhoto.imageUrl}
                alt="Clue thumbnail"
                className="results-page__clue-thumb"
              />
            </div>
          )}

          <div className="results-page__header-titles">
            <h1 className="results-page__main-title">Results related to your clue</h1>
            <div className="results-page__mode-badge">
              <span>{getModeIcon(selectedMode)}</span>
              <span className="results-page__mode-name">{getModeBadgeLabel(selectedMode)}</span>
              <span className="results-page__mode-separator">•</span>
              <span className="results-page__mode-strategy">{getModeTitle(selectedMode)}</span>
            </div>
            <span className="results-page__count">
              {displayResults.length > 0 ? `${displayResults.length} related photos found` : '0 results'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="results-page__strategy-btn"
          onClick={handleChangeStrategy}
        >
          <span className="material-symbols-outlined">tune</span>
          <span>Change strategy</span>
        </button>
      </header>

      {/* Clue Chaining Breadcrumb (Phase 10.2) */}
      <ClueBreadcrumb
        chain={clueChain}
        onStepClick={handleStepClick}
        onStartOver={handleStartOver}
        onSearchClick={handleStartOver}
      />

      {/* AI Re-ranking Loading Banner (Phase 13.3) */}
      {isAiRanking && (
        <div className="results-page__ai-loading" role="status" aria-live="polite">
          <span className="material-symbols-outlined results-page__ai-sparkle">auto_awesome</span>
          <span>Photos is finding the best matches…</span>
        </div>
      )}

      {/* AI Unavailable Notice / Fallback Banner (Phase 13.4) */}
      {aiError && (
        <div className="results-page__ai-notice" role="alert">
          <div className="results-page__ai-notice-content">
            <span className="material-symbols-outlined">info</span>
            <span>{aiError}</span>
          </div>
          <button
            type="button"
            className="results-page__ai-notice-close"
            onClick={() => setAiError(null)}
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Results Content Area (Phase 9.1 & 9.4 & 15.2) */}
      <div className="results-page__content">
        <ResultsGrid
          results={displayResults}
          mode={selectedMode}
          selectedPhotoId={selectedPhotoId}
          onSelect={handleSelectResult}
          onDeselect={() => setSelectedPhotoId(null)}
          onMenuOpen={handleMenuOpen}
          onTryAnotherClue={() => setSheetOpen(true)}
          onSearchAgain={handleStartOver}
        />
      </div>

      {menuState && (
        <ContextMenu
          photoId={menuState.photoId}
          anchorEl={menuState.anchorEl}
          onClose={() => setMenuState(null)}
          onUseAsClue={handleUseAsClue}
        />
      )}

      {/* AI One-Time Disclosure Modal (Phase 13.5) */}
      <AiDisclosureModal
        isOpen={showDisclosure}
        onAccept={handleAcceptDisclosure}
        onDecline={handleDeclineDisclosure}
      />

      {/* Feedback Prompt (Phase 16) */}
      {showFeedback && (
        <FeedbackPrompt
          mode={selectedMode}
          chainDepth={clueChain?.steps.length || 1}
          onClose={() => setShowFeedback(false)}
          onTryAnotherClue={() => setSheetOpen(true)}
          onChangeApproach={() => setSheetOpen(true)}
          onStartNewSearch={handleStartOver}
        />
      )}

      {/* Dev Mode Feedback Debug Panel (Phase 16.4) */}
      <FeedbackDebugPanel />
    </div>
  )
}

