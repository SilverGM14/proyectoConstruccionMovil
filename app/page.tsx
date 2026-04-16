'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion } from 'framer-motion'
import {
  Building2, Users, DollarSign, TrendingUp,
  CheckCircle, Clock, AlertTriangle, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Target, BarChart2, WifiOff
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ReferenceLine
} from 'recharts'
import ProtectedRoute from '@/lib/ProtectedRoute'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// ── Tipos ─────────────────────────────────────────────────────────────
type Stats = {
  totalObras: number
  obrasActivas: number
  totalEmpleados: number
  totalPagado: number
  totalPresupuesto: number
  totalGastado: number
  progresoPromedio: number
  pagosPendientes: number
}

// ── Tooltip personalizado ─────────────────────────────────────────────
const CyberTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--red-core)',
      padding: '0.75rem 1rem',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem',
      boxShadow: 'var(--shadow-red)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: 'var(--red-core)', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000
            ? `RD$ ${p.value.toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Componente KPI ─────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, trend, delay = 0, alert = false
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; trend?: 'up' | 'down' | null; delay?: number; alert?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className={`kpi-card ${alert ? 'card-alert' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="kpi-label">{label}</p>
        <div style={{
          width: 32, height: 32,
          background: 'var(--red-ghost)',
          border: '1px solid var(--border-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon size={15} style={{ color: 'var(--red-core)' }}/>
        </div>
      </div>
      <p className="kpi-value count-animate">{value}</p>
      {sub && (
        <div className="flex items-center gap-1.5 mt-2">
          {trend === 'up'   && <ArrowUpRight   size={12} style={{ color: '#00C47A' }}/>}
          {trend === 'down' && <ArrowDownRight size={12} style={{ color: 'var(--red-core)' }}/>}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {sub}
          </span>
        </div>
      )}
    </motion.div>
  )
}

// ── Componente SectionHeader ───────────────────────────────────────────
function SectionHeader({ children }: { children: string }) {
  return (
    <div className="section-heading">
      <span className="section-heading-text">{children}</span>
      <div className="section-heading-line"/>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const isOnline = useNetworkStatus()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalObras: 0, obrasActivas: 0, totalEmpleados: 0,
    totalPagado: 0, totalPresupuesto: 0, totalGastado: 0,
    progresoPromedio: 0, pagosPendientes: 0
  })
  const [presupuestoPorObra, setPresupuestoPorObra] = useState<any[]>([])
  const [estadosPie, setEstadosPie]                 = useState<any[]>([])
  const [evolucionMensual, setEvolucionMensual]     = useState<any[]>([])
  const [progresoObras, setProgresoObras]           = useState<any[]>([])
  const [radarData, setRadarData]                   = useState<any[]>([])
  const [pagosRecientes, setPagosRecientes]         = useState<any[]>([])
  const [obrasRiesgo, setObrasRiesgo]               = useState<any[]>([])

  // Colores del sistema
  const RED       = '#FF1A1A'
  const RED_DIM   = '#CC1111'
  const PIE_COLORS = ['#FF1A1A', '#CC1111', '#991111', '#661111', '#440A0A']

  useEffect(() => { 
    if (isOnline) {
      cargarDatos()
    } else {
      // Podríamos cargar desde caché local, pero por ahora solo mostramos loading false
      setLoading(false)
    }
  }, [isOnline])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Obras
      const { data: obras } = await supabase.from('obras').select('*')
      const obrasList = (obras ?? []) as any[]

      // Empleados
      const { count: empCount } = await supabase
        .from('empleados').select('*', { count: 'exact', head: true })

      // Pagos
      const { data: pagos } = await supabase.from('pagos')
        .select('*, empleados(nombre), obras(nombre)')
        .order('fecha', { ascending: false })
      const pagosList = (pagos ?? []) as any[]

      // Presupuestos
      const { data: presupuestos } = await supabase
        .from('presupuestos').select('*, obras(nombre)')
      const presList = (presupuestos ?? []) as any[]

      // ── Stats ──────────────────────────────────────────────────────
      const totalObras       = obrasList.length
      const obrasActivas     = obrasList.filter(o => o.estado !== 'Finalizado').length
      const totalEmpleados   = empCount ?? 0
      const totalPagado      = pagosList.filter(p => p.estado === 'Pagado').reduce((s, p) => s + p.monto, 0)
      const pagosPendientes  = pagosList.filter(p => p.estado === 'Pendiente').reduce((s, p) => s + p.monto, 0)
      const totalPresupuesto = presList.reduce((s, p) => s + p.montoasignado, 0)
      const totalGastado     = presList.reduce((s, p) => s + p.montogastado, 0)
      const progresoPromedio = totalObras
        ? obrasList.reduce((s, o) => s + (o.progreso ?? 0), 0) / totalObras : 0

      setStats({ totalObras, obrasActivas, totalEmpleados, totalPagado,
                 totalPresupuesto, totalGastado, progresoPromedio, pagosPendientes })

      // ── Gráfico 1: Presupuesto por obra (top 6) ────────────────────
      setPresupuestoPorObra(
        obrasList
          .map(o => ({ nombre: o.nombre?.slice(0,14) + (o.nombre?.length > 14 ? '…' : ''), presupuesto: o.presupuestototal ?? 0, progreso: o.progreso ?? 0 }))
          .sort((a, b) => b.presupuesto - a.presupuesto)
          .slice(0, 6)
      )

      // ── Gráfico 2: Pie de estados ──────────────────────────────────
      const estadoMap: Record<string, number> = {}
      obrasList.forEach(o => {
        const e = o.estado ?? 'Sin estado'
        estadoMap[e] = (estadoMap[e] ?? 0) + 1
      })
      setEstadosPie(Object.entries(estadoMap).map(([name, value]) => ({ name, value })))

      // ── Gráfico 3: Evolución pagos 6 meses ────────────────────────
      const ahora  = new Date()
      const meses  = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
        return { key: d.toISOString().slice(0, 7), label: d.toLocaleString('es', { month: 'short' }).toUpperCase() }
      })
      setEvolucionMensual(meses.map(m => ({
        mes: m.label,
        pagados:   pagosList.filter(p => p.fecha?.startsWith(m.key) && p.estado === 'Pagado').reduce((s, p) => s + p.monto, 0),
        pendientes:pagosList.filter(p => p.fecha?.startsWith(m.key) && p.estado === 'Pendiente').reduce((s, p) => s + p.monto, 0),
      })))

      // ── Gráfico 4: Progreso de obras (barras) ─────────────────────
      setProgresoObras(
        obrasList
          .filter(o => o.estado !== 'Finalizado')
          .map(o => ({ nombre: o.nombre?.slice(0,14), progreso: o.progreso ?? 0 }))
          .sort((a, b) => b.progreso - a.progreso)
          .slice(0, 8)
      )

      // ── Gráfico 5: Radar financiero ────────────────────────────────
      const gastoPct = totalPresupuesto ? (totalGastado / totalPresupuesto) * 100 : 0
      const avancePct = progresoPromedio
      const nomPct = totalPresupuesto ? (totalPagado / totalPresupuesto) * 100 : 0
      const activPct = totalObras ? (obrasActivas / totalObras) * 100 : 0
      setRadarData([
        { metric: 'Avance obras',    value: Math.round(avancePct) },
        { metric: 'Presupuesto uso', value: Math.round(gastoPct)  },
        { metric: 'Nómina/budget',   value: Math.round(nomPct)    },
        { metric: 'Obras activas',   value: Math.round(activPct)  },
        { metric: 'Cumplimiento',    value: Math.round((totalObras ? (obrasList.filter(o=>o.estado==='Finalizado').length/totalObras)*100 : 0)) },
      ])

      // ── Pagos recientes ─────────────────────────────────────────────
      setPagosRecientes(pagosList.slice(0, 6))

      // ── Obras en riesgo (progreso < 30 y no planificadas) ──────────
      setObrasRiesgo(
        obrasList.filter(o => (o.progreso ?? 0) < 30 && o.estado === 'En progreso').slice(0, 4)
      )

    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div style={{
        width: 40, height: 40,
        border: '2px solid var(--border)',
        borderTop: '2px solid var(--red-core)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}/>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        CARGANDO DATOS...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const gastoPct = stats.totalPresupuesto ? Math.round((stats.totalGastado / stats.totalPresupuesto) * 100) : 0

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-screen-2xl mx-auto">

        {/* OFFLINE: Badge de estado sin conexión */}
        {!isOnline && (
          <div className="p-3 card-alert flex items-center gap-2 text-sm">
            <WifiOff size={16} /> Modo sin conexión — mostrando datos almacenados localmente
          </div>
        )}

        {/* ── Encabezado ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="live-dot"/>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#00C47A', letterSpacing: '0.1em' }}>
                {isOnline ? 'DATOS EN TIEMPO REAL' : 'MODO OFFLINE'}
              </span>
            </div>
            <h1 className="glitch font-display font-bold"
                data-text="Dashboard"
                style={{ fontSize: '2.25rem', color: 'var(--text-primary)', lineHeight: 1 }}>
              Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
              VISIÓN GENERAL DEL NEGOCIO · GOME v1.1.2
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => cargarDatos()} 
              className="btn-ghost"
              disabled={!isOnline}
            >
              <Activity size={14}/> Actualizar
            </button>
          </div>
        </motion.div>

        {/* ── KPIs (8 tarjetas) ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total obras"       value={stats.totalObras}        icon={Building2}    sub={`${stats.obrasActivas} activas`}                   delay={0.0} trend="up"/>
          <KpiCard label="Obras activas"     value={stats.obrasActivas}      icon={CheckCircle}  sub={`${Math.round(stats.progresoPromedio)}% promedio`}  delay={0.05}/>
          <KpiCard label="Empleados"         value={stats.totalEmpleados}    icon={Users}        sub="Equipo registrado"                                  delay={0.1}/>
          <KpiCard label="Progreso prom."    value={`${Math.round(stats.progresoPromedio)}%`} icon={Target} sub="Todas las obras activas"                delay={0.15}/>
          <KpiCard label="Total pagado"      value={`RD$ ${stats.totalPagado.toLocaleString()}`}       icon={DollarSign} sub="Nómina confirmada"         delay={0.2} trend="up"/>
          <KpiCard label="Pag. pendientes"   value={`RD$ ${stats.pagosPendientes.toLocaleString()}`}   icon={Clock}      sub="Por confirmar"             delay={0.25} alert={stats.pagosPendientes > 0}/>
          <KpiCard label="Presupuesto total" value={`RD$ ${stats.totalPresupuesto.toLocaleString()}`}  icon={TrendingUp} sub={`${gastoPct}% utilizado`}  delay={0.3}/>
          <KpiCard label="Total gastado"     value={`RD$ ${stats.totalGastado.toLocaleString()}`}      icon={BarChart2}  sub="En obras activas"          delay={0.35} trend={gastoPct > 80 ? 'down' : undefined}/>
        </div>

        {/* ── Uso del presupuesto global ─────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Uso global del presupuesto
            </p>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: gastoPct > 80 ? 'var(--red-core)' : '#00C47A', fontWeight: 600 }}>
              {gastoPct}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(gastoPct, 100)}%` }}/>
          </div>
          <div className="flex justify-between mt-1.5">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              RD$ {stats.totalGastado.toLocaleString()} gastado
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              RD$ {stats.totalPresupuesto.toLocaleString()} total
            </span>
          </div>
        </motion.div>

        {/* ── FILA 1: Presupuesto por obra + Evolución mensual ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Barras: Presupuesto */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 }}
                      className="card lg:col-span-3" style={{ padding: '1.5rem' }}>
            <SectionHeader>Presupuesto por obra (RD$)</SectionHeader>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={presupuestoPorObra} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="nombre" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => `${v/1000}k`} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CyberTooltip/>}/>
                <Bar dataKey="presupuesto" name="Presupuesto" fill={RED} radius={[2, 2, 0, 0]}
                    maxBarSize={48}/>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie: Estados */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="card lg:col-span-2" style={{ padding: '1.5rem' }}>
            <SectionHeader>Estado de proyectos</SectionHeader>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={estadosPie} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                  {estadosPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip content={<CyberTooltip/>}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Leyenda */}
            <div className="mt-3 space-y-1.5">
              {estadosPie.map((e, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}/>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{e.name}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{e.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── FILA 2: Evolución mensual + Radar ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Area: evolución pagos */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 }}
                      className="card lg:col-span-3" style={{ padding: '1.5rem' }}>
            <SectionHeader>Evolución de pagos (6 meses)</SectionHeader>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={evolucionMensual} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradPagados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"   stopColor={RED} stopOpacity={0.25}/>
                    <stop offset="95%"  stopColor={RED} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradPendientes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"   stopColor="#F59E0B" stopOpacity={0.20}/>
                    <stop offset="95%"  stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="mes" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => `${v/1000}k`} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CyberTooltip/>}/>
                <Area type="monotone" dataKey="pagados"    name="Pagados"    stroke={RED}       strokeWidth={2} fill="url(#gradPagados)"    dot={{ r: 3, fill: RED }}/>
                <Area type="monotone" dataKey="pendientes" name="Pendientes" stroke="#F59E0B"   strokeWidth={1.5} fill="url(#gradPendientes)" strokeDasharray="4 3" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Radar: salud financiera */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="card lg:col-span-2" style={{ padding: '1.5rem' }}>
            <SectionHeader>Salud del negocio</SectionHeader>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 10, right: 24, bottom: 10, left: 24 }}>
                <PolarGrid stroke="var(--border)"/>
                <PolarAngleAxis dataKey="metric" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}/>
                <Radar name="%" dataKey="value" stroke={RED} fill={RED} fillOpacity={0.18} strokeWidth={1.5}/>
                <Tooltip content={<CyberTooltip/>}/>
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* ── FILA 3: Progreso obras + Pagos recientes ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Barras horizontales: Progreso */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 }}
                      className="card lg:col-span-3" style={{ padding: '1.5rem' }}>
            <SectionHeader>Avance por obra (%)</SectionHeader>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={progresoObras} layout="vertical"
                        margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" horizontal={false}/>
                <XAxis type="number" domain={[0, 100]}
                      tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                      axisLine={false} tickLine={false} tickFormatter={v => `${v}%`}/>
                <YAxis type="category" dataKey="nombre" width={90}
                      tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
                      axisLine={false} tickLine={false}/>
                <Tooltip content={<CyberTooltip/>}/>
                <ReferenceLine x={80} stroke="var(--red-core)" strokeDasharray="3 3" strokeOpacity={0.4}/>
                <Bar dataKey="progreso" name="Progreso" fill={RED} radius={[0, 2, 2, 0]} maxBarSize={18}/>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pagos recientes */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="card lg:col-span-2" style={{ padding: '1.5rem' }}>
            <SectionHeader>Pagos recientes</SectionHeader>
            <div className="space-y-0">
              {pagosRecientes.length === 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  Sin pagos registrados
                </p>
              )}
              {pagosRecientes.map((p, i) => (
                <div key={p.id}
                    className="fade-up"
                    style={{
                      animationDelay: `${i * 0.06}s`,
                      padding: '0.75rem 0',
                      borderBottom: i < pagosRecientes.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.empleados?.nombre ?? '—'}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {p.concepto} · {new Date(p.fecha).toLocaleDateString('es-DO')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--red-core)' }}>
                      RD$ {p.monto?.toLocaleString()}
                    </p>
                    <span className={`badge ${p.estado === 'Pagado' ? 'badge-active' : 'badge-pending'}`} style={{ fontSize: '0.55rem', marginTop: '0.2rem' }}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Obras en riesgo ──────────────────────────────────────────── */}
        {obrasRiesgo.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.75 }}
                      className="card card-alert" style={{ padding: '1.5rem' }}>
            <SectionHeader>⚠ Obras con bajo progreso</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {obrasRiesgo.map((o, i) => (
                <div key={o.id} className="fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--red-ghost)',
                    border: '1px solid rgba(255,26,26,0.2)',
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)'
                  }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      {o.nombre}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      {o.cliente ?? 'Sin cliente'}
                    </p>
                    <div className="progress-track" style={{ height: 3 }}>
                      <div className="progress-fill" style={{ width: `${o.progreso}%` }}/>
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--red-core)', marginTop: '0.3rem', fontWeight: 600 }}>
                      {o.progreso}% completado
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </ProtectedRoute>
  )
}