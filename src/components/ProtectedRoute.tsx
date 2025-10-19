import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Props = {
  children: React.ReactNode;
  roles?: Array<'gerente' | 'almacenista' | 'vendedor' | 'unknown'>;
};

const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && roles.length > 0 && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
