'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, X, User, Building2, Calendar, DollarSign, FileText, AlertCircle, FolderOpen, WifiOff } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Empleado = { id: number; nombre: string }
type Obra = { id: number; nombre: string; obrapadreid: number | null }
type Presupuesto = { id: number; concepto: string; montoasignado: number; montogastado: number }

// Tipo recursivo para obras con hijos
type ObraConHijos = Obra & { hijos: ObraConHijos[] }

export default function NuevoPago() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [form, setForm] = useState({
    empleadoid: '',
    obraid: '',
    presupuestoid: '',
    fecha: new Date().toISOString().slice(0, 10),
    monto: '',
    concepto: '',
    estado: 'Pendiente',
    notas: ''
  })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('pagos')

  useEffect(() => {
    const cargar = async () => {
      const [emp, obr] = await Promise.all([
        supabase.from('empleados').select('id, nombre'),
        supabase.from('obras').select('id, nombre, obrapadreid')
      ])
      if (emp.data) setEmpleados(emp.data)
      if (obr.data) setObras(obr.data)
    }
    cargar()
  }, [])

  useEffect(() => {
    if (!form.obraid) { setPresupuestos([]); return }
    supabase.from('presupuestos').select('id, concepto, montoasignado, montogastado').eq('obraid', form.obraid).then(res => { if (res.data) setPresupuestos(res.data) })
  }, [form.obraid])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.empleadoid || !form.monto || !form.concepto) { alert('Completa campos obligatorios'); return }
    setLoading(true)

    const payload = {
      empleadoid: parseInt(form.empleadoid),
      obraid: form.obraid ? parseInt(form.obraid) : null,
      presupuestoid: form.presupuestoid ? parseInt(form.presupuestoid) : null,
      fecha: form.fecha,
      monto: parseFloat(form.monto),
      concepto: form.concepto,
      estado: form.estado,
      notas: form.notas || null
    }

    // OFFLINE: Usar mutate para inserción
    const { error } = await mutate('insert', payload)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      if (!isOnline) {
        alert('Pago guardado localmente. Se sincronizará al recuperar la conexión.')
      }
      router.push('/pagos')
    }
    setLoading(false)
  }

  // Función para mostrar jerarquía en select de obras (CORREGIDA)
  const obrasJerarquicas = () => {
    const mapa = new Map<number, ObraConHijos>()
    obras.forEach(o => mapa.set(o.id, { ...o, hijos: [] }))
    const raices: ObraConHijos[] = []
    obras.forEach(o => {
      if (o.obrapadreid) {
        const padre = mapa.get(o.obrapadreid)
        if (padre) padre.hijos.push(mapa.get(o.id)!)
      } else {
        raices.push(mapa.get(o.id)!)
      }
    })
    const resultado: { id: number; nombre: string }[] = []
    const recorrer = (nodo: ObraConHijos, nivel: number) => {
      resultado.push({ id: nodo.id, nombre: '— '.repeat(nivel) + nodo.nombre })
      nodo.hijos.forEach(h => recorrer(h, nivel + 1))
    }
    raices.forEach(r => recorrer(r, 0))
    return resultado
  }

  return (
    <ProtectedRoute>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        {/* OFFLINE: Badge de estado sin conexión */}
        {!isOnline && (
          <div className="mb-3 p-2 card-alert flex items-center gap-2 text-sm">
            <WifiOff size={16} /> Modo sin conexión — los cambios se guardarán localmente
          </div>
        )}

        <div className="card p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold glitch" data-text="Nuevo Pago">Nuevo Pago</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>REGISTRAR PAGO A EMPLEADO</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="input-label"><User size={12} className="inline mr-1" /> EMPLEADO *</label>
              <select name="empleadoid" value={form.empleadoid} onChange={handleChange} required className="input-cyber">
                <option value="">Selecciona</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label"><Building2 size={12} className="inline mr-1" /> OBRA / FASE</label>
              <select name="obraid" value={form.obraid} onChange={handleChange} className="input-cyber">
                <option value="">Sin obra</option>
                {obrasJerarquicas().map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label"><FolderOpen size={12} className="inline mr-1" /> PARTIDA PRESUPUESTARIA</label>
              <select name="presupuestoid" value={form.presupuestoid} onChange={handleChange} className="input-cyber" disabled={!form.obraid || presupuestos.length === 0}>
                <option value="">Sin partida</option>
                {presupuestos.map(p => {
                  const disponible = p.montoasignado - p.montogastado
                  return <option key={p.id} value={p.id}>{p.concepto} (Disp: RD$ {disponible.toLocaleString()})</option>
                })}
              </select>
              {form.obraid && presupuestos.length === 0 && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No hay presupuestos para esta obra.</p>}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><label className="input-label"><Calendar size={12} /> FECHA *</label><input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className="input-cyber" /></div>
              <div><label className="input-label"><DollarSign size={12} /> MONTO *</label><input name="monto" type="number" step="0.01" value={form.monto} onChange={handleChange} required className="input-cyber" /></div>
            </div>
            <div><label className="input-label"><FileText size={12} /> CONCEPTO *</label><input name="concepto" value={form.concepto} onChange={handleChange} required className="input-cyber" /></div>
            <div><label className="input-label"><AlertCircle size={12} /> ESTADO</label><select name="estado" value={form.estado} onChange={handleChange} className="input-cyber"><option>Pendiente</option><option>Pagado</option><option>Anulado</option></select></div>
            <div><label className="input-label"><FileText size={12} /> NOTAS</label><textarea name="notas" value={form.notas} onChange={handleChange} rows={2} className="input-cyber" /></div>
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className="btn-primary"><Save size={16} /> {loading ? 'Guardando...' : 'Guardar'}</button>
              <button type="button" onClick={() => router.push('/pagos')} className="btn-ghost"><X size={16} /> Cancelar</button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}