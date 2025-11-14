export async function fetchProjection(rut: string, codcarrera: string, catalogo: string) {
    const url = `http://localhost:3001/api/proyeccion?rut=${encodeURIComponent(rut)}&codcarrera=${encodeURIComponent(codcarrera)}&catalogo=${encodeURIComponent(catalogo)}`;
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }   
    return res.json();
}

export type SaveProjectionPayload<TPlan = any> = {
    rut: string;
    codigoCarrera: string;
    catalogo: string;
    tipo: 'manual' | 'recommended';
    plan: TPlan;
    createdAt?: string;
}

const API_BASE = import.meta.env.REACT_APP_API_BASE || 'http://localhost:3001';

export async function saveProjectionToServer<TPlan = any>(
    payload: SaveProjectionPayload<TPlan>,
    options?: { token?: string }
) {
    const url = `${API_BASE}/api/proyecciones`;
    const body = JSON.stringify({
        ...payload,
        createdAt: payload.createdAt || new Date().toISOString()
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options?.token) headers['Authorization'] = `Bearer ${options.token}`;
console.log('Saving projection payload:', payload);

    const res = await fetch(url, {method: 'POST', headers, body });
    if(!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
}

