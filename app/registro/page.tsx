'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function RegistroPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    // En el catch del handleSubmit
    try {
      await signUp(email, password, nombre);
      router.push('/login');
    } catch (err: any) {
      if (err.message.includes('no está autorizado')) {
        setError('Este correo no está en la lista de acceso permitido.');
      } else {
        setError(err.message || 'Error al registrar el operador');
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 relative">
        <div className="flex flex-col items-center mb-8">
          <div style={{
            width: 48, height: 48,
            background: 'var(--red-core)',
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Zap size={24} color="#fff" strokeWidth={2.5}/>
          </div>
          <h1 className="glitch font-display font-bold text-3xl" data-text="NUEVO_OPERADOR">
            NUEVO_OPERADOR
          </h1>
        </div>
        
        {error && (
          <div className="card-alert text-accent text-sm font-mono p-3 mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Nombre Completo</label>
            <input type="text" required className="input-cyber" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input type="email" required className="input-cyber" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Contraseña</label>
            <input type="password" required className="input-cyber" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-6" style={{ padding: '0.8rem' }}>
            {loading ? 'REGISTRANDO...' : 'CREAR CUENTA'}
          </button>
        </form>

        <p className="font-mono text-xs text-muted text-center mt-6">
          ¿Ya tienes cuenta? <Link href="/login" className="text-accent hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}