'use client'
import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, TrendingUp, CheckCircle, Target,
  Plus, Edit, Trash2, MapPin, User, Calendar, Layers, WifiOff
} from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Obra = {
  id: number
  obrapadreid: number | null
  nombre: string
  descripcion: string | null
  cliente: string | null
  ubicacion: string | null
  presupuestototal: number
  progreso: number
  estado: string
  fechainicio: string | null
  fechafin: string | null
}

type ObraConHijos = Obra & { hijos: ObraConHijos[] }

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    activas: 0,
    presupuestoTotal: 0,
    progresoPromedio: 0
  })
  const [vistaJerarquica, setVistaJerarquica] = useState(true)

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('obras')

  useEffect(() => {
    cargarObras()
  }, [])

  const cargarObras = async () => {
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      const obrasData = data as Obra[]
      setObras(obrasData)
      const total = obrasData.length
      const activas = obrasData.filter(o => o.estado !== 'Finalizado').length
      const presupuestoTotal = obrasData.reduce((sum, o) => sum + (o.presupuestototal || 0), 0)
      const progresoPromedio = total ? Math.round(obrasData.reduce((sum, o) => sum + (o.progreso || 0), 0) / total) : 0
      setStats({ total, activas, presupuestoTotal, progresoPromedio })
    }
    setLoading(false)
  }

  const eliminarObra = async (id: number) => {
    if (!confirm('¿Eliminar esta obra y todas sus subobras? Esta acción no se puede deshacer.')) return
    
    // OFFLINE: Usar mutate para eliminar
    const { error } = await mutate('delete', null, id)
    
    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      if (!isOnline) {
        alert('Obra marcada para eliminar. Se sincronizará al recuperar la conexión.')
      }
      cargarObras() // Refrescar lista (en modo offline mostrará el cambio local)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Planificado': return 'badge-info'
      case 'En progreso': return 'badge-active'
      case 'Pausado': return 'badge-pending'
      case 'Finalizado': return 'badge-done'
      default: return 'badge'
    }
  }

  // Función para construir árbol jerárquico (CORREGIDA)
  const construirJerarquia = (lista: Obra[]): ObraConHijos[] => {
    const mapa = new Map<number, ObraConHijos>()
    lista.forEach(o => mapa.set(o.id, { ...o, hijos: [] }))
    const raices: ObraConHijos[] = []
    lista.forEach(o => {
      if (o.obrapadreid) {
        const padre = mapa.get(o.obrapadreid)
        if (padre) padre.hijos.push(mapa.get(o.id)!)
      } else {
        raices.push(mapa.get(o.id)!)
      }
    })
    return raices
  }

  const renderObra = (obra: ObraConHijos, nivel: number = 0): React.ReactNode => {
    const progreso = obra.progreso || 0
    return (
      <React.Fragment key={obra.id}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: nivel * 0.02 }}
          className="card p-5"
          style={{ marginLeft: `${nivel * 20}px` }}
        >
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {nivel > 0 && <Layers size={14} className="inline mr-2" style={{ color: 'var(--text-muted)' }} />}
                  {obra.nombre}
                </h2>
                <span className={`badge ${getEstadoBadge(obra.estado)}`} style={{ fontSize: '0.6rem' }}>
                  {obra.estado}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                {obra.cliente && <div className="flex items-center gap-2"><User size={12} style={{ color: 'var(--text-muted)' }} /><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{obra.cliente}</span></div>}
                {obra.ubicacion && <div className="flex items-center gap-2"><MapPin size={12} style={{ color: 'var(--text-muted)' }} /><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{obra.ubicacion}</span></div>}
                {obra.fechainicio && <div className="flex items-center gap-2"><Calendar size={12} style={{ color: 'var(--text-muted)' }} /><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Inicio: {new Date(obra.fechainicio).toLocaleDateString()}</span></div>}
                {obra.fechafin && <div className="flex items-center gap-2"><Calendar size={12} style={{ color: 'var(--text-muted)' }} /><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Fin: {new Date(obra.fechafin).toLocaleDateString()}</span></div>}
              </div>
              <div className="max-w-md">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Progreso</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red-core)', fontWeight: 600 }}>{progreso}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progreso}%` }} />
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: 'var(--red-core)' }}>RD$ {obra.presupuestototal?.toLocaleString()}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>Presupuesto</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <Link href={`/obras/nueva?padre=${obra.id}`} className="btn-ghost text-sm py-1.5 px-3">
              <Plus size={14} /> Subobra
            </Link>
            <Link href={`/obras/editar/${obra.id}`} className="btn-ghost text-sm py-1.5 px-3">
              <Edit size={14} /> Editar
            </Link>
            <button onClick={() => eliminarObra(obra.id)} className="btn-danger text-sm py-1.5 px-3">
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </motion.div>
        {obra.hijos.map(hijo => renderObra(hijo, nivel + 1))}
      </React.Fragment>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--red-core)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>CARGANDO OBRAS...</p>
      </div>
    )
  }

  const obrasJerarquicas = construirJerarquia(obras)

  return (
    <ProtectedRoute>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-screen-2xl mx-auto">
        {/* OFFLINE: Badge de estado sin conexión */}
        {!isOnline && (
          <div className="mb-3 p-2 card-alert flex items-center gap-2 text-sm">
            <WifiOff size={16} /> Modo sin conexión — los cambios se guardarán localmente
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="glitch font-display font-bold text-4xl" data-text="Obras" style={{ color: 'var(--text-primary)' }}>Obras</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>GESTIÓN DE PROYECTOS · {stats.total} REGISTROS</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setVistaJerarquica(!vistaJerarquica)} className="btn-ghost text-sm">
              {vistaJerarquica ? 'Vista plana' : 'Vista jerárquica'}
            </button>
            <Link href="/obras/nueva" className="btn-primary flex items-center gap-2"><Plus size={16} /> Nueva Obra</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3"><p className="kpi-label">Total Obras</p><div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={15} style={{ color: 'var(--red-core)' }} /></div></div>
            <p className="kpi-value">{stats.total}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Proyectos registrados</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3"><p className="kpi-label">Activas</p><div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={15} style={{ color: '#00C47A' }} /></div></div>
            <p className="kpi-value">{stats.activas}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>En progreso / planificadas</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3"><p className="kpi-label">Presupuesto Total</p><div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={15} style={{ color: 'var(--red-core)' }} /></div></div>
            <p className="kpi-value">RD$ {stats.presupuestoTotal.toLocaleString()}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Inversión total</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3"><p className="kpi-label">Progreso Promedio</p><div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={15} style={{ color: 'var(--red-core)' }} /></div></div>
            <p className="kpi-value">{stats.progresoPromedio}%</p>
            <div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${stats.progresoPromedio}%` }} /></div>
          </motion.div>
        </div>

        {obras.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center">
            <Building2 size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>NO HAY OBRAS REGISTRADAS</p>
            <Link href="/obras/nueva" className="btn-primary mt-4 inline-flex"><Plus size={14} /> Crear primera obra</Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {vistaJerarquica
                ? obrasJerarquicas.map(obra => renderObra(obra, 0))
                : obras.map((obra, i) => (
                    <motion.div key={obra.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.03 }} className="card p-5">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{obra.nombre}</h2>
                            <span className={`badge ${getEstadoBadge(obra.estado)}`} style={{ fontSize: '0.6rem' }}>{obra.estado}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                            {obra.cliente && <div className="flex items-center gap-2"><User size={12} style={{ color: 'var(--text-muted)' }} /><span>{obra.cliente}</span></div>}
                            {obra.ubicacion && <div className="flex items-center gap-2"><MapPin size={12} style={{ color: 'var(--text-muted)' }} /><span>{obra.ubicacion}</span></div>}
                          </div>
                          <div className="max-w-md">
                            <div className="flex justify-between text-xs mb-1"><span>Progreso</span><span>{obra.progreso}%</span></div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${obra.progreso}%` }} /></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: 'var(--red-core)' }}>RD$ {obra.presupuestototal?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <Link href={`/obras/nueva?padre=${obra.id}`} className="btn-ghost text-sm py-1.5 px-3"><Plus size={14} /> Subobra</Link>
                        <Link href={`/obras/editar/${obra.id}`} className="btn-ghost text-sm py-1.5 px-3"><Edit size={14} /> Editar</Link>
                        <button onClick={() => eliminarObra(obra.id)} className="btn-danger text-sm py-1.5 px-3"><Trash2 size={14} /> Eliminar</button>
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