import React, { useEffect, useState } from 'react';
import type { PlanSemester } from '../utils/planner';

type Proyeccion = {
  id_proyeccion: number;
  nombre_proyeccion: string;
  fecha_creacion: string;
  favorita?: boolean;
  ItemProyeccion?: Array<{ Asignatura?: { codigo_asignatura: string; nombre_asignatura: string } }>
}

const MisProyecciones: React.FC = () => {
  const [proyecciones, setProyecciones] = useState<Proyeccion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rut = (() => {
    try { const u = JSON.parse(localStorage.getItem('user') || 'null'); return u?.rut; } catch { return null; }
  })();

  const fetchProyecciones = async () => {
    if (!rut) return setError('Usuario no identificado');
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/proyecciones?rut=${rut}`);
      if (!res.ok) throw new Error('No se pudo obtener proyecciones');
      const data = await res.json();
      setProyecciones(data);
    } catch (err: any) {
      setError(err.message ?? 'Error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProyecciones(); }, []);

  const [favLoading, setFavLoading] = useState<number | null>(null);

  const toggleFavorite = async (id: number) => {
    if (!proyecciones) return;
    const current = proyecciones.find(p => p.id_proyeccion === id);
    if (!current) return;

    const setFavorita = !current.favorita;
    setFavLoading(id);

    try {
      const res = await fetch(`http://localhost:3001/api/proyeccion/${id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorita: setFavorita })
      });

      if (!res.ok) throw new Error('No se pudo marcar favorita');

      // Actualización optimista/rápida: si se marcó favorita, desmarcar las demás
      setProyecciones(prev => prev ? prev.map(p => ({
        ...p,
        favorita: setFavorita ? p.id_proyeccion === id : false
      })) : prev);

    } catch (err: any) {
      console.error(err);
      setError('Error marcando favorita');
    } finally {
      setFavLoading(null);
    }
  };

  if (loading) return <div>Cargando proyecciones...</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;
  if (!proyecciones) return <div>No hay proyecciones.</div>;

  return (
    <div style={{padding: 12}}>
      <h2>Mis Proyecciones</h2>
      {proyecciones.length === 0 && <div>No tienes proyecciones guardadas</div>}
      {proyecciones.map(p => (
        <div key={p.id_proyeccion} style={{border: '1px solid #eee', padding: 8, marginBottom: 8}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <b>{p.nombre_proyeccion || 'Sin nombre'}</b>
              <div style={{fontSize:12,color:'#666'}}>{new Date(p.fecha_creacion).toLocaleString()}</div>
            </div>
            <div>
              <button onClick={() => toggleFavorite(p.id_proyeccion)} style={{marginRight:8}} disabled={favLoading === p.id_proyeccion}>
                {favLoading === p.id_proyeccion ? '...' : (p.favorita ? '★ Favorita' : '☆ Marcar favorita')}
              </button>
              <button onClick={() => { window.location.hash = `#apply-proj-${p.id_proyeccion}`}}>Aplicar</button>
            </div>
          </div>
          <div style={{marginTop:8}}>
            <small>Asignaturas: {p.ItemProyeccion?.length ?? 0}</small>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MisProyecciones;
