'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, FileText, Building2, Save, WifiOff, AlertCircle } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Obra = { Id: number; Nombre: string }

export default function NuevoDocumento() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    Nombre: '',
    Descripcion: '',
    ObraId: ''
  })

  // OFFLINE: Hook de red
  const isOnline = useNetworkStatus()

  useEffect(() => {
    supabase.from('Obras').select('Id, Nombre').then(res => {
      if (res.data) setObras(res.data)
    })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!form.Nombre) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setForm(prev => ({ ...prev, Nombre: nameWithoutExt }))
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // OFFLINE: La subida de archivos requiere conexión
    if (!isOnline) {
      alert('No se pueden subir archivos sin conexión a internet.')
      return
    }

    if (!selectedFile) {
      alert('Selecciona un archivo')
      return
    }
    if (!form.Nombre) {
      alert('El nombre es obligatorio')
      return
    }

    setLoading(true)

    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `documentos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('Documentos')
        .insert({
          Nombre: form.Nombre,
          Descripcion: form.Descripcion || null,
          RutaArchivo: urlData.publicUrl,
          ObraId: form.ObraId ? parseInt(form.ObraId) : null,
          Tipo: selectedFile.type,
          FechaSubida: new Date().toISOString()
        })

      if (dbError) throw dbError

      router.push('/documentos')
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* OFFLINE: Aviso de que se requiere conexión para subir */}
        {!isOnline && (
          <div className="mb-3 p-2 card-alert flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> Sin conexión — la subida de archivos no está disponible
          </div>
        )}

        <div className="card p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold glitch" data-text="Subir Documento"
                style={{ color: 'var(--text-primary)' }}>
              Subir Documento
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              CARGAR ARCHIVO AL SISTEMA
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              onClick={() => isOnline && fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 0,
                padding: '2rem',
                textAlign: 'center',
                cursor: isOnline ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                background: selectedFile ? 'var(--red-ghost)' : 'transparent',
                borderColor: selectedFile ? 'var(--red-core)' : 'var(--border)',
                opacity: isOnline ? 1 : 0.6
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
                disabled={!isOnline}
              />
              {selectedFile ? (
                <div>
                  <FileText size={40} style={{ color: 'var(--red-core)', margin: '0 auto 0.5rem' }} />
                  <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Desconocido'}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="btn-ghost text-sm mt-3"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                  <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {isOnline ? 'HAZ CLIC O ARRASTRA UN ARCHIVO' : 'SIN CONEXIÓN — NO SE PUEDEN SUBIR ARCHIVOS'}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    PDF, Word, Excel, Imágenes, etc.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="input-label">
                <FileText size={12} className="inline mr-1" /> NOMBRE *
              </label>
              <input
                name="Nombre"
                value={form.Nombre}
                onChange={handleChange}
                required
                className="input-cyber"
                placeholder="ej. Plano Arquitectónico"
              />
            </div>

            <div>
              <label className="input-label">
                <FileText size={12} className="inline mr-1" /> DESCRIPCIÓN
              </label>
              <textarea
                name="Descripcion"
                value={form.Descripcion}
                onChange={handleChange}
                rows={2}
                className="input-cyber"
                placeholder="Detalles adicionales..."
              />
            </div>

            <div>
              <label className="input-label">
                <Building2 size={12} className="inline mr-1" /> OBRA (opcional)
              </label>
              <select
                name="ObraId"
                value={form.ObraId}
                onChange={handleChange}
                className="input-cyber"
              >
                <option value="">Sin obra asignada</option>
                {obras.map(o => <option key={o.Id} value={o.Id}>{o.Nombre}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || !selectedFile || !isOnline}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={16} /> {loading ? 'Subiendo...' : 'Subir Documento'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/documentos')}
                className="btn-ghost flex items-center gap-2"
              >
                <X size={16} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}