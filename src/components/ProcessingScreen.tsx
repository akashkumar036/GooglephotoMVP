import React from 'react'
import type { ProcessingProgress } from '../types'
import './ProcessingScreen.css'

export interface ProcessingScreenProps {
  progress: ProcessingProgress
}

interface StageStep {
  id: string
  label: string
  associatedStages: ProcessingProgress['stage'][]
}

const PIPELINE_STEPS: StageStep[] = [
  { id: 'import', label: 'Photos imported & validated', associatedStages: ['validating', 'exif'] },
  { id: 'exif', label: 'Analyzing dates, times, and locations', associatedStages: ['exif', 'resizing'] },
  { id: 'embedding', label: 'Extracting visual neural embeddings', associatedStages: ['resizing', 'embedding'] },
  { id: 'detecting', label: 'Detecting objects and scenes', associatedStages: ['detecting', 'ocr'] },
  { id: 'clustering', label: 'Clustering moments and trips', associatedStages: ['clustering', 'indexing'] },
  { id: 'indexing', label: 'Building local search index', associatedStages: ['indexing', 'ready'] },
]

const STAGE_ORDER: ProcessingProgress['stage'][] = [
  'idle',
  'validating',
  'exif',
  'resizing',
  'embedding',
  'detecting',
  'ocr',
  'clustering',
  'indexing',
  'ready',
]

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({ progress }) => {
  const currentStageIdx = STAGE_ORDER.indexOf(progress.stage)

  const getStepStatus = (step: StageStep) => {
    // If ready, everything is done
    if (progress.stage === 'ready') return 'done'

    const stepStageIndices = step.associatedStages.map((s) => STAGE_ORDER.indexOf(s))
    const minStepIdx = Math.min(...stepStageIndices)
    const maxStepIdx = Math.max(...stepStageIndices)

    if (currentStageIdx > maxStepIdx) return 'done'
    if (currentStageIdx >= minStepIdx && currentStageIdx <= maxStepIdx) return 'active'
    return 'pending'
  }

  return (
    <div className="processing-screen" role="status" aria-live="polite">
      <div className="processing-screen__icon-wrap">
        <div className="processing-screen__spinner" />
        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
          auto_awesome
        </span>
      </div>

      <h2 className="processing-screen__title">Preparing your photos</h2>
      <p className="processing-screen__subtitle">{progress.stageLabel || 'Analyzing your photos locally...'}</p>

      {/* Progress Bar */}
      <div className="processing-screen__progress-bar-wrap">
        <div
          className="processing-screen__progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(5, progress.percentage))}%` }}
        />
      </div>

      {progress.total > 0 && (
        <span className="processing-screen__count-label">
          {progress.current > 0
            ? `Analyzed ${progress.current} of ${progress.total} photos`
            : `Processing ${progress.total} photos...`}
        </span>
      )}

      {/* Stage Checklist */}
      <div className="processing-screen__stage-list">
        {PIPELINE_STEPS.map((step) => {
          const status = getStepStatus(step)
          let iconName = 'radio_button_unchecked'
          if (status === 'done') iconName = 'check_circle'
          if (status === 'active') iconName = 'sync'

          return (
            <div
              key={step.id}
              className={`processing-screen__stage-item processing-screen__stage-item--${status}`}
            >
              <span className="material-symbols-outlined processing-screen__stage-icon">
                {iconName}
              </span>
              <span>{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Per-photo Error Badges (Phase 15.3) */}
      {progress.errors && progress.errors.length > 0 && (
        <div className="processing-screen__errors" role="alert">
          {progress.errors.map((err, idx) => (
            <div key={idx} className="processing-screen__error-badge">
              <span className="material-symbols-outlined">warning</span>
              <span>Couldn't analyze this photo ({err.filename})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
