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
    // MOCK LOGIN (eliminar cuando backend esté listo)
    if (email === 'admin@ucn.cl' && password === 'admin123') {
      const mockProfesor: Profesor = {
        rut: '12345678-9',
        nombre: 'Dr. Juan Pérez',
        email: 'admin@ucn.cl',
        departamento: 'Ingeniería de Sistemas',
        rol: 'PROFESOR'
      };

      const mockToken = 'mock-jwt-token-12345';
      
      localStorage.setItem('admin_token', mockToken);
      localStorage.setItem('admin_user', JSON.stringify(mockProfesor));
      setProfesor(mockProfesor);
      return;
    }

    throw new Error('Credenciales inválidas');

    // Descomentar cuando backend esté listo:
    // const data = await adminService.login(email, password);
    // localStorage.setItem('admin_token', data.token);
    // localStorage.setItem('admin_user', JSON.stringify(data.profesor));
    // setProfesor(data.profesor);
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