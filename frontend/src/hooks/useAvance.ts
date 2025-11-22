// src/hooks/useAvance.ts
import { useState, useEffect } from 'react';
import { avanceService } from '../services/avance.service';
import { useAuth } from './useAuth';
import { type RamoAvanceCompleto } from '../types';
import { getAvanceCurricular } from '../utils/localStorageManager';


interface UseAvanceParams {
  rut: string;
  codigoCarrera: string;
  catalogo: string;
}

export const useAvance = ({ rut, codigoCarrera, catalogo }: UseAvanceParams) => {
  const [ramosAprobados, setRamosAprobados] = useState<RamoAvanceCompleto[]>([]);
  const [ramosInscritos, setRamosInscritos] = useState<RamoAvanceCompleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvance = async () => {
      if (!rut || !codigoCarrera || !catalogo) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Llamar al endpoint correcto con los parámetros correctos
        const data = await avanceService.getAvance(rut, codigoCarrera, catalogo);
        
        // Separar por estado
        const aprobados = data.filter(r => r.status === 'APROBADO');
        const inscritos = data.filter(r => r.status === 'INSCRITO');
        
        setRamosAprobados(aprobados);
        setRamosInscritos(inscritos);
      } catch (err: any) {
        console.error('Error en useAvance:', err);
        setError(err.message || 'Error cargando avance curricular');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvance();
  }, [rut, codigoCarrera, catalogo]);

  return { 
    ramosAprobados, 
    ramosInscritos, 
    isLoading, 
    error,
    totalAprobados: ramosAprobados.length,
    totalInscritos: ramosInscritos.length
  };
};