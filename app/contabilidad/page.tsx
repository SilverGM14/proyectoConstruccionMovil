'use client'

import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Building2,
  Search, X, Download, Filter, User, FolderOpen, FileText, Tag
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import * as XLSX from 'xlsx'

// Tipo completo para una transacción enriquecida
type TransaccionEnriquecida = {
  id: number
  obraid: number | null
  fecha: string
  concepto: string
  monto: number
  tipo: string
  origen: string | null
  origen_id: number | null
  categoria: string | null
  proveedor: string | null
  obras: { nombre: string } | null
  presupuestos: { concepto: string } | null
  empleados: { nombre: string } | null   // Solo si viene de un pago
}

export default function ContabilidadPage() {
  const [transacciones, setTransacciones] = useState<TransaccionEnriquecida[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroObra, setFiltroObra] = useState<string>('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [obras, setObras] = useState<{ id: number; nombre: string }[]>([])
  const [stats, setStats] = useState({ ingresos: 0, gastos: 0, balance: 0 })
  const [evolucionData, setEvolucionData] = useState<any[]>([])
  const [categoriaData, setCategoriaData] = useState<any[]>([])

  const PIE_COLORS = ['#FF1A1A', '#00C47A', '#3B82F6', '#F59E0B', '#8B5CF6', '#6B7280']

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    
    // Consulta enriquecida: traemos obras, presupuestos y empleados (cuando origen es 'Pago')
    const { data, error } = await supabase
      .from('transacciones')
      .select(`
        *,
        obras ( nombre ),
        presupuestos ( concepto )
      `)
      .order('fecha', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    let transData = data as any[]

    // Para las transacciones que vienen de Pagos, obtenemos el nombre del empleado
    const pagosIds = transData
      .filter(t => t.origen === 'Pago' && t.origen_id)
      .map(t => t.origen_id)
    
    if (pagosIds.length > 0) {
      const { data: pagosData } = await supabase
        .from('pagos')
        .select('id, empleados(nombre)')
        .in('id', pagosIds)
      
      if (pagosData) {
        const empleadoMap = new Map(pagosData.map((p: any) => [p.id, p.empleados?.nombre]))
        transData = transData.map(t => {
          if (t.origen === 'Pago' && t.origen_id) {
            return { ...t, empleados: { nombre: empleadoMap.get(t.origen_id) || null } }
          }
          return t
        })
      }
    }

    setTransacciones(transData as TransaccionEnriquecida[])
    
    // Calcular estadísticas
    const ingresos = transData.filter(t => t.tipo === 'Ingreso').reduce((s, t) => s + t.monto, 0)
    const gastos = transData.filter(t => t.tipo === 'Gasto').reduce((s, t) => s + t.monto, 0)
    setStats({ ingresos, gastos, balance: ingresos - gastos })

    // Evolución mensual
    const ahora = new Date()
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
      return { key: d.toISOString().slice(0, 7), label: d.toLocaleString('es', { month: 'short' }).toUpperCase() }
    })
    const evolucion = meses.map(m => {
      const ingresosMes = transData.filter(t => t.tipo === 'Ingreso' && t.fecha?.startsWith(m.key)).reduce((s, t) => s + t.monto, 0)
      const gastosMes = transData.filter(t => t.tipo === 'Gasto' && t.fecha?.startsWith(m.key)).reduce((s, t) => s + t.monto, 0)
      return { mes: m.label, ingresos: ingresosMes, gastos: gastosMes }
    })
    setEvolucionData(evolucion)

    // Gastos por categoría
    const gastosPorCat: Record<string, number> = {}
    transData.filter(t => t.tipo === 'Gasto').forEach(t => {
      const cat = t.categoria || 'Sin categoría'
      gastosPorCat[cat] = (gastosPorCat[cat] || 0) + t.monto
    })
    setCategoriaData(Object.entries(gastosPorCat).map(([name, value]) => ({ name, value })))

    // Obras para filtro
    const { data: obrasData } = await supabase.from('obras').select('id, nombre')
    if (obrasData) setObras(obrasData)

    setLoading(false)
  }

  const transaccionesFiltradas = transacciones.filter(t => {
    const matchTipo = !filtroTipo || t.tipo === filtroTipo
    const matchObra = !filtroObra || t.obraid?.toString() === filtroObra
    const matchFechaDesde = !filtroFechaDesde || t.fecha >= filtroFechaDesde
    const matchFechaHasta = !filtroFechaHasta || t.fecha <= filtroFechaHasta
    const matchSearch = !searchTerm ||
      t.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.obras?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.empleados?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.proveedor?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchTipo && matchObra && matchFechaDesde && matchFechaHasta && matchSearch
  })

  const exportarExcel = () => {
    const datos = transaccionesFiltradas.map(t => ({
      Fecha: t.fecha,
      Tipo: t.tipo,
      Concepto: t.concepto,
      Obra: t.obras?.nombre || '',
      'Partida Presupuesto': t.presupuestos?.concepto || '',
      Empleado_Proveedor: t.empleados?.nombre || t.proveedor || '',
      Categoría: t.categoria || '',
      Monto: t.monto,
      Origen: t.origen || 'Manual'
    }))
    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones')
    XLSX.writeFile(wb, `contabilidad_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--red-core)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>CARGANDO LIBRO MAYOR...</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="glitch font-display font-bold text-4xl" data-text="Contabilidad" style={{ color: 'var(--text-primary)' }}>Contabilidad</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            LIBRO MAYOR AUTOMÁTICO · {transacciones.length} MOVIMIENTOS
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarDatos} className="btn-ghost flex items-center gap-2"><Download size={14} /> Actualizar</button>
          <button onClick={exportarExcel} className="btn-primary flex items-center gap-2"><Download size={14} /> Exportar Excel</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
          <div className="flex items-start justify-between mb-3"><p className="kpi-label">Ingresos Totales</p><div style={{ width: 32, height: 32, background: 'rgba(0,196,122,0.1)', border: '1px solid #00C47A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={15} color="#00C47A" /></div></div>
          <p className="kpi-value">RD$ {stats.ingresos.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
          <div className="flex items-start justify-between mb-3"><p className="kpi-label">Gastos Totales</p><div style={{ width: 32, height: 32, background: 'var(--red-ghost)', border: '1px solid var(--red-core)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingDown size={15} color="var(--red-core)" /></div></div>
          <p className="kpi-value">RD$ {stats.gastos.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
          <div className="flex items-start justify-between mb-3"><p className="kpi-label">Balance Neto</p><div style={{ width: 32, height: 32, background: stats.balance >= 0 ? 'rgba(0,196,122,0.1)' : 'var(--red-ghost)', border: `1px solid ${stats.balance >= 0 ? '#00C47A' : 'var(--red-core)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={15} color={stats.balance >= 0 ? '#00C47A' : 'var(--red-core)'} /></div></div>
          <p className="kpi-value" style={{ color: stats.balance >= 0 ? '#00C47A' : 'var(--red-core)' }}>RD$ {stats.balance.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
          <div className="section-heading"><span className="section-heading-text">EVOLUCIÓN MENSUAL</span><div className="section-heading-line" /></div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={evolucionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tickFormatter={v => `${v/1000}k`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--red-core)' }} />
              <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#00C47A" fill="rgba(0,196,122,0.1)" />
              <Area type="monotone" dataKey="gastos" name="Gastos" stroke="var(--red-core)" fill="rgba(255,26,26,0.1)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
          <div className="section-heading"><span className="section-heading-text">GASTOS POR CATEGORÍA</span><div className="section-heading-line" /></div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoriaData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                {categoriaData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar concepto, obra, empleado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-cyber pl-9 text-sm" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input-cyber w-32 text-sm">
          <option value="">Todos</option>
          <option value="Ingreso">Ingresos</option>
          <option value="Gasto">Gastos</option>
        </select>
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)} className="input-cyber w-40 text-sm">
          <option value="">Todas las obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} className="input-cyber w-36 text-sm" />
        <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} className="input-cyber w-36 text-sm" />
        {(searchTerm || filtroTipo || filtroObra || filtroFechaDesde || filtroFechaHasta) && (
          <button onClick={() => { setSearchTerm(''); setFiltroTipo(''); setFiltroObra(''); setFiltroFechaDesde(''); setFiltroFechaHasta('') }} className="btn-ghost text-sm"><X size={14} /> Limpiar</button>
        )}
      </div>

      {/* Tabla detallada */}
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Encabezados */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-mono text-muted border-b border-border bg-elevated">
            <div className="col-span-1">FECHA</div>
            <div className="col-span-2">CONCEPTO</div>
            <div className="col-span-2">OBRA</div>
            <div className="col-span-1">PARTIDA</div>
            <div className="col-span-2">EMPLEADO / PROVEEDOR</div>
            <div className="col-span-1">CATEGORÍA</div>
            <div className="col-span-1">TIPO</div>
            <div className="col-span-1 text-right">MONTO</div>
            <div className="col-span-1">ORIGEN</div>
          </div>

          {/* Filas */}
          {transaccionesFiltradas.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-12 gap-2 items-center p-3 card text-sm hover:bg-red-ghost transition-colors"
            >
              <div className="col-span-1 font-mono text-muted text-xs">{new Date(t.fecha).toLocaleDateString()}</div>
              <div className="col-span-2 font-medium truncate" title={t.concepto}>{t.concepto}</div>
              <div className="col-span-2 text-muted truncate" title={t.obras?.nombre || ''}>
                {t.obras?.nombre ? (
                  <span className="flex items-center gap-1"><Building2 size={12} />{t.obras.nombre}</span>
                ) : '—'}
              </div>
              <div className="col-span-1 text-muted truncate" title={t.presupuestos?.concepto || ''}>
                {t.presupuestos?.concepto ? (
                  <span className="flex items-center gap-1"><FolderOpen size={12} />{t.presupuestos.concepto}</span>
                ) : '—'}
              </div>
              <div className="col-span-2 text-muted truncate" title={t.empleados?.nombre || t.proveedor || ''}>
                {t.empleados?.nombre ? (
                  <span className="flex items-center gap-1"><User size={12} />{t.empleados.nombre}</span>
                ) : t.proveedor ? (
                  <span className="flex items-center gap-1"><User size={12} />{t.proveedor}</span>
                ) : '—'}
              </div>
              <div className="col-span-1">
                {t.categoria ? (
                  <span className="badge badge-info text-xs">{t.categoria}</span>
                ) : '—'}
              </div>
              <div className="col-span-1">
                <span className={`badge ${t.tipo === 'Ingreso' ? 'badge-active' : 'badge-danger'}`} style={{ fontSize: '0.6rem' }}>
                  {t.tipo}
                </span>
              </div>
              <div className={`col-span-1 text-right font-mono font-bold ${t.tipo === 'Ingreso' ? 'text-green-500' : ''}`} style={{ color: t.tipo === 'Ingreso' ? '#00C47A' : 'var(--red-core)' }}>
                {t.tipo === 'Ingreso' ? '+' : '-'} RD$ {t.monto.toLocaleString()}
              </div>
              <div className="col-span-1 text-xs text-muted">
                {t.origen === 'Pago' ? '🤖 Pago nómina' : t.origen || 'Manual'}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {transaccionesFiltradas.length === 0 && (
        <div className="card p-12 text-center text-muted">No hay transacciones que coincidan con los filtros.</div>
      )}
    </motion.div>
  )
}