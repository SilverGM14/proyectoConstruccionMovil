'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Receipt,
  ClipboardList, FolderOpen, Menu, X, Settings,
  Sun, Moon, Wifi, WifiOff, ChevronRight, Zap, LogOut
} from 'lucide-react'
import './globals.css'
import { AuthProvider, useAuth } from '@/lib/AuthContext'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// ── Tipos ────────────────────────────────────────────────────────────
type NavSection = {
  label: string
  items: { href: string; label: string; icon: React.ElementType; badge?: string }[]
}

const navSections: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
    ]
  },
  {
    label: 'Proyectos',
    items: [
      { href: '/obras',        label: 'Obras',        icon: Building2 },
      { href: '/presupuestos', label: 'Presupuestos', icon: ClipboardList },
      { href: '/documentos',   label: 'Documentos',   icon: FolderOpen },
    ]
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/contabilidad', label: 'Contabilidad', icon: Receipt },
    ]
  },
  {
    label: 'Equipo',
    items: [
      { href: '/empleados',    label: 'Empleados',    icon: Users },
      { href: '/pagos',        label: 'Pagos',        icon: Receipt },
    ]
  }
]

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [darkMode, setDarkMode]         = useState(false)
  const [time, setTime]                 = useState('')
  const pathname = usePathname()
  const { signOut } = useAuth()
  const router = useRouter()
  const isOnline = useNetworkStatus()

  const isAuthPage = pathname === '/login' || pathname === '/registro'

  useEffect(() => {
    const saved = localStorage.getItem('gome-theme')
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark') }
    else document.documentElement.classList.remove('dark')
  }, [])

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gome-theme', next ? 'dark' : 'light')
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {!isAuthPage && (
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-20 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>
      )}

      {!isAuthPage && (
        <motion.aside
          className={`fixed top-0 left-0 z-30 h-full w-60 lg:relative lg:translate-x-0 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, background: 'var(--red-core)',
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Zap size={18} color="#fff" strokeWidth={2.5}/>
              </div>
              <div>
                <p className="glitch font-display font-bold text-lg leading-none" data-text="GoMe" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  CONSTRUCTORA GoMe
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  GESTIÓN v2.0
                </p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:text-red-500 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <X size={18}/>
            </button>
          </div>

          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {time}
            </span>
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <><div className="live-dot"/><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#00C47A' }}>ONLINE</span></>
              ) : (
                <><WifiOff size={10} color="var(--red-core)"/><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--red-core)' }}>OFFLINE</span></>
              )}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2">
            {navSections.map((section) => (
              <div key={section.label} className="mb-4">
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)',
                  padding: '0 0.5rem', marginBottom: '0.25rem'
                }}>
                  {section.label}
                </p>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`nav-item ${isActive ? 'active' : ''}`}>
                      <item.icon size={16} style={{ flexShrink: 0 }}/>
                      <span>{item.label}</span>
                      {isActive && <ChevronRight size={12} className="ml-auto" style={{ color: 'var(--red-core)' }}/>}
                      {item.badge && <span className="ml-auto badge badge-danger" style={{ fontSize: '0.55rem' }}>{item.badge}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={toggleDark} className="w-full nav-item justify-between mb-1">
              <div className="flex items-center gap-3">
                {darkMode ? <Sun size={16}/> : <Moon size={16}/>}
                <span>{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
              </div>
              <div style={{ width: 32, height: 18, background: darkMode ? 'var(--red-core)' : 'var(--border)', borderRadius: 999, position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: darkMode ? 16 : 3, width: 12, height: 12, background: '#fff', borderRadius: 999, transition: 'left 0.3s' }}/>
              </div>
            </button>

            <Link href="/configuracion" className="w-full nav-item mb-1">
              <Settings size={16}/>
              <span>Configuración</span>
            </Link>

            <button onClick={handleSignOut} className="w-full nav-item mb-1 text-accent">
              <LogOut size={16}/>
              <span>Cerrar Sesión</span>
            </button>

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem', letterSpacing: '0.08em' }}>
              GoMe v2.1.2 · {isOnline ? 'Conectado' : 'Sin conexión'}
            </p>
          </div>
        </motion.aside>
      )}

      <div className="flex-1 flex flex-col overflow-auto min-w-0">
        {!isAuthPage && (
          <header className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setSidebarOpen(true)} className="p-2" style={{ color: 'var(--text-secondary)' }}>
              <Menu size={22}/>
            </button>
            <div className="flex items-center gap-2">
              <div style={{ width: 24, height: 24, background: 'var(--red-core)', clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={12} color="#fff"/>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>GoMe</span>
            </div>
            <button onClick={toggleDark} style={{ color: 'var(--text-muted)' }}>
              {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
          </header>
        )}

        <main className={`flex-1 overflow-auto ${!isAuthPage ? 'p-6' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>GoMe — Gestión de Obras</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#FF1A1A" />
      </head>
      <body>
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  )
}