'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

type Profile = {
  rol: 'admin' | 'usuario';
  nombre?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nombre: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({} as any);

// Lista blanca de correos permitidos para registro
const ALLOWED_EMAILS = [
  'silveriogome@gmail.com',     // ← CAMBIA ESTOS DOS
  'antonygm10@gmail.com'
];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar perfil cuando el usuario cambia
  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('rol, nombre')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data as Profile);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await loadProfile(currentUser.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    // Verificar si el correo está en la lista blanca
    if (!ALLOWED_EMAILS.includes(email)) {
      throw new Error('Este correo no está autorizado para registrarse.');
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.rol === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      isAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);