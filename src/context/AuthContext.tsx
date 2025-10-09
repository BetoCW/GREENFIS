import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  name: string;
  email: string;
  role: 'gerente' | 'empleado' | 'almacenista';
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (employeeEmail: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // hydrate from localStorage
    const raw = localStorage.getItem('gf_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as User;
        setUser(parsed);
      } catch {
        localStorage.removeItem('gf_user');
      }
    }
    setLoading(false);
  }, []);

  const detectRoleFromEmail = (email: string): User['role'] => {
    const lowered = email.toLowerCase();
    if (lowered.includes('almacen') || lowered.includes('warehouse')) return 'almacenista';
    if (lowered.includes('admin') || lowered.includes('gerente')) return 'gerente';
    // por defecto, se considera empleado
    return 'empleado';
  };

  const login = async (email: string, password: string) => {
    // Simulación de autenticación. Reemplaza por llamada real a tu API.
    setLoading(true);
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // para desarrollo aceptamos cualquier email con contraseña 'password'
        if (password === 'password') {
          const role = detectRoleFromEmail(email);
          const nameMap: Record<User['role'], string> = {
            gerente: 'Gerente',
            empleado: 'Empleado',
            almacenista: 'Almacén'
          };
          const u: User = { name: nameMap[role], email, role };
          setUser(u);
          localStorage.setItem('gf_user', JSON.stringify(u));
          setLoading(false);
          resolve();
        } else {
          setLoading(false);
          reject(new Error('Credenciales inválidas'));
        }
      }, 700);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gf_user');
  };

  const requestPasswordReset = async (employeeEmail: string, newPassword: string) => {
    // Simula que el gerente asigna una nueva contraseña para un empleado.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        try {
          const key = 'gf_password_resets';
          const raw = localStorage.getItem(key);
          const arr = raw ? JSON.parse(raw) : [];
          const entry = {
            id: Date.now(),
            employeeEmail,
            newPassword,
            requestedBy: user?.email ?? 'gerente-desconocido',
            date: new Date().toISOString(),
            status: 'assigned'
          };
          arr.push(entry);
          localStorage.setItem(key, JSON.stringify(arr));
        } catch {
          // no-op
        }
        resolve();
      }, 600);
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, requestPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
