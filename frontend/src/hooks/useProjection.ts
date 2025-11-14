import { useState, useCallback } from 'react';
import { fetchProjection } from '../api/projection';

export function useProjection() {
    const [data, setData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (rut: string, cod: string, cat: string) => {
        setIsLoading(true); 
        setError(null);
        try {
            const json = await fetchProjection(rut, cod, cat);
            setData(json);
            return json;
        } catch (err: any) {
            setError(err.message || 'Error cargando proyeccion');
            setData(null);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { data, isLoading, error, load};
}