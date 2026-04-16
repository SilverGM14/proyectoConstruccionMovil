'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Save, X, Building2, FileText, User, MapPin, DollarSign, Calendar, Percent, Layers, WifiOff } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Obra = { id: number; nombre: string }

function NuevaObraForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const padreId = searchParams.get('padre')
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<Obra[]>([])
  const [form, setForm] = useState({
    obrapadreid: padreId || '',
    nombre: '',
    descripcion: '',
    cliente: '',
    ubicacion: '',
    presupuestototal: '',
    estado: 'Planificado',
    progreso: '0',
    fechainicio: '',
    fechafin: ''
  })

  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('obras')

  useEffect(() => {
    supabase.from('obras').select('id, nombre').then(res => { if (res.data) setObras(res.data) })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    setLoading(true)

    const payload = {
      obrapadreid: form.obrapadreid ? parseInt(form.obrapadreid) : null,
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      cliente: form.cliente || null,
      ubicacion: form.ubicacion || null,
      presupuestototal: parseFloat(form.presupuestototal) || 0,
      estado: form.estado,
      progreso: parseInt(form.progreso) || 0,
      fechainicio: form.fechainicio || null,
      fechafin: form.fechafin || null
    }

    // OFFLINE: insert — no ID needed for new records
    const result = await mutate('insert', payload)

    if (result.error) {
      alert('Error: ' + result.error.message)
    } else {
      if (!isOnline) {
        alert('Obra guardada localmente. Se sincronizará al recuperar la conexión.')
      }
      router.push('/obras')
    }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
      {!isOnline && (
        <div className="mb-3 p-2 card-alert flex items-center gap-2 text-sm">
          <WifiOff size={16} /> Modo sin conexión — los cambios se guardarán localmente
        </div>
      )}

      <div className="card p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold glitch" data-text={padreId ? "Nueva Subobra" : "Nueva Obra"}>{padreId ? "Nueva Subobra" : "Nueva Obra"}</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>REGISTRAR NUEVO PROYECTO</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="input-label"><Layers size={12} className="inline mr-1" /> OBRA PADRE</label>
              <select name="obrapadreid" value={form.obrapadreid} onChange={handleChange} className="input-cyber">
                <option value="">Ninguna (obra principal)</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label"><Building2 size={12} className="inline mr-1" /> NOMBRE *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className="input-cyber" placeholder="ej. Residencial Las Palmas" />
            </div>
            <div>
              <label className="input-label"><User size={12} className="inline mr-1" /> CLIENTE</label>
              <input name="cliente" value={form.cliente} onChange={handleChange} className="input-cyber" placeholder="ej. Juan Pérez" />
            </div>
            <div>
              <label className="input-label"><MapPin size={12} className="inline mr-1" /> UBICACIÓN</label>
              <input name="ubicacion" value={form.ubicacion} onChange={handleChange} className="input-cyber" placeholder="ej. Santo Domingo" />
            </div>
            <div>
              <label className="input-label"><DollarSign size={12} className="inline mr-1" /> PRESUPUESTO (RD$)</label>
              <input name="presupuestototal" type="number" step="0.01" value={form.presupuestototal} onChange={handleChange} className="input-cyber" />
            </div>
            <div>
              <label className="input-label"><FileText size={12} className="inline mr-1" /> ESTADO</label>
              <select name="estado" value={form.estado} onChange={handleChange} className="input-cyber">
                <option>Planificado</option><option>En progreso</option><option>Pausado</option><option>Finalizado</option>
              </select>
            </div>
            <div>
              <label className="input-label"><Percent size={12} className="inline mr-1" /> PROGRESO (%)</label>
              <input name="progreso" type="number" min="0" max="100" value={form.progreso} onChange={handleChange} className="input-cyber" />
            </div>
            <div>
              <label className="input-label"><Calendar size={12} className="inline mr-1" /> FECHA INICIO</label>
              <input name="fechainicio" type="date" value={form.fechainicio} onChange={handleChange} className="input-cyber" />
            </div>
            <div>
              <label className="input-label"><Calendar size={12} className="inline mr-1" /> FECHA FIN</label>
              <input name="fechafin" type="date" value={form.fechafin} onChange={handleChange} className="input-cyber" />
            </div>
          </div>
          <div>
            <label className="input-label"><FileText size={12} className="inline mr-1" /> DESCRIPCIÓN</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} className="input-cyber" placeholder="Detalles del proyecto..." />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => router.push('/obras')} className="btn-ghost flex items-center gap-2">
              <X size={16} /> Cancelar
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

export default function NuevaObra() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex justify-center p-8">Cargando...</div>}>
        <NuevaObraForm />
      </Suspense>
    </ProtectedRoute>
  )
}