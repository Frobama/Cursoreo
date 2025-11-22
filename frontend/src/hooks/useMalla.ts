// src/hooks/useMalla.ts
import { useState, useEffect } from 'react';
import { mallaService } from '../services/malla.service';
import { type RamoMalla } from '../types';

interface UseMallaParams {
  codigoCarrera: string;
  catalogo: string;
}

export const useMalla = ({ codigoCarrera, catalogo }: UseMallaParams) => {
  const [malla, setMalla] = useState<RamoMalla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMalla = async () => {
      if (!codigoCarrera || !catalogo) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Llamar al endpoint correcto
        const data = await mallaService.getMallas(codigoCarrera, catalogo);
        setMalla(data);
      } catch (err: any) {
        console.error('Error en useMalla:', err);
        setError(err.message || 'Error cargando malla curricular');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMalla();
  }, [codigoCarrera, catalogo]);

  return { 
    malla, 
    isLoading, 
    error,
    totalRamos: malla.length,
    totalCreditos: malla.reduce((sum, ramo) => sum + ramo.creditos, 0)
  };
};