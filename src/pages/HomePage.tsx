import React from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import './HomePage.css'

export const HomePage: React.FC = () => {
  const setActiveMode = useAppStore((state) => state.setActiveMode)

  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="home-hero-badge">
          <span className="material-symbols-outlined">auto_awesome</span>
          <span>Google Photos MVP · Hypothesis Validator</span>
        </div>
        <h1 className="home-hero-title">Memory Clue</h1>
        <p className="home-hero-subtitle">
          Turn a photo you recognize into a clue for finding the photo you can't describe.
        </p>
      </div>

      <div className="mode-cards-grid">
        <Link
          to="/demo"
          className="mode-card"
          onClick={() => setActiveMode('demo')}
        >
          <div className="mode-card-badge demo-badge">Curated Dataset</div>
          <div className="mode-card-icon">
            <span className="material-symbols-outlined">photo_library</span>
          </div>
          <h2 className="mode-card-title">Demo Photos</h2>
          <p className="mode-card-desc">
            Explore 6 pre-configured validation scenarios including Goa vacation memories,
            cross-year medicine packaging, and birthday events.
          </p>
          <div className="mode-card-features">
            <span className="feature-pill">Scenarios A–F</span>
            <span className="feature-pill">Visual & Temporal</span>
            <span className="feature-pill">Clue Chaining</span>
          </div>
          <div className="mode-card-cta">
            <span>Open Demo Library</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        </Link>

        <Link
          to="/my-photos"
          className="mode-card"
          onClick={() => setActiveMode('my-photos')}
        >
          <div className="mode-card-badge privacy-badge">100% On-Device</div>
          <div className="mode-card-icon user-icon">
            <span className="material-symbols-outlined">add_photo_alternate</span>
          </div>
          <h2 className="mode-card-title">My Photos</h2>
          <p className="mode-card-desc">
            Import your own photos. Images are analyzed locally in your browser using TensorFlow.js
            and EXIF extraction with complete privacy.
          </p>
          <div className="mode-card-features">
            <span className="feature-pill">🔒 Private & Local</span>
            <span className="feature-pill">EXIF Parsing</span>
            <span className="feature-pill">MobileNet Embeddings</span>
          </div>
          <div className="mode-card-cta">
            <span>Import Your Photos</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        </Link>
      </div>

      <div className="home-info-strip">
        <div className="info-item">
          <span className="material-symbols-outlined info-icon">search_insights</span>
          <div>
            <strong>Search Similar</strong>
            <p>Visual and semantic similarity across years</p>
          </div>
        </div>
        <div className="info-item">
          <span className="material-symbols-outlined info-icon">near_me</span>
          <div>
            <strong>Search Around Memory</strong>
            <p>Temporal and spatial proximity clustering</p>
          </div>
        </div>
        <div className="info-item">
          <span className="material-symbols-outlined info-icon">psychology</span>
          <div>
            <strong>Best Match (Adaptive)</strong>
            <p>Adaptive signal weighting & Gemini reasoning</p>
          </div>
        </div>
      </div>
    </div>
  )
}
