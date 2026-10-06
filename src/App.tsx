import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/Header'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { DemoPage } from './pages/DemoPage'
import { DemoSearchPage } from './pages/DemoSearchPage'
import { MyPhotosPage } from './pages/MyPhotosPage'
import { ResultsPage } from './pages/ResultsPage'
import { ClueChoiceSheet } from './components/ClueChoiceSheet'
import { EnlargedPhotoModal } from './components/EnlargedPhotoModal'
import './App.css'

/**
 * Global keyboard shortcut handler
 * / → focus search bar
 * Escape → close menus / sheets (delegated to children via store)
 */
function GlobalKeyHandler() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        const input = document.getElementById('hdr-search-input') as HTMLInputElement | null
        input?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return null
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <GlobalKeyHandler />
      <div className="app-layout">
        <Header />
        <main className="app-main">
          <Routes>
            {/* Home — mode selector */}
            <Route path="/" element={<HomePage />} />

            {/* Demo Photos — with sidebar + bottom nav shell */}
            <Route path="/demo" element={<AppShell />}>
              <Route index element={<DemoPage />} />
              <Route path="search" element={<DemoSearchPage />} />
              <Route path="results" element={<ResultsPage />} />
            </Route>

            {/* My Photos — with sidebar + bottom nav shell */}
            <Route path="/my-photos" element={<AppShell />}>
              <Route index element={<MyPhotosPage />} />
              <Route path="search" element={<DemoSearchPage />} />
              <Route path="import" element={<MyPhotosPage />} />
              <Route path="results" element={<ResultsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <ClueChoiceSheet />
        <EnlargedPhotoModal />
      </div>
    </BrowserRouter>
  )
}

export default App
