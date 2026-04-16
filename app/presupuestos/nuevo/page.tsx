'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, X, Building2, FileText, DollarSign, Tag, WifiOff } from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Obra = { id: number; nombre: string; obrapadreid: number | null }
type Categoria = { id: number; nombre: string; color: string }

// Tipo recursivo para obras con hijos
type ObraConHijos = Obra & { hijos: ObraConHijos[] }

export default function NuevoPresupuesto() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<Obra[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({
    obraid: '',
    categoriaid: '',
    concepto: '',
    montoasignado: '',
    montogastado: '0'
  })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('presupuestos')

  useEffect(() => {
    const cargar = async () => {
      const [obr, cat] = await Promise.all([
        supabase.from('obras').select('id, nombre, obrapadreid'),
        supabase.from('categoriaspresupuesto').select('*').order('nombre')
      ])
      if (obr.data) setObras(obr.data)
      if (cat.data) setCategorias(cat.data)
    }
    cargar()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.obraid || !form.concepto || !form.montoasignado) { 
      alert('Completa campos obligatorios')
      return 
    }
    setLoading(true)
    
    const payload = {
      obraid: parseInt(form.obraid),
      categoriaid: form.categoriaid ? parseInt(form.categoriaid) : null,
      concepto: form.concepto,
      montoasignado: parseFloat(form.montoasignado),
      montogastado: parseFloat(form.montogastado) || 0
    }

    // OFFLINE: Usar mutate para inserción
    const result = await mutate('update', payload, parseInt(Id));

    if (result.error) {
      alert('Error: ' + result.error.message)
    } else {
      if (!isOnline) {
        alert('Presupuesto guardado localmente. Se sincronizará al recuperar la conexión.')
      }
      router.push('/presupuestos')
    }
    setLoading(false)
  }

  // Función para mostrar jerarquía en select de obras
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
            <h1 className="text-2xl font-bold glitch" data-text="Nuevo Presupuesto">Nuevo Presupuesto</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>ASIGNAR PARTIDA PRESUPUESTARIA</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="input-label"><Building2 size={12} className="inline mr-1" /> OBRA / FASE *</label>
              <select name="obraid" value={form.obraid} onChange={handleChange} required className="input-cyber">
                <option value="">Selecciona</option>
                {obrasJerarquicas().map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label"><Tag size={12} className="inline mr-1" /> CATEGORÍA</label>
              <select name="categoriaid" value={form.categoriaid} onChange={handleChange} className="input-cyber">
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label"><FileText size={12} className="inline mr-1" /> CONCEPTO *</label>
              <input name="concepto" value={form.concepto} onChange={handleChange} required className="input-cyber" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><label className="input-label"><DollarSign size={12} /> ASIGNADO *</label><input name="montoasignado" type="number" step="0.01" value={form.montoasignado} onChange={handleChange} required className="input-cyber" /></div>
              <div><label className="input-label"><DollarSign size={12} /> GASTADO</label><input name="montogastado" type="number" step="0.01" value={form.montogastado} onChange={handleChange} className="input-cyber" /></div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className="btn-primary"><Save size={16} /> {loading ? 'Guardando...' : 'Guardar'}</button>
              <button type="button" onClick={() => router.push('/presupuestos')} className="btn-ghost"><X size={16} /> Cancelar</button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProtectedRoute>
  )
}