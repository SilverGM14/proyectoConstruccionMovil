'use client'

import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Phone, Mail, Briefcase, Plus, Edit, Trash2, UserPlus } from 'lucide-react'

type Empleado = {
  id: number
  nombre: string
  cargo?: string | null
  telefono?: string | null
  email?: string | null
  especialidad?: string | null
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, conCargo: 0, conEspecialidad: 0 })

  useEffect(() => {
    cargarEmpleados()
  }, [])

  const cargarEmpleados = async () => {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      const empData = data as Empleado[]
      setEmpleados(empData)
      setStats({
        total: empData.length,
        conCargo: empData.filter(e => e.cargo).length,
        conEspecialidad: empData.filter(e => e.especialidad).length
      })
    }
    setLoading(false)
  }

  const eliminarEmpleado = async (id: number) => {
    if (!confirm('¿Eliminar este empleado?')) return
    await supabase.from('empleados').delete().eq('id', id)
    cargarEmpleados()
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
          CARGANDO EMPLEADOS...
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-screen-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="glitch font-display font-bold text-4xl"
              data-text="Empleados"
              style={{ color: 'var(--text-primary)' }}>
            Empleados
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            GESTIÓN DE EQUIPO · {stats.total} REGISTROS
          </p>
        </div>
        <Link href="/empleados/nuevo" className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Nuevo Empleado
        </Link>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="kpi-card"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="kpi-label">Total Empleados</p>
            <div style={{
              width: 32, height: 32,
              background: 'var(--red-ghost)',
              border: '1px solid var(--border-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Users size={15} style={{ color: 'var(--red-core)' }} />
            </div>
          </div>
          <p className="kpi-value count-animate">{stats.total}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Registros activos
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="kpi-card"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="kpi-label">Con Cargo</p>
            <div style={{
              width: 32, height: 32,
              background: 'var(--red-ghost)',
              border: '1px solid var(--border-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Briefcase size={15} style={{ color: 'var(--red-core)' }} />
            </div>
          </div>
          <p className="kpi-value count-animate">{stats.conCargo}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {stats.total ? Math.round((stats.conCargo / stats.total) * 100) : 0}% del total
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="kpi-card"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="kpi-label">Con Especialidad</p>
            <div style={{
              width: 32, height: 32,
              background: 'var(--red-ghost)',
              border: '1px solid var(--border-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Briefcase size={15} style={{ color: 'var(--red-core)' }} />
            </div>
          </div>
          <p className="kpi-value count-animate">{stats.conEspecialidad}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Especialistas registrados
          </p>
        </motion.div>
      </div>

      {/* Listado */}
      {empleados.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-12 text-center"
        >
          <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            NO HAY EMPLEADOS REGISTRADOS
          </p>
          <Link href="/empleados/nuevo" className="btn-primary mt-4 inline-flex">
            <Plus size={14} /> Agregar el primero
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {empleados.map((emp, i) => (
              <motion.div
                key={emp.id}
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
                        {emp.nombre}
                      </h2>
                      {emp.cargo && (
                        <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>
                          {emp.cargo}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {emp.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {emp.telefono}
                          </span>
                        </div>
                      )}
                      {emp.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {emp.email}
                          </span>
                        </div>
                      )}
                      {emp.especialidad && (
                        <div className="flex items-center gap-2 sm:col-span-2">
                          <Briefcase size={12} style={{ color: 'var(--red-core)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red-core)' }}>
                            {emp.especialidad}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/empleados/editar/${emp.id}`}
                      className="btn-ghost text-sm py-1.5 px-3"
                    >
                      <Edit size={14} /> Editar
                    </Link>
                    <button
                      onClick={() => eliminarEmpleado(emp.id)}
                      className="btn-danger text-sm py-1.5 px-3"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}