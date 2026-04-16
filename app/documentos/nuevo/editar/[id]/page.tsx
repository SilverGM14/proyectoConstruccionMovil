'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import { Save, X, FileText, Building2, WifiOff } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Obra = { Id: number; Nombre: string }

export default function EditarDocumento({ params }: { params: Promise<{ Id: string }> }) {
  const router = useRouter()
  const { Id } = use(params)
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<Obra[]>([])
  const [documento, setDocumento] = useState<any>(null)
  const [form, setForm] = useState({
    Nombre: '',
    Descripcion: '',
    ObraId: ''
  })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('Documentos')

  useEffect(() => {
    const fetchData = async () => {
      const [docRes, obrasRes] = await Promise.all([
        supabase.from('Documentos').select('*, Obras(Nombre)').eq('Id', Id).single(),
        supabase.from('Obras').select('Id, Nombre')
      ])

      if (docRes.data) {
        const doc = docRes.data
        setDocumento(doc)
        setForm({
          Nombre: doc.Nombre || '',
          Descripcion: doc.Descripcion || '',
          ObraId: doc.ObraId?.toString() || ''
        })
      }
      if (obrasRes.data) setObras(obrasRes.data)
    }
    fetchData()
  }, [Id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      Nombre: form.Nombre,
      Descripcion: form.Descripcion || null,
      ObraId: form.ObraId ? parseInt(form.ObraId) : null
    }

    // OFFLINE: Usar mutate para actualizar metadatos
    const { error } = await mutate('update', payload, parseInt(Id))

    if (error) {
      alert('Error: ' + error.message)
    } else {
      if (!isOnline) {
        alert('Documento actualizado localmente. Se sincronizará al recuperar la conexión.')
      }
      router.push('/documentos')
    }
    setLoading(false)
  }

  if (!documento) {
    return (
      <div className="flex justify-center items-center h-64">
        <div style={{
          width: 40, height: 40,
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--red-core)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* OFFLINE: Badge de estado sin conexión */}
        {!isOnline && (
          <div className="mb-3 p-2 card-alert flex items-center gap-2 text-sm">
            <WifiOff size={16} /> Modo sin conexión — los cambios se guardarán localmente
          </div>
        )}

        <div className="card p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold glitch" data-text="Editar Documento"
                style={{ color: 'var(--text-primary)' }}>
              Editar Documento
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ID: {Id} · ACTUALIZAR METADATOS
            </p>
          </div>

          <div className="mb-6 p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <FileText size={24} style={{ color: 'var(--red-core)' }} />
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ARCHIVO ASOCIADO
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {documento.RutaArchivo.split('/').pop()}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {documento.Tipo} · {new Date(documento.FechaSubida).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                rows={3}
                className="input-cyber"
              />
            </div>

            <div>
              <label className="input-label">
                <Building2 size={12} className="inline mr-1" /> OBRA
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
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Save size={16} /> {loading ? 'Guardando...' : 'Actualizar'}
              </button>
              <button type="button" onClick={() => router.push('/documentos')} className="btn-ghost flex items-center gap-2">
                <X size={16} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}