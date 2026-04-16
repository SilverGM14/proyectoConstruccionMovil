'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import { Save, X, Building2, FileText, DollarSign, WifiOff } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Obra = { id: number; nombre: string }

export default function EditarPresupuesto({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<Obra[]>([])
  const [form, setForm] = useState({
    obraid: '',
    concepto: '',
    montoasignado: '',
    montogastado: ''
  })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('presupuestos')

  useEffect(() => {
    const fetchData = async () => {
      const [presRes, obrasRes] = await Promise.all([
        supabase.from('presupuestos').select('*').eq('id', id).single(),
        supabase.from('obras').select('id, nombre')
      ])

      if (presRes.data) {
        const p = presRes.data
        setForm({
          obraid: p.obraid.toString(),
          concepto: p.concepto || '',
          montoasignado: p.montoasignado?.toString() || '0',
          montogastado: p.montogastado?.toString() || '0'
        })
      }
      if (obrasRes.data) setObras(obrasRes.data)
    }
    fetchData()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.obraid) {
      alert('Selecciona una obra')
      return
    }
    setLoading(true)

    const payload = {
      obraid: parseInt(form.obraid),
      concepto: form.concepto,
      montoasignado: parseFloat(form.montoasignado) || 0,
      montogastado: parseFloat(form.montogastado) || 0
    }

    // OFFLINE: Usar mutate
    const { error } = await mutate('update', payload, parseInt(id))

    if (error) {
      alert('Error: ' + error.message)
    } else {
      if (!isOnline) {
        alert('Presupuesto guardado localmente. Se sincronizará al recuperar la conexión.')
      }
      router.push('/presupuestos')
    }
    setLoading(false)
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
            <h1 className="text-2xl font-bold glitch" data-text="Editar Presupuesto"
                style={{ color: 'var(--text-primary)' }}>
              Editar Presupuesto
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ID: {id} · ACTUALIZAR INFORMACIÓN
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="input-label"><Building2 size={12} className="inline mr-1" /> OBRA *</label>
              <select name="obraid" value={form.obraid} onChange={handleChange} required className="input-cyber">
                <option value="">Selecciona una obra</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label"><FileText size={12} className="inline mr-1" /> CONCEPTO *</label>
              <input name="concepto" value={form.concepto} onChange={handleChange} required className="input-cyber" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="input-label"><DollarSign size={12} className="inline mr-1" /> MONTO ASIGNADO *</label>
                <input name="montoasignado" type="number" step="0.01" value={form.montoasignado} onChange={handleChange} required className="input-cyber" />
              </div>
              <div>
                <label className="input-label"><DollarSign size={12} className="inline mr-1" /> MONTO GASTADO</label>
                <input name="montogastado" type="number" step="0.01" value={form.montogastado} onChange={handleChange} className="input-cyber" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Save size={16} /> {loading ? 'Guardando...' : 'Actualizar Presupuesto'}
              </button>
              <button type="button" onClick={() => router.push('/presupuestos')} className="btn-ghost flex items-center gap-2">
                <X size={16} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}