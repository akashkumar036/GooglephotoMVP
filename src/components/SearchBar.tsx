/**
 * SearchBar — expandable Google Photos style search input
 * Desktop: always visible in header area
 * Mobile: icon that expands to full-width
 */
import React, { useRef, useState, useCallback } from 'react'
import './SearchBar.css'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  onClear: () => void
  placeholder?: string
  resultCount?: number | null
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Search your photos',
  resultCount,
}) => {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(value)
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      onClear()
      inputRef.current?.blur()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleClear = useCallback(() => {
    onClear()
    inputRef.current?.focus()
  }, [onClear])

  const hasValue = value.trim().length > 0

  return (
    <div className="search-bar-wrapper">
      <div className={`search-bar${focused ? ' search-bar--focused' : ''}`}>
        <button
          className="search-bar__icon-btn"
          onClick={() => onSearch(value)}
          aria-label="Search"
          type="button"
        >
          <span className="material-symbols-outlined">search</span>
        </button>

        <input
          ref={inputRef}
          id="main-search-input"
          type="search"
          className="search-bar__input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={placeholder}
          role="searchbox"
        />

        {hasValue && (
          <button
            className="search-bar__clear-btn"
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {hasValue && resultCount != null && (
        <p className="search-bar__result-count" role="status" aria-live="polite">
          {resultCount === 0
            ? 'No photos found'
            : `${resultCount} photo${resultCount !== 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  )
}
