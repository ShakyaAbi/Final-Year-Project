import React from 'react';
import { Navigate } from 'react-router-dom';

const tokenKey = 'merlin_token';

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem(tokenKey);
  
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};
