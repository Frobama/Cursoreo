import { useState, useEffect } from 'react';
import { projectionService } from '../services/projection.service';

interface UseProjectionProps {
  rut: string;
  codigoCarrera: string;
  catalogo: string;
  enabled?: boolean;
}

export function useProjections({rut, codigoCarrera, catalogo, enabled = true} : UseProjectionProps) {
  const [projections, setProjections] = useState([]);
  const [favorite, setFavorite] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !rut) return;
    setIsLoading(true);

    Promise.all([
      projectionService.getProyecciones(rut, codigoCarrera, catalogo),
      projectionService.getFavoriteProjection(rut, codigoCarrera, catalogo)
    ])
      .then(([all, fav]) => {
        setProjections(all || []);
        setFavorite(fav?.ok ? fav.proyeccion : null);
      })
      .catch((err) => setError(err.message || 'Error al cargar proyecciones'))
      .finally(() => setIsLoading(false));
  }, [rut, codigoCarrera, catalogo, enabled]);

  return { projections, favorite, isLoading, error };
}