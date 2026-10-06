/**
 * BottomTabBar — mobile navigation (≤1023px)
 * Photos | Search | (My Photos: Import)
 */
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './BottomTabBar.css'

interface BottomTabBarProps {
  activeMode: 'demo' | 'my-photos' | null
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeMode }) => {
  const location = useLocation()
  const isMyPhotos = location.pathname.startsWith('/my-photos')
  const basePath = isMyPhotos ? '/my-photos' : '/demo'

  // Don't show on home/mode-selector page
  if (!location.pathname.startsWith('/demo') && !location.pathname.startsWith('/my-photos')) {
    return null
  }

  return (
    <nav className="bottom-tab-bar" aria-label="Mobile navigation">
      <NavLink
        to={basePath}
        end
        className={({ isActive }) => `bottom-tab${isActive ? ' bottom-tab--active' : ''}`}
      >
        <span className="material-symbols-outlined bottom-tab__icon">photo_library</span>
        <span className="bottom-tab__label">Photos</span>
      </NavLink>

      <NavLink
        to={`${basePath}/search`}
        className={({ isActive }) => `bottom-tab${isActive ? ' bottom-tab--active' : ''}`}
      >
        <span className="material-symbols-outlined bottom-tab__icon">search</span>
        <span className="bottom-tab__label">Search</span>
      </NavLink>

      {activeMode === 'my-photos' && (
        <NavLink
          to="/my-photos/import"
          className={({ isActive }) => `bottom-tab${isActive ? ' bottom-tab--active' : ''}`}
        >
          <span className="material-symbols-outlined bottom-tab__icon">add_photo_alternate</span>
          <span className="bottom-tab__label">Import</span>
        </NavLink>
      )}
    </nav>
  )
}
