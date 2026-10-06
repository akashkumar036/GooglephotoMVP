import { demoPhotos } from '../data/demoPhotos'
import { useAppStore } from '../store/appStore'
import type { Photo } from '../types'

export type DatasetType = 'demo' | 'user' | Photo[]

/**
 * Resolves a dataset identifier or photos array to a concrete Photo[] array.
 * - If Photo[] is provided, returns it directly.
 * - If 'user', retrieves user photos from Zustand store (or fallback).
 * - If 'demo', returns demoPhotos.
 * - Defaults to demoPhotos unless activeMode is 'my-photos' with userPhotos present.
 */
export function resolvePhotos(dataset?: DatasetType): Photo[] {
  if (Array.isArray(dataset)) {
    return dataset
  }

  if (dataset === 'user') {
    return useAppStore.getState().userPhotos
  }

  if (dataset === 'demo') {
    return demoPhotos
  }

  const state = useAppStore.getState()
  if (state.activeMode === 'my-photos' && state.userPhotos.length > 0) {
    return state.userPhotos
  }

  return demoPhotos
}

/**
 * Returns all photos for a given dataset ('demo' | 'user').
 */
export function getPhotos(dataset: 'demo' | 'user' = 'demo'): Photo[] {
  return resolvePhotos(dataset)
}
