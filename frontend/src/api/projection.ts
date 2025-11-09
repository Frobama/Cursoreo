export async function fetchProjection(rut: string, codcarrera: string, catalogo: string) {
    const url = `http://localhost:3001/api/proyeccion?rut=${encodeURIComponent(rut)}&codcarrera=${encodeURIComponent(codcarrera)}&catalogo=${encodeURIComponent(catalogo)}`;
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }   
    return res.json();
}