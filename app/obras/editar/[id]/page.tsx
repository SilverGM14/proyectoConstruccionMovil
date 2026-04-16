'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import { Save, X, Building2, FileText, User, MapPin, DollarSign, Calendar, Percent, WifiOff } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type ObraForm = {
  nombre: string
  descripcion: string
  cliente: string
  ubicacion: string
  presupuestototal: string
  estado: string
  progreso: string
  fechainicio: string
  fechafin: string
}

export default function EditarObra({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ObraForm>({
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

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('obras')

  useEffect(() => {
    const fetchObra = async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        alert('Error al cargar la obra')
        router.push('/obras')
      } else if (data) {
        setForm({
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          cliente: data.cliente || '',
          ubicacion: data.ubicacion || '',
          presupuestototal: data.presupuestototal?.toString() || '',
          estado: data.estado || 'Planificado',
          progreso: data.progreso?.toString() || '0',
          fechainicio: data.fechainicio?.split('T')[0] || '',
          fechafin: data.fechafin?.split('T')[0] || ''
        })
      }
    }
    fetchObra()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
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

    // OFFLINE: Usar mutate en lugar de supabase directamente
    const { error } = await mutate('update', payload, parseInt(id))

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      if (!isOnline) {
        alert('Obra guardada localmente. Se sincronizará al recuperar la conexión.')
      }
      router.push('/obras')
    }
    setLoading(false)
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        {/* OFFLINE: Badge de estado sin conexión */}
        {!isOnline && (
          <div className="mb-3 p-2 card-alert flex items-center gap-2 text-sm">
            <WifiOff size={16} /> Modo sin conexión — los cambios se guardarán localmente
          </div>
        )}

        <div className="card p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold glitch" data-text="Editar Obra"
                style={{ color: 'var(--text-primary)' }}>
              Editar Obra
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ID: {id} · ACTUALIZAR INFORMACIÓN
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="input-label"><Building2 size={12} className="inline mr-1" /> NOMBRE *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} required className="input-cyber" />
              </div>
              <div>
                <label className="input-label"><User size={12} className="inline mr-1" /> CLIENTE</label>
                <input name="cliente" value={form.cliente} onChange={handleChange} className="input-cyber" />
              </div>
              <div>
                <label className="input-label"><MapPin size={12} className="inline mr-1" /> UBICACIÓN</label>
                <input name="ubicacion" value={form.ubicacion} onChange={handleChange} className="input-cyber" />
              </div>
              <div>
                <label className="input-label"><DollarSign size={12} className="inline mr-1" /> PRESUPUESTO (RD$)</label>
                <input name="presupuestototal" type="number" step="0.01" value={form.presupuestototal} onChange={handleChange} className="input-cyber" />
              </div>
              <div>
                <label className="input-label"><FileText size={12} className="inline mr-1" /> ESTADO</label>
                <select name="estado" value={form.estado} onChange={handleChange} className="input-cyber">
                  <option>Planificado</option>
                  <option>En progreso</option>
                  <option>Pausado</option>
                  <option>Finalizado</option>
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
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} className="input-cyber" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Save size={16} /> {loading ? 'Guardando...' : 'Actualizar Obra'}
              </button>
              <button type="button" onClick={() => router.push('/obras')} className="btn-ghost flex items-center gap-2">
                <X size={16} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}