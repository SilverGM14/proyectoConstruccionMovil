'use client'

import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Clock, CheckCircle, AlertCircle,
  Plus, Edit, Trash2, User, Building2, Calendar, FileText, WifiOff
} from 'lucide-react'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

type Pago = {
  id: number
  empleadoid: number
  obraid?: number | null
  fecha: string
  monto: number
  concepto: string
  estado: string
  notas?: string | null
  empleados?: { nombre: string }
  obras?: { nombre: string }
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPagado: 0,
    totalPendiente: 0,
    cantidadPagados: 0,
    cantidadPendientes: 0
  })

  // OFFLINE: Hooks de red y mutación offline
  const isOnline = useNetworkStatus()
  const { mutate } = useOfflineMutation('pagos')

  useEffect(() => {
    cargarPagos()
  }, [])

  const cargarPagos = async () => {
    const { data, error } = await supabase
      .from('pagos')
      .select('*, empleados(nombre), obras(nombre)')
      .order('fecha', { ascending: false })

    if (!error && data) {
      const pagosData = data as Pago[]
      setPagos(pagosData)

      const pagados = pagosData.filter(p => p.estado === 'Pagado')
      const pendientes = pagosData.filter(p => p.estado === 'Pendiente')

      setStats({
        totalPagado: pagados.reduce((sum, p) => sum + p.monto, 0),
        totalPendiente: pendientes.reduce((sum, p) => sum + p.monto, 0),
        cantidadPagados: pagados.length,
        cantidadPendientes: pendientes.length
      })
    }
    setLoading(false)
  }

  const eliminarPago = async (id: number) => {
    if (!confirm('¿Eliminar este pago?')) return

    // OFFLINE: Usar mutate para eliminar
    const { error } = await mutate('delete', null, id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      if (!isOnline) {
        alert('Pago marcado para eliminar. Se sincronizará al recuperar la conexión.')
      }
      cargarPagos()
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pagado': return 'badge-active'
      case 'Pendiente': return 'badge-pending'
      case 'Anulado': return 'badge-danger'
      default: return 'badge'
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
          CARGANDO PAGOS...
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
                data-text="Pagos"
                style={{ color: 'var(--text-primary)' }}>
              Pagos
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              GESTIÓN DE NÓMINA · {pagos.length} REGISTROS
            </p>
          </div>
          <Link href="/pagos/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo Pago
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">Total Pagado</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={15} style={{ color: '#00C47A' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">RD$ {stats.totalPagado.toLocaleString()}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {stats.cantidadPagados} pagos confirmados
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card card-alert">
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">Total Pendiente</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={15} style={{ color: '#F59E0B' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">RD$ {stats.totalPendiente.toLocaleString()}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {stats.cantidadPendientes} pagos por confirmar
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">Total Registros</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={15} style={{ color: 'var(--red-core)' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">{pagos.length}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Pagos registrados
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <p className="kpi-label">Promedio por Pago</p>
              <div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={15} style={{ color: 'var(--red-core)' }} />
              </div>
            </div>
            <p className="kpi-value count-animate">
              RD$ {pagos.length ? Math.round(pagos.reduce((s, p) => s + p.monto, 0) / pagos.length).toLocaleString() : 0}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Monto promedio
            </p>
          </motion.div>
        </div>

        {/* Listado */}
        {pagos.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center">
            <DollarSign size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              NO HAY PAGOS REGISTRADOS
            </p>
            <Link href="/pagos/nuevo" className="btn-primary mt-4 inline-flex">
              <Plus size={14} /> Registrar primer pago
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {pagos.map((pago, i) => (
                <motion.div
                  key={pago.id}
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
                          {pago.concepto}
                        </h2>
                        <span className={`badge ${getEstadoBadge(pago.estado)}`} style={{ fontSize: '0.6rem' }}>
                          {pago.estado}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {pago.empleados?.nombre || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {pago.obras?.nombre || 'Sin obra asignada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {new Date(pago.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        {pago.notas && (
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {pago.notas}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: pago.estado === 'Pagado' ? '#00C47A' : 'var(--red-core)' }}>
                        RD$ {pago.monto.toLocaleString()}
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        MONTO
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <Link href={`/pagos/editar/${pago.id}`} className="btn-ghost text-sm py-1.5 px-3">
                      <Edit size={14} /> Editar
                    </Link>
                    <button onClick={() => eliminarPago(pago.id)} className="btn-danger text-sm py-1.5 px-3">
                      <Trash2 size={14} /> Eliminar
                    </button>
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