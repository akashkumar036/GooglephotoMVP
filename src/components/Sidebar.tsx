/**
 * Sidebar — left navigation panel (desktop)
 * Shows on ≥1024px. Contains Photos / Search / Library links.
 */
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './Sidebar.css'

interface SidebarProps {
  activeMode: 'demo' | 'my-photos' | null
}

export const Sidebar: React.FC<SidebarProps> = ({ activeMode }) => {
  const location = useLocation()
  const isDemo = location.pathname.startsWith('/demo')
  const isMyPhotos = location.pathname.startsWith('/my-photos')
  const basePath = isMyPhotos ? '/my-photos' : '/demo'

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="sidebar__nav">
        <NavLink
          to={basePath}
          end
          className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
          aria-label="Photos"
        >
          <span className="material-symbols-outlined sidebar__item-icon">photo_library</span>
          <span className="sidebar__item-label">Photos</span>
        </NavLink>

        <NavLink
          to={`${basePath}/search`}
          className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
          aria-label="Search"
        >
          <span className="material-symbols-outlined sidebar__item-icon">search</span>
          <span className="sidebar__item-label">Search</span>
        </NavLink>

        {activeMode === 'my-photos' && (
          <NavLink
            to="/my-photos/import"
            className={({ isActive }) => `sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
            aria-label="Import"
          >
            <span className="material-symbols-outlined sidebar__item-icon">add_photo_alternate</span>
            <span className="sidebar__item-label">Import</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar__divider" />

      <nav className="sidebar__nav sidebar__nav--bottom">
        <div className={`sidebar__mode-indicator${isDemo ? ' sidebar__mode-indicator--demo' : ' sidebar__mode-indicator--user'}`}>
          <span className="material-symbols-outlined sidebar__item-icon">
            {isMyPhotos ? 'lock' : 'collections'}
          </span>
          <span className="sidebar__item-label">
            {isMyPhotos ? 'My Photos (Private)' : 'Demo Library'}
          </span>
        </div>
      </nav>
    </aside>
  )
}
