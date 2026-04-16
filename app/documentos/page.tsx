'use client'

import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Trash2, Plus, Building2,
  Calendar, Search, X, WifiOff
} from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Documento = {
  Id: number
  Nombre: string
  Descripcion?: string | null
  RutaArchivo: string
  ObraId?: number | null
  Tipo?: string | null
  FechaSubida: string
  Obras?: { Nombre: string } | null
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [obraFilter, setObraFilter] = useState<string>('')
  const [obras, setObras] = useState<{ Id: number; Nombre: string }[]>([])
  const [stats, setStats] = useState({ total: 0 })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('Documentos')

  useEffect(() => {
    cargarDocumentos()
    cargarObras()
  }, [])

  const cargarObras = async () => {
    const { data } = await supabase.from('Obras').select('Id, Nombre')
    if (data) setObras(data)
  }

  const cargarDocumentos = async () => {
    const { data, error } = await supabase
      .from('Documentos')
      .select('*, Obras(Nombre)')
      .order('FechaSubida', { ascending: false })

    if (!error && data) {
      setDocumentos(data as Documento[])
      setStats({ total: data.length })
    }
    setLoading(false)
  }

  const eliminarDocumento = async (id: number, rutaArchivo: string) => {
    if (!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return

    // OFFLINE: Si no hay conexión, solo marcamos para eliminar (el archivo físico quedará)
    if (!isOnline) {
      const { error } = await mutate('delete', null, id)
      if (error) {
        alert('Error al marcar para eliminar: ' + error.message)
      } else {
        alert('Documento marcado para eliminar. Se sincronizará al recuperar la conexión.')
        cargarDocumentos()
      }
      return
    }

    // Online: eliminar archivo del storage y registro
    const urlParts = rutaArchivo.split('/')
    const filePath = urlParts.slice(urlParts.indexOf('documentos') + 1).join('/')

    const { error: storageError } = await supabase.storage
      .from('documentos')
      .remove([filePath])

    if (storageError) {
      alert('Error al eliminar archivo: ' + storageError.message)
      return
    }

    const { error: dbError } = await supabase
      .from('Documentos')
      .delete()
      .eq('Id', id)

    if (dbError) {
      alert('Error al eliminar registro: ' + dbError.message)
    } else {
      cargarDocumentos()
    }
  }

  const descargarDocumento = (url: string, nombre: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = nombre
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getFileIcon = (tipo?: string | null) => {
    if (!tipo) return <FileText size={18} />
    if (tipo.includes('pdf')) return <FileText size={18} style={{ color: '#FF1A1A' }} />
    if (tipo.includes('image')) return <FileText size={18} style={{ color: '#00C47A' }} />
    return <FileText size={18} />
  }

  const documentosFiltrados = documentos.filter(doc => {
    const matchSearch = doc.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (doc.Descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchObra = !obraFilter || doc.ObraId?.toString() === obraFilter
    return matchSearch && matchObra
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div style={{
          width: 40, height: 40,
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--red-core)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          CARGANDO DOCUMENTOS...
        </p>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-screen-2xl mx-auto"
      >
        {/* OFFLINE: Badge de estado sin conexión */}
        {!isOnline && (
          <div className="mb-3 p-2 card-alert flex items-center gap-2 text-sm">
            <WifiOff size={16} /> Modo sin conexión — las eliminaciones se encolarán
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="glitch font-display font-bold text-4xl"
                data-text="Documentos"
                style={{ color: 'var(--text-primary)' }}>
              Documentos
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              GESTIÓN DOCUMENTAL · {stats.total} ARCHIVOS
            </p>
          </div>
          <Link href="/documentos/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Subir Documento
          </Link>
        </div>

        {/* KPI simple */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="kpi-card">
          <div className="flex items-start justify-between mb-3">
            <p className="kpi-label">Total Documentos</p>
            <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={15} style={{ color: 'var(--red-core)' }} />
            </div>
          </div>
          <p className="kpi-value count-animate">{stats.total}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Archivos almacenados</p>
        </motion.div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px] relative">
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-cyber pl-9"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div className="w-64">
            <select
              value={obraFilter}
              onChange={(e) => setObraFilter(e.target.value)}
              className="input-cyber"
            >
              <option value="">Todas las obras</option>
              {obras.map(o => (
                <option key={o.Id} value={o.Id}>{o.Nombre}</option>
              ))}
            </select>
          </div>
          {(searchTerm || obraFilter) && (
            <button
              onClick={() => { setSearchTerm(''); setObraFilter('') }}
              className="btn-ghost text-sm py-1.5"
            >
              <X size={14} /> Limpiar
            </button>
          )}
        </div>

        {/* Listado */}
        {documentosFiltrados.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center">
            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {documentos.length === 0 ? 'NO HAY DOCUMENTOS REGISTRADOS' : 'NO SE ENCONTRARON RESULTADOS'}
            </p>
            {documentos.length === 0 && (
              <Link href="/documentos/nuevo" className="btn-primary mt-4 inline-flex">
                <Plus size={14} /> Subir primer documento
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {documentosFiltrados.map((doc, i) => (
                <motion.div
                  key={doc.Id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.03 }}
                  className="card p-5"
                >
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex gap-4 flex-1">
                      <div style={{
                        width: 48, height: 48,
                        background: 'var(--red-ghost)',
                        border: '1px solid var(--border-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {getFileIcon(doc.Tipo)}
                      </div>

                      <div className="flex-1">
                        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                          {doc.Nombre}
                        </h2>
                        {doc.Descripcion && (
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            {doc.Descripcion}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                          {doc.Obras && (
                            <div className="flex items-center gap-1">
                              <Building2 size={11} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                {doc.Obras.Nombre}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                              {new Date(doc.FechaSubida).toLocaleDateString()}
                            </span>
                          </div>
                          {doc.Tipo && (
                            <span className="badge badge-info" style={{ fontSize: '0.55rem' }}>
                              {doc.Tipo.split('/').pop()?.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => descargarDocumento(doc.RutaArchivo, doc.Nombre)}
                        className="btn-ghost text-sm py-1.5 px-3"
                      >
                        <Download size={14} /> Descargar
                      </button>
                      <Link href={`/documentos/editar/${doc.Id}`} className="btn-ghost text-sm py-1.5 px-3">
                        <FileText size={14} /> Editar
                      </Link>
                      <button
                        onClick={() => eliminarDocumento(doc.Id, doc.RutaArchivo)}
                        className="btn-danger text-sm py-1.5 px-3"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </ProtectedRoute>
  )
}