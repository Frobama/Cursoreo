// src/context/AppContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { type RamoMalla, type RamoAvanceCompleto } from '../types';

interface Carrera {
  codigo: string;
  nombre: string;
  catalogo: string;
}

interface AppContextType {
  carreraActiva: Carrera | null;
  setCarreraActiva: (carrera: Carrera | null) => void;
  
  mallaCompleta: RamoMalla[];
  setMallaCompleta: (malla: RamoMalla[]) => void;
  
  ramosAprobados: RamoAvanceCompleto[];
  setRamosAprobados: (ramos: RamoAvanceCompleto[]) => void;
  ramosInscritos: RamoAvanceCompleto[];
  setRamosInscritos: (ramos: RamoAvanceCompleto[]) => void;
  
  proyeccionActual: any | null;
  setProyeccionActual: (proyeccion: any | null) => void;
  
  clearAppData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  const [carreraActiva, setCarreraActivaState] = useState<Carrera | null>(() => {
    const stored = localStorage.getItem('carreraActiva');
    return stored ? JSON.parse(stored) : null;
  });

  const [mallaCompleta, setMallaCompleta] = useState<RamoMalla[]>([]);
  
  const [ramosAprobados, setRamosAprobados] = useState<RamoAvanceCompleto[]>([]);
  const [ramosInscritos, setRamosInscritos] = useState<RamoAvanceCompleto[]>([]);
  
  const [proyeccionActual, setProyeccionActual] = useState<any | null>(null);

  useEffect(() => {
    if (carreraActiva) {
      localStorage.setItem('carreraActiva', JSON.stringify(carreraActiva));
    } else {
      localStorage.removeItem('carreraActiva');
    }
  }, [carreraActiva]);

  const setCarreraActiva = (carrera: Carrera | null) => {
    setCarreraActivaState(carrera);
    
    if (carrera?.codigo !== carreraActiva?.codigo) {
      setMallaCompleta([]);
      setRamosAprobados([]);
      setRamosInscritos([]);
      setProyeccionActual(null);
    }
  };

  const clearAppData = () => {
    setCarreraActivaState(null);
    setMallaCompleta([]);
    setRamosAprobados([]);
    setRamosInscritos([]);
    setProyeccionActual(null);
    localStorage.removeItem('carreraActiva');
  };

  const value: AppContextType = {
    carreraActiva,
    setCarreraActiva,
    mallaCompleta,
    setMallaCompleta,
    ramosAprobados,
    setRamosAprobados,
    ramosInscritos,
    setRamosInscritos,
    proyeccionActual,
    setProyeccionActual,
    clearAppData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
};