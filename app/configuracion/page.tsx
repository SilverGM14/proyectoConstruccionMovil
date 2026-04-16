'use client'

import { supabase } from '@/lib/supabaseClient'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  User, Palette, Database, Download, Upload,
  HardDrive, Wifi, WifiOff, Info, CheckCircle, AlertTriangle,
  Moon, Sun, Zap, Trash2
} from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useAuth } from '@/lib/AuthContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export default function ConfiguracionPage() {
  const { user, profile, isAdmin } = useAuth()
  const isOnline = useNetworkStatus()
  
  const [darkMode, setDarkMode] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{ files: any[]; totalSize: number }>({ files: [], totalSize: 0 })
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Cargar preferencias guardadas
  useEffect(() => {
    const savedTheme = localStorage.getItem('gome-theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
    checkStorageUsage()
  }, [])

  const checkStorageUsage = async () => {
    if (!isOnline) return
    const { data, error } = await supabase.storage.from('documentos').list()
    if (!error && data) {
      const totalSize = data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
      setStorageInfo({ files: data, totalSize })
    }
  }

  const toggleTheme = () => {
    const newTheme = !darkMode
    setDarkMode(newTheme)
    document.documentElement.classList.toggle('dark', newTheme)
    localStorage.setItem('gome-theme', newTheme ? 'dark' : 'light')
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  // ─── Exportar todos los datos ─────────────────────────────────────
  const handleExport = async () => {
    if (!isOnline) {
      showMessage('error', 'No se puede exportar sin conexión a internet')
      return
    }
    setExporting(true)
    try {
      const tables = ['Obras', 'Empleados', 'Pagos', 'Presupuestos', 'Asignaciones', 'Documentos', 'Transacciones']
      const backup: any = { version: '1.0', fecha: new Date().toISOString(), datos: {} }

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*')
        if (!error && data) backup.datos[table] = data
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gome_backup_${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showMessage('success', 'Backup exportado correctamente')
    } catch (err) {
      showMessage('error', 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  // ─── Importar datos ───────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      showMessage('error', 'No se puede importar sin conexión a internet')
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (!backup.datos || !backup.version) throw new Error('Formato inválido')

      if (!confirm('⚠️ Esto reemplazará todos los datos actuales. ¿Estás seguro?')) {
        setImporting(false)
        return
      }

      const tablesOrder = ['Transacciones', 'Documentos', 'Asignaciones', 'Presupuestos', 'Pagos', 'Empleados', 'Obras']
      for (const table of tablesOrder) {
        await supabase.from(table).delete().neq('Id', 0)
      }

      for (const [table, rows] of Object.entries(backup.datos)) {
        if (Array.isArray(rows) && rows.length > 0) {
          const cleanRows = rows.map(({ Id, UpdatedAt, ...rest }: any) => rest)
          const { error } = await supabase.from(table).insert(cleanRows)
          if (error) console.warn(`Error en ${table}:`, error)
        }
      }

      showMessage('success', 'Datos restaurados correctamente. Recarga la página.')
      setTimeout(() => window.location.reload(), 2000)
    } catch (err) {
      showMessage('error', 'Error al importar: archivo inválido')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Limpiar Storage de archivos huérfanos ────────────────────────
  const cleanOrphanFiles = async () => {
    if (!isOnline) {
      showMessage('error', 'No se puede limpiar archivos sin conexión')
      return
    }
    if (!confirm('Esto eliminará archivos del storage que no estén referenciados en la base de datos. ¿Continuar?')) return
    setLoading(true)
    try {
      const { data: docs } = await supabase.from('Documentos').select('RutaArchivo')
      const validPaths = new Set(docs?.map(d => d.RutaArchivo.split('/').pop()) || [])
      const { data: files } = await supabase.storage.from('documentos').list()
      
      let deleted = 0
      for (const file of files || []) {
        if (!validPaths.has(file.name)) {
          await supabase.storage.from('documentos').remove([`documentos/${file.name}`])
          deleted++
        }
      }
      showMessage('success', `Eliminados ${deleted} archivos huérfanos`)
      checkStorageUsage()
    } catch (err) {
      showMessage('error', 'Error al limpiar storage')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="glitch font-display font-bold text-4xl"
                data-text="Configuración"
                style={{ color: 'var(--text-primary)' }}>
              Configuración
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              AJUSTES DEL SISTEMA · GOME v1.1.2
            </p>
          </div>
        </div>

        {/* Mensaje flotante */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'
            } border`}
            style={{ background: message.type === 'success' ? 'rgba(0,196,122,0.1)' : 'rgba(255,26,26,0.1)' }}
          >
            {message.type === 'success' ? <CheckCircle size={18} color="#00C47A" /> : <AlertTriangle size={18} color="#FF1A1A" />}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{message.text}</span>
          </motion.div>
        )}

        {/* Aviso offline */}
        {!isOnline && (
          <div className="p-3 card-alert flex items-center gap-2 text-sm">
            <WifiOff size={16} /> Modo sin conexión — algunas funciones no están disponibles
          </div>
        )}

        {/* Sección 1: Perfil */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} style={{ color: 'var(--red-core)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Perfil de Usuario</h2>
          </div>
          {user ? (
            <div className="space-y-3">
              <div className="p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p style={{ fontFamily: 'var(--font-mono)' }}><strong>Email:</strong> {user.email}</p>
                <p style={{ fontFamily: 'var(--font-mono)' }}><strong>Nombre:</strong> {profile?.nombre || 'No especificado'}</p>
                <p style={{ fontFamily: 'var(--font-mono)' }}><strong>Rol:</strong> <span style={{ color: isAdmin ? '#00C47A' : 'var(--text-muted)' }}>{profile?.rol || 'usuario'}</span></p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  ID: {user.id}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Cargando información del perfil...
            </p>
          )}
        </div>

        {/* Sección 2: Apariencia */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Palette size={16} style={{ color: 'var(--red-core)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Apariencia</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                <span style={{ fontFamily: 'var(--font-mono)' }}>Tema {darkMode ? 'Oscuro' : 'Claro'}</span>
              </div>
              <button onClick={toggleTheme} className="btn-ghost text-sm py-1.5 px-4">
                Cambiar a {darkMode ? 'Claro' : 'Oscuro'}
              </button>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              La preferencia se guarda automáticamente en tu navegador.
            </p>
          </div>
        </div>

        {/* Sección 3: Datos y Backup */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={16} style={{ color: 'var(--red-core)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Gestión de Datos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-2 flex items-center gap-2"><Download size={14} /> Exportar Backup</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Descarga un archivo JSON con todos los datos del sistema.</p>
              <button onClick={handleExport} disabled={exporting || !isOnline} className="btn-primary w-full text-sm py-2">
                {exporting ? 'Exportando...' : 'Exportar Todo'}
              </button>
              {!isOnline && <p className="text-xs text-accent mt-2">Requiere conexión a internet</p>}
            </div>
            <div className="p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-2 flex items-center gap-2"><Upload size={14} /> Importar Backup</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Restaura un archivo de backup previamente exportado.</p>
              <input type="file" ref={fileInputRef} accept=".json,application/json" onChange={handleImport} className="hidden" id="import-file" disabled={!isOnline} />
              <label htmlFor="import-file" className={`btn-ghost w-full text-sm py-2 text-center block ${importing || !isOnline ? 'opacity-50 pointer-events-none' : ''}`}>
                {importing ? 'Importando...' : 'Seleccionar archivo'}
              </label>
              {!isOnline && <p className="text-xs text-accent mt-2">Requiere conexión a internet</p>}
            </div>
          </div>
        </div>

        {/* Sección 4: Almacenamiento */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={16} style={{ color: 'var(--red-core)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Almacenamiento</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3" style={{ background: 'var(--bg-elevated)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Bucket "documentos"</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red-core)' }}>
                {isOnline ? `${(storageInfo.totalSize / 1024 / 1024).toFixed(2)} MB` : 'Sin conexión'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3" style={{ background: 'var(--bg-elevated)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Archivos totales</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{isOnline ? storageInfo.files.length : '—'}</span>
            </div>
            <button onClick={cleanOrphanFiles} disabled={loading || !isOnline} className="btn-ghost text-sm py-2 px-4 flex items-center gap-2">
              <Trash2 size={14} /> Limpiar archivos huérfanos
            </button>
            {!isOnline && <p className="text-xs text-accent">Requiere conexión a internet</p>}
          </div>
        </div>

        {/* Sección 5: Estado del Sistema */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={16} style={{ color: 'var(--red-core)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Estado del Sistema</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {isOnline ? <Wifi size={14} color="#00C47A" /> : <WifiOff size={14} color="#FF1A1A" />}
              <span style={{ fontFamily: 'var(--font-mono)' }}>Conexión: {isOnline ? 'En línea' : 'Sin conexión'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Zap size={14} style={{ color: 'var(--red-core)' }} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>GoMe v1.1.2 · Build 2026.04</span>
            </div>
            <div className="flex items-center gap-3">
              <Database size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>Supabase {isOnline ? 'conectado' : 'desconectado'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}