'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'
import { Save, X, User, Briefcase, Phone, Mail, Award } from 'lucide-react'

export default function EditarEmpleado({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    cargo: '',
    telefono: '',
    email: '',
    especialidad: ''
  })

  useEffect(() => {
    const fetchEmpleado = async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        alert('Error al cargar')
        router.push('/empleados')
      } else if (data) {
        setForm({
          nombre: data.nombre || '',
          cargo: data.cargo || '',
          telefono: data.telefono || '',
          email: data.email || '',
          especialidad: data.especialidad || ''
        })
      }
    }
    fetchEmpleado()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase
      .from('empleados')
      .update({
        nombre: form.nombre,
        cargo: form.cargo || null,
        telefono: form.telefono || null,
        email: form.email || null,
        especialidad: form.especialidad || null
      })
      .eq('id', id)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/empleados')
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="card p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold glitch" data-text="Editar Empleado"
              style={{ color: 'var(--text-primary)' }}>
            Editar Empleado
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ID: {id} · ACTUALIZAR INFORMACIÓN
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label className="input-label">
              <User size={12} className="inline mr-1" /> NOMBRE *
            </label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              className="input-cyber"
              placeholder="ej. Juan Pérez"
            />
          </div>

          {/* Cargo */}
          <div>
            <label className="input-label">
              <Briefcase size={12} className="inline mr-1" /> CARGO
            </label>
            <input
              name="cargo"
              value={form.cargo}
              onChange={handleChange}
              className="input-cyber"
              placeholder="ej. Maestro Constructor"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="input-label">
              <Phone size={12} className="inline mr-1" /> TELÉFONO
            </label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className="input-cyber"
              placeholder="ej. 809-555-1234"
            />
          </div>

          {/* Email */}
          <div>
            <label className="input-label">
              <Mail size={12} className="inline mr-1" /> EMAIL
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="input-cyber"
              placeholder="ej. correo@ejemplo.com"
            />
          </div>

          {/* Especialidad */}
          <div>
            <label className="input-label">
              <Award size={12} className="inline mr-1" /> ESPECIALIDAD
            </label>
            <input
              name="especialidad"
              value={form.especialidad}
              onChange={handleChange}
              className="input-cyber"
              placeholder="ej. Electricidad, Carpintería..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {loading ? 'Guardando...' : 'Actualizar Empleado'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/empleados')}
              className="btn-ghost flex items-center gap-2"
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}