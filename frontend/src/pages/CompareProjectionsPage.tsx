import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import { useProjections } from '../hooks/useProjection';
import ProjectionCompare from '../components/proyeccion/ProjectionCompare';
import Loading from '../components/common/Loading';
import type { FavoriteProjection, Proyeccion } from '../types';
import styles from './CompareProjectionsPage.module.css';

const CompareProjectionsPage = () => {
  const { user } = useAuth();
  const { carreraActiva } = useApp();
  const { projections, isLoading } = useProjections({
    rut: user?.rut || '',
    codigoCarrera: carreraActiva?.codigo || '',
    catalogo: carreraActiva?.catalogo || '',
    enabled: !!user && !!carreraActiva,
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mostrarStats, setMostrarStats] = useState(false);

  // Transformar proyecciones a formato FavoriteProjection
  const transformedProjections = useMemo(() => {
    return projections.map((proj: Proyeccion): FavoriteProjection => {
      // Agrupar ItemProyeccion por semestre
      const itemsAgrupados = proj.ItemProyeccion.reduce((acc, item) => {
        const sem = item.semestre_proyectado;
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push({
          codigo: item.Asignatura.codigo_asignatura,
          asignatura: item.Asignatura.nombre_asignatura,
          creditos: item.Asignatura.creditos,
        });
        return acc;
      }, {} as any);

      // Convertir a array de semestres
      const plan = Object.keys(itemsAgrupados)
        .map(Number)
        .sort((a, b) => a - b)
        .map((sem) => ({
          semester: sem,
          courses: itemsAgrupados[sem],
          totalCredits: itemsAgrupados[sem].reduce(
            (sum: number, c: any) => sum + c.creditos,
            0
          ),
        }));

      return {
        id_proyeccion: proj.id_proyeccion,
        nombre_proyeccion: proj.nombre_proyeccion,
        tipo: 'manual',
        fecha_creacion: proj.fecha_creacion,
        plan,
      };
    });
  }, [projections]);

  if (isLoading) return <Loading message="Cargando proyecciones..." />;

  const selectedProjections = transformedProjections.filter((p) =>
    selectedIds.includes(p.id_proyeccion)
  );

  return (
    <div className={styles.comparePage}>
      <h1>Comparar Proyecciones</h1>

      <div className={styles.selector}>
        <h3>Selecciona las proyecciones a comparar:</h3>
        {transformedProjections.map((p) => (
          <label key={p.id_proyeccion} className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedIds.includes(p.id_proyeccion)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds([...selectedIds, p.id_proyeccion]);
                } else {
                  setSelectedIds(
                    selectedIds.filter((id) => id !== p.id_proyeccion)
                  );
                }
              }}
            />
            {p.nombre_proyeccion}
          </label>
        ))}
        <button onClick={() => setMostrarStats(!mostrarStats)}>
          {mostrarStats ? 'Mostrar Ramos Proyectados' : 'Mostrar Estadísticas'}
        </button>
      </div>

      {selectedIds.length >= 2 ? (
        <ProjectionCompare 
          projections={selectedProjections}
          mostrarStats={mostrarStats}
        />
      ) : (
        <div className={styles.emptyState}>
          Selecciona al menos 2 proyecciones para comparar
        </div>
      )}
    </div>
  );
};

export default CompareProjectionsPage;