/**
 * AppShell — wraps demo and my-photos pages with sidebar + bottom nav layout
 */
import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { BottomTabBar } from '../components/BottomTabBar'
import { useAppStore } from '../store/appStore'
import './AppShell.css'

export const AppShell: React.FC = () => {
  const activeMode = useAppStore((s) => s.activeMode)

  return (
    <div className="app-shell">
      <Sidebar activeMode={activeMode} />
      <div className="app-shell__content">
        <Outlet />
      </div>
      <BottomTabBar activeMode={activeMode} />
    </div>
  )
}
