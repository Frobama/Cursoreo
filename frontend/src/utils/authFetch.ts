/**
 * Utilidad para hacer fetch con autenticación JWT
 * Agrega automáticamente el token del localStorage al header Authorization
 */

interface AuthFetchOptions extends RequestInit {
    headers?: HeadersInit;
}

export const authFetch = async (url: string, options: AuthFetchOptions = {}): Promise<Response> => {
    const token = localStorage.getItem('authToken');
    
    const headers = new Headers(options.headers || {});
    
    // Agregar el token JWT si existe
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Agregar Content-Type por defecto si no está presente
    if (!headers.has('Content-Type') && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Si el token expiró o es inválido (401 o 403), limpiar el localStorage y emitir evento
    if (response.status === 401 || response.status === 403) {
        console.warn('⚠️ Token expirado o inválido, cerrando sesión...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Emitir evento personalizado para que App.tsx pueda escucharlo
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
    }
    
    return response;
};

/**
 * Helper para hacer GET autenticado
 */
export const authGet = async (url: string): Promise<Response> => {
    return authFetch(url, { method: 'GET' });
};

/**
 * Helper para hacer POST autenticado
 */
export const authPost = async (url: string, body: any): Promise<Response> => {
    return authFetch(url, {
        method: 'POST',
        body: JSON.stringify(body)
    });
};

/**
 * Helper para hacer PUT autenticado
 */
export const authPut = async (url: string, body: any): Promise<Response> => {
    return authFetch(url, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
};

/**
 * Helper para hacer DELETE autenticado
 */
export const authDelete = async (url: string): Promise<Response> => {
    return authFetch(url, { method: 'DELETE' });
};
