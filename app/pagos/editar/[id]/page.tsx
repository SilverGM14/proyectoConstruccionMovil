'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import { Save, X, User, Building2, Calendar, DollarSign, FileText, AlertCircle, WifiOff } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Empleado = { id: number; nombre: string }
type Obra = { id: number; nombre: string }

export default function EditarPago({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [form, setForm] = useState({
    empleadoid: '',
    obraid: '',
    fecha: '',
    monto: '',
    concepto: '',
    estado: 'Pendiente',
    notas: ''
  })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('pagos')

  useEffect(() => {
    const fetchData = async () => {
      const [pagoRes, empRes, obrasRes] = await Promise.all([
        supabase.from('pagos').select('*').eq('id', id).single(),
        supabase.from('empleados').select('id, nombre'),
        supabase.from('obras').select('id, nombre')
      ])

      if (pagoRes.data) {
        const p = pagoRes.data
        setForm({
          empleadoid: p.empleadoid.toString(),
          obraid: p.obraid?.toString() || '',
          fecha: p.fecha,
          monto: p.monto.toString(),
          concepto: p.concepto,
          estado: p.estado,
          notas: p.notas || ''
        })
      }
      if (empRes.data) setEmpleados(empRes.data)
      if (obrasRes.data) setObras(obrasRes.data)
    }
    fetchData()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.empleadoid) {
      alert('Selecciona un empleado')
      return
    }
    setLoading(true)

    const payload = {
      empleadoid: parseInt(form.empleadoid),
      obraid: form.obraid ? parseInt(form.obraid) : null,
      fecha: form.fecha,
      monto: parseFloat(form.monto),
      concepto: form.concepto,
      estado: form.estado,
      notas: form.notas || null
    }

    // OFFLINE: Usar mutate en lugar de supabase directamente
    const result = await mutate('update', payload, parseInt(Id));

    if (result.error) {
      alert('Error: ' + result.error.message)
    } else {
      if (!isOnline) {
        alert('Pago actualizado localmente. Se sincronizará al recuperar la conexión.')
      }
      router.push('/pagos')
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
            <h1 className="text-2xl font-bold glitch" data-text="Editar Pago"
                style={{ color: 'var(--text-primary)' }}>
              Editar Pago
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ID: {id} · ACTUALIZAR INFORMACIÓN
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="input-label"><User size={12} className="inline mr-1" /> EMPLEADO *</label>
              <select name="empleadoid" value={form.empleadoid} onChange={handleChange} required className="input-cyber">
                <option value="">Selecciona un empleado</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label"><Building2 size={12} className="inline mr-1" /> OBRA (opcional)</label>
              <select name="obraid" value={form.obraid} onChange={handleChange} className="input-cyber">
                <option value="">Sin obra asignada</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="input-label"><Calendar size={12} className="inline mr-1" /> FECHA *</label>
                <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className="input-cyber" />
              </div>
              <div>
                <label className="input-label"><DollarSign size={12} className="inline mr-1" /> MONTO (RD$) *</label>
                <input name="monto" type="number" step="0.01" value={form.monto} onChange={handleChange} required className="input-cyber" />
              </div>
            </div>

            <div>
              <label className="input-label"><FileText size={12} className="inline mr-1" /> CONCEPTO *</label>
              <input name="concepto" value={form.concepto} onChange={handleChange} required className="input-cyber" />
            </div>

            <div>
              <label className="input-label"><AlertCircle size={12} className="inline mr-1" /> ESTADO</label>
              <select name="estado" value={form.estado} onChange={handleChange} className="input-cyber">
                <option>Pendiente</option>
                <option>Pagado</option>
                <option>Anulado</option>
              </select>
            </div>

            <div>
              <label className="input-label"><FileText size={12} className="inline mr-1" /> NOTAS</label>
              <textarea name="notas" value={form.notas} onChange={handleChange} rows={2} className="input-cyber" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Save size={16} /> {loading ? 'Guardando...' : 'Actualizar Pago'}
              </button>
              <button type="button" onClick={() => router.push('/pagos')} className="btn-ghost flex items-center gap-2">
                <X size={16} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}