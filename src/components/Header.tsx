/**
 * Header — sticky top bar matching Google Photos style
 * - Logo / app name + Memory Clue badge
 * - Inline search bar (desktop)
 * - Mode switcher links (Demo / My Photos)
 * - Avatar placeholder
 */
import React, { useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import './Header.css'

export const Header: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setSearchResults = useAppStore((s) => s.setSearchResults)
  const resetClueChain = useAppStore((s) => s.resetClueChain)

  const isDemo = location.pathname.startsWith('/demo')
  const isMyPhotos = location.pathname.startsWith('/my-photos')
  const showSearch = isDemo || isMyPhotos

  const basePath = isMyPhotos ? '/my-photos' : '/demo'

  const handleSearch = useCallback(
    (q: string) => {
      if (q.trim()) {
        resetClueChain()
        navigate(`${basePath}/search?q=${encodeURIComponent(q.trim())}`)
      }
    },
    [basePath, navigate, resetClueChain],
  )

  const handleClear = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
  }, [setSearchQuery, setSearchResults])

  const handleHomeClick = useCallback(() => {
    resetClueChain()
  }, [resetClueChain])

  return (
    <header className="gp-header" role="banner">
      {/* Left: logo + brand */}
      <div className="gp-header__left">
        <Link to="/" className="gp-brand" aria-label="Memory Clue home" onClick={handleHomeClick}>
          {/* Google Photos pinwheel */}
          <svg className="gp-pinwheel" viewBox="0 0 40 40" width="30" height="30" fill="none" aria-hidden="true">
            <path d="M20 20v-9.5A9.5 9.5 0 0 1 29.5 20H20z" fill="#EA4335" />
            <path d="M20 20h9.5A9.5 9.5 0 0 1 20 29.5V20z" fill="#4285F4" />
            <path d="M20 20v9.5A9.5 9.5 0 0 1 10.5 20H20z" fill="#34A853" />
            <path d="M20 20h-9.5A9.5 9.5 0 0 1 20 10.5V20z" fill="#FBBC04" />
          </svg>
          <span className="gp-brand__title">Google Photos</span>
          <span className="gp-brand__badge">Memory Clue</span>
        </Link>
      </div>

      {/* Center: search bar (only in demo/my-photos contexts) */}
      {showSearch && (
        <div className="gp-header__center">
          <div className={`gp-header-search${searchQuery ? ' gp-header-search--active' : ''}`}>
            <button
              className="gp-header-search__icon"
              onClick={() => handleSearch(searchQuery)}
              aria-label="Search"
              type="button"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
            <input
              id="hdr-search-input"
              type="search"
              className="gp-header-search__input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch(searchQuery)
                if (e.key === 'Escape') handleClear()
              }}
              placeholder={isDemo ? 'Search demo photos, locations, events…' : 'Search your photos'}
              autoComplete="off"
              aria-label="Search photos"
            />
            {searchQuery && (
              <button
                className="gp-header-search__clear"
                onClick={handleClear}
                aria-label="Clear search"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Right: mode nav + avatar */}
      <div className="gp-header__right">
        <nav className="gp-header__nav" aria-label="Mode selection">
          <Link
            to="/demo"
            className={`gp-header-nav-item${isDemo ? ' gp-header-nav-item--active' : ''}`}
          >
            <span className="material-symbols-outlined">collections</span>
            <span>Demo</span>
          </Link>
          <Link
            to="/my-photos"
            className={`gp-header-nav-item${isMyPhotos ? ' gp-header-nav-item--active' : ''}`}
          >
            <span className="material-symbols-outlined">add_photo_alternate</span>
            <span>My Photos</span>
          </Link>
        </nav>

        <div className="gp-user-avatar" title="Account" aria-label="User account">
          <span aria-hidden="true">M</span>
        </div>
      </div>
    </header>
  )
}
