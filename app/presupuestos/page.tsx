'use client'

import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, TrendingUp, AlertCircle, Target,
  Plus, Edit, Trash2, Building2, WifiOff
} from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Presupuesto = {
  id: number
  obraid: number
  concepto: string
  montoasignado: number
  montogastado: number
  obras?: { nombre: string }
}

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAsignado: 0,
    totalGastado: 0,
    totalDisponible: 0,
    porcentajeGasto: 0
  })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('presupuestos')

  useEffect(() => {
    cargarPresupuestos()
  }, [])

  const cargarPresupuestos = async () => {
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*, obras(nombre)')
      .order('id', { ascending: false })

    if (!error && data) {
      const presData = data as Presupuesto[]
      setPresupuestos(presData)

      const totalAsignado = presData.reduce((sum, p) => sum + p.montoasignado, 0)
      const totalGastado = presData.reduce((sum, p) => sum + p.montogastado, 0)
      const totalDisponible = totalAsignado - totalGastado
      const porcentajeGasto = totalAsignado > 0 ? (totalGastado / totalAsignado) * 100 : 0

      setStats({ totalAsignado, totalGastado, totalDisponible, porcentajeGasto })
    }
    setLoading(false)
  }

  const eliminarPresupuesto = async (id: number) => {
    if (!confirm('¿Eliminar este presupuesto?')) return
    
    // OFFLINE: Usar mutate para eliminar
    const result = await mutate('update', payload, parseInt(Id));
    
    if (result.error) {
      alert('Error al eliminar: ' + result.error.message)
    } else {
      if (!isOnline) {
        alert('Presupuesto marcado para eliminar. Se sincronizará al recuperar la conexión.')
      }
      cargarPresupuestos()
    }
  }

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
          CARGANDO PRESUPUESTOS...
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
            <WifiOff size={16} /> Modo sin conexión — los cambios se guardarán localmente
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="glitch font-display font-bold text-4xl"
                data-text="Presupuestos"
                style={{ color: 'var(--text-primary)' }}>
              Presupuestos
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              CONTROL DE COSTOS · {presupuestos.length} REGISTROS
            </p>
          </div>
          <Link href="/presupuestos/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo Presupuesto
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">Total Asignado</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={15} style={{ color: 'var(--red-core)' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">RD$ {stats.totalAsignado.toLocaleString()}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Presupuesto total</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">Total Gastado</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={15} style={{ color: '#F59E0B' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">RD$ {stats.totalGastado.toLocaleString()}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {stats.porcentajeGasto.toFixed(1)}% ejecutado
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">Disponible</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={15} style={{ color: '#00C47A' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">RD$ {stats.totalDisponible.toLocaleString()}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Saldo disponible</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`kpi-card ${stats.porcentajeGasto > 80 ? 'card-alert' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">% Ejecutado</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={15} style={{ color: stats.porcentajeGasto > 80 ? 'var(--red-core)' : 'var(--text-muted)' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">{stats.porcentajeGasto.toFixed(1)}%</p>
            <div className="progress-track mt-2">
              <div className="progress-fill" style={{ width: `${Math.min(stats.porcentajeGasto, 100)}%` }} />
            </div>
          </motion.div>
        </div>

        {/* Listado */}
        {presupuestos.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center">
            <Wallet size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              NO HAY PRESUPUESTOS REGISTRADOS
            </p>
            <Link href="/presupuestos/nuevo" className="btn-primary mt-4 inline-flex">
              <Plus size={14} /> Crear primer presupuesto
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {presupuestos.map((pres, i) => {
                const porcentaje = (pres.montogastado / pres.montoasignado) * 100
                return (
                  <motion.div
                    key={pres.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.03 }}
                    className="card p-5"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {pres.concepto}
                          </h2>
                        </div>

                        <div className="flex items-center gap-2 text-sm mb-4">
                          <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {pres.obras?.nombre || 'Sin obra'}
                          </span>
                        </div>

                        {/* Barra de progreso de gasto */}
                        <div className="max-w-md">
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Ejecutado</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: porcentaje > 80 ? 'var(--red-core)' : '#00C47A', fontWeight: 600 }}>
                              {porcentaje.toFixed(1)}%
                            </span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${Math.min(porcentaje, 100)}%` }} />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                              Gastado: RD$ {pres.montogastado.toLocaleString()}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                              Asignado: RD$ {pres.montoasignado.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      <Link href={`/presupuestos/editar/${pres.id}`} className="btn-ghost text-sm py-1.5 px-3">
                        <Edit size={14} /> Editar
                      </Link>
                      <button onClick={() => eliminarPresupuesto(pres.id)} className="btn-danger text-sm py-1.5 px-3">
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </ProtectedRoute>
  )
}