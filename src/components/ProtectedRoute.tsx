import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Role = 'gerente' | 'empleado' | 'almacenista';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: Role[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    // si el rol no está permitido, redirigir al inicio o a una página de no autorizado
    return <div className="p-6">No autorizado para ver esta página.</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
