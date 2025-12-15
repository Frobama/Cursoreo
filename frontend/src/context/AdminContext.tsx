import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profesor } from '../types/admin';
import { adminService } from '../services/admin.service';

interface AdminContextType {
  profesor: Profesor | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profesor, setProfesor] = useState<Profesor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const storedProfesor = localStorage.getItem('admin_user');

    if (token && storedProfesor) {
      setProfesor(JSON.parse(storedProfesor));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await adminService.login(email, password);
      if (!data || !data.token) throw new Error('Respuesta inválida del servidor');
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.profesor));
      setProfesor(data.profesor as Profesor);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setProfesor(null);
  };

  return (
    <AdminContext.Provider value={{ profesor, login, logout, isLoading }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};