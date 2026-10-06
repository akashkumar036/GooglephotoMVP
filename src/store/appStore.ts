import { create } from 'zustand'
import type { AppState, ClueStep, ProcessingProgress, RetrievalMode, RetrievalResult, FeedbackState } from '../types'

const initialProgress: ProcessingProgress = {
  total: 0,
  current: 0,
  stage: 'idle',
  stageLabel: 'Ready',
  percentage: 0,
}

export const useAppStore = create<AppState>((set) => ({
  // Mode
  activeMode: null,

  // Photo library
  photos: new Map(),
  userPhotos: [],
  isProcessing: false,
  processingProgress: initialProgress,

  // Search
  searchQuery: '',
  searchResults: [],

  // Clue
  activeClueId: null,
  selectedMode: null,
  clueResults: [],

  // Clue chaining
  clueChain: null,

  // UI
  selectedPhotoId: null,
  enlargedPhotoId: null,
  menuOpen: false,
  sheetOpen: false,

  // Feedback
  feedbackState: null,

  // Actions
  setActiveMode: (mode) => set({ activeMode: mode }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (results) => set({ searchResults: results }),

  setSelectedPhotoId: (photoId) => set({ selectedPhotoId: photoId }),

  setEnlargedPhotoId: (photoId) => set({ enlargedPhotoId: photoId }),

  setActiveClueId: (clueId) => set({ activeClueId: clueId }),

  setSelectedMode: (mode: RetrievalMode | null) => set({ selectedMode: mode }),

  setClueResults: (results: RetrievalResult[]) => set({ clueResults: results }),

  setMenuOpen: (open) => set({ menuOpen: open }),

  setSheetOpen: (open) => set({ sheetOpen: open }),

  addClueStep: (step: ClueStep) =>
    set((state) => {
      const currentSteps = state.clueChain ? state.clueChain.steps : []
      const stepWithTimestamp = {
        ...step,
        timestamp: step.timestamp || new Date(),
      }
      return {
        clueChain: {
          id: state.clueChain?.id || `chain-${Date.now()}`,
          steps: [...currentSteps, stepWithTimestamp],
        },
      }
    }),

  truncateChainToStep: (stepIndex: number) =>
    set((state) => {
      if (!state.clueChain) return {}
      const targetStep = state.clueChain.steps[stepIndex]
      if (!targetStep) return {}
      const truncatedSteps = state.clueChain.steps.slice(0, stepIndex + 1)
      return {
        activeClueId: targetStep.cluePhotoId,
        selectedMode: targetStep.mode,
        clueChain: {
          ...state.clueChain,
          steps: truncatedSteps,
        },
      }
    }),

  updateStepResultIds: (stepIndex: number, resultIds: string[]) =>
    set((state) => {
      if (!state.clueChain) return {}
      const updatedSteps = state.clueChain.steps.map((s, idx) =>
        idx === stepIndex ? { ...s, resultIds } : s
      )
      return {
        clueChain: {
          ...state.clueChain,
          steps: updatedSteps,
        },
      }
    }),

  resetClueChain: () => set({ clueChain: null, activeClueId: null, selectedMode: null, clueResults: [] }),

  setProcessingProgress: (progress) =>
    set({
      processingProgress: progress,
      isProcessing: progress.stage !== 'idle' && progress.stage !== 'ready',
    }),

  setFeedbackState: (feedback: FeedbackState | null) => set({ feedbackState: feedback }),

  clearUserPhotos: () =>
    set((state) => {
      const cleanedMap = new Map<string, import('../types').Photo>()
      for (const [id, photo] of state.photos.entries()) {
        if (photo.source !== 'user') {
          cleanedMap.set(id, photo)
        }
      }
      return {
        photos: cleanedMap,
        userPhotos: [],
        searchResults: [],
        clueResults: [],
        clueChain: null,
        activeClueId: null,
        selectedPhotoId: null,
        enlargedPhotoId: null,
      }
    }),
}))

