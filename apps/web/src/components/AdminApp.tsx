'use client'

import { useCallback, useEffect, useState } from 'react'
import { APP_COLORS } from '@presencamdc/shared'
import AdminLogin from './AdminLogin'
import Dashboard from './Dashboard'
import Students from './Students'
import Classes from './Classes'
import Events from './Events'
import Reports from './Reports'
import BlockedStudents from './BlockedStudents'
import Settings from './Settings'
import { api, clearTokens, getAccessToken } from '@/lib/api'
import type { Me } from '@/lib/types'

type Section = 'dashboard' | 'students' | 'classes' | 'events' | 'reports' | 'blocked' | 'settings'

const NAV: { id: Section; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'students', label: 'Alunos' },
  { id: 'classes', label: 'Turmas' },
  { id: 'events', label: 'Eventos' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'blocked', label: 'Bloqueados' },
  { id: 'settings', label: 'Configurações' },
]

export default function AdminApp() {
  const [user, setUser] = useState<Me | null>(null)
  const [section, setSection] = useState<Section>('dashboard')
  const [checking, setChecking] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const boot = useCallback(async () => {
    setChecking(true)
    if (!getAccessToken()) {
      setChecking(false)
      return
    }
    try {
      const me = await api.get<Me>('/me')
      if (me.role !== 'admin') {
        clearTokens()
        setUser(null)
      } else {
        setUser(me)
      }
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    boot().catch(() => undefined)
    const onUnauthorized = () => {
      setUser(null)
      setChecking(false)
    }
    window.addEventListener('mdc:unauthorized', onUnauthorized)
    return () => window.removeEventListener('mdc:unauthorized', onUnauthorized)
  }, [boot])

  function handleLogout() {
    clearTokens()
    setUser(null)
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#1A1A1A]" style={{ background: APP_COLORS.backgroundDark }}>
        <p className="text-sm text-text-gray">Carregando...</p>
      </main>
    )
  }

  if (!user) {
    return <AdminLogin onSuccess={setUser} />
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-text-dark hover:bg-gray-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <div className="flex h-8 w-20 items-center justify-center rounded-md bg-ink px-1">
          <img src="/images.png" alt="Mais de Cristo" className="h-6 w-auto object-contain" />
        </div>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
          <div className="flex h-11 w-28 items-center justify-center rounded-lg bg-ink px-1">
            <img src="/images.png" alt="" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex-1">
            <h1
              className="text-sm font-bold leading-tight tracking-tight"
              style={{ color: APP_COLORS.textPrimary }}
            >
              MAIS DE CRISTO
            </h1>
            <p className="mt-0.5 text-xs text-text-gray">Gestão de presença</p>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-2xl leading-none text-text-gray hover:text-text-dark lg:hidden"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id)
                setMenuOpen(false)
              }}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                section === item.id ? 'text-white' : 'text-text-gray hover:bg-gray-50 hover:text-text-dark'
              }`}
              style={section === item.id ? { background: APP_COLORS.primary } : undefined}
            >
              {item.label}
              {item.id === 'blocked' && <BadgeDot />}
            </button>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <p className="truncate text-sm font-medium text-text-dark">{user.name}</p>
          <p className="truncate text-xs text-text-gray">{user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-text-dark hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F6F4F0] p-6 pt-20 lg:pt-6">
        {section === 'dashboard' && <Dashboard onNavigate={setSection} />}
        {section === 'students' && <Students />}
        {section === 'classes' && <Classes />}
        {section === 'events' && <Events />}
        {section === 'reports' && <Reports />}
        {section === 'blocked' && <BlockedStudents />}
        {section === 'settings' && <Settings />}
      </main>
    </div>
  )
}

function BadgeDot() {
  return <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#EF4444] align-middle" />
}