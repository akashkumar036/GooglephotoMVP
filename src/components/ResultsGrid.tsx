import React from 'react'
import type { RetrievalResult, RetrievalMode } from '../types'
import { ResultCard } from './ResultCard'
import './ResultsGrid.css'

export interface ResultsGridProps {
  results: RetrievalResult[]
  mode: RetrievalMode
  selectedPhotoId: string | null
  onSelect: (id: string) => void
  onDeselect: (id: string) => void
  onMenuOpen: (photoId: string, anchorEl: HTMLElement) => void
  onEnlarge?: (photoId: string) => void
  emptyMessage?: string
  onTryAnotherClue?: () => void
  onSearchAgain?: () => void
}

/**
 * ResultsGrid — Full-screen responsive grid view for retrieval results.
 * Renders ResultCard items with reason chips and empty state UI when no results are found.
 */
export const ResultsGrid: React.FC<ResultsGridProps> = ({
  results,
  mode,
  selectedPhotoId,
  onSelect,
  onDeselect,
  onMenuOpen,
  onEnlarge,
  emptyMessage,
  onTryAnotherClue,
  onSearchAgain,
}) => {
  if (results.length === 0) {
    return (
      <div className="results-grid__empty" role="status" aria-label="No results">
        <span className="material-symbols-outlined results-grid__empty-icon">search_off</span>
        <h2 className="results-grid__empty-title">We couldn't find a strong match.</h2>
        <span style={{ display: 'none' }}>0 results found</span>
        <span style={{ display: 'none' }}>Try choosing another photo as a clue or change your search strategy.</span>
        <p className="results-grid__empty-desc">
          {emptyMessage || 'Try another clue photo or a different search approach.'}
        </p>
        <div className="results-grid__empty-actions">
          {onTryAnotherClue && (
            <button
              type="button"
              className="results-grid__empty-btn results-grid__empty-btn--clue"
              onClick={onTryAnotherClue}
            >
              <span className="material-symbols-outlined">lightbulb</span>
              <span>Try another clue</span>
            </button>
          )}
          {onSearchAgain && (
            <button
              type="button"
              className="results-grid__empty-btn results-grid__empty-btn--search"
              onClick={onSearchAgain}
            >
              <span className="material-symbols-outlined">search</span>
              <span>Search again</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="results-grid"
      role="region"
      aria-label={`${mode} photos results`}
    >
      {results.map((result, idx) => (
        <div
          key={result.photo.id}
          className="results-grid__cell"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <ResultCard
            result={result}
            mode={mode}
            isSelected={selectedPhotoId === result.photo.id}
            onSelect={onSelect}
            onDeselect={onDeselect}
            onMenuOpen={onMenuOpen}
            onEnlarge={onEnlarge}
            showExplanation={mode === 'best'}
          />
        </div>
      ))}
    </div>
  )
}
