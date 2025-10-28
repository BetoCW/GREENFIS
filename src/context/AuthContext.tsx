import React, { createContext, useContext, useEffect, useState } from 'react';

type Role = 'gerente' | 'almacenista' | 'vendedor' | 'unknown';

type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  sucursal_id?: number;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  requestPasswordReset: (email: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function detectRole(email: string): Role {
  const e = email.toLowerCase();
  if (e.includes('gerente') || e.includes('admin')) return 'gerente';
  if (e.includes('almacen')) return 'almacenista';
  if (e.includes('vendedor') || e.includes('venta')) return 'vendedor';
  return 'unknown';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('gf_user');
      return raw ? JSON.parse(raw) as User : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem('gf_user', JSON.stringify(user));
    else localStorage.removeItem('gf_user');
  }, [user]);

  const login = async (email: string, _password: string) => {
    // Prefer validating against backend users table (SQL Server) when available.
    // This will fetch users and match email+password (simple dev auth, no hashing).
    const BACKEND = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000';
    try {
      const res = await fetch(`${BACKEND}/api/manager/usuarios`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
    const found = list.find((u: any) => String(u.correo).trim().toLowerCase() === String(email).trim().toLowerCase() && String(u.contrasena) === String(_password));
          if (found) {
            const role = (found.rol as Role) || detectRole(email);
            const id = found.id_usuario ?? found.id ?? 0;
            const sucursal_id = found.sucursal_id ?? undefined;
            const newUser: User = { id, name: (found.nombre || email.split('@')[0]), email, role, sucursal_id };
            setUser(newUser);
            return newUser;
          }
        }
      }
    } catch (err) {
      // If backend not available, fall back to email-based role detection below
      console.warn('Auth: could not reach backend users endpoint, falling back to heuristic role detection', err);
    }

    // Fallback behavior: infer role from email (existing heuristic) and accept any password.
    const role = detectRole(email);
    // set default ids that match the seeded DB in GreenFis.sql (for dev convenience)
    let id = 99;
    let sucursal_id = 1;
    if (role === 'gerente') { id = 1; sucursal_id = 1; }
    else if (role === 'vendedor') { id = 2; sucursal_id = 1; }
    else if (role === 'almacenista') { id = 3; sucursal_id = 1; }
    const newUser: User = { id, name: email.split('@')[0], email, role, sucursal_id };
    setUser(newUser);
    return newUser;
  };

  const logout = () => setUser(null);

  const requestPasswordReset = (email: string) => {
    const now = new Date().toISOString();
    const entry = { email, message: 'Solicitud de recuperación de contraseña', createdAt: now };
    try {
      const raw = localStorage.getItem('gf_password_requests');
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(entry);
      localStorage.setItem('gf_password_requests', JSON.stringify(arr));
    } catch (e) {
      console.warn('Could not save password request', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, requestPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
