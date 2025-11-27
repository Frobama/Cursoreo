import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProjections } from '../hooks/useProjection';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';
import FavoriteProjectionCard from '../components/proyeccion/FavoriteProjectionCard';
import ProjectionDetailModal from '../components/proyeccion/ProjectionDetailModal';
import styles from './ProyeccionPage.module.css';
import type { Proyeccion, FavoriteProjection } from '../types';
import { projectionService } from '../services/projection.service';

const ProyeccionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { carreraActiva } = useApp();
  const { projections, favorite, isLoading } = useProjections({
    rut: user?.rut || '',
    codigoCarrera: carreraActiva?.codigo || '',
    catalogo: carreraActiva?.catalogo || '',
    enabled: !!user && !!carreraActiva,
  }) as {
    projections: Proyeccion[];
    favorite: FavoriteProjection | null;
    isLoading: boolean;
  };

  const [selectedProjection, setSelectedProjection] = useState<FavoriteProjection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMarkingFavorite, setIsMarkingFavorite] = useState(false);

  // Transformar proyecciones a formato FavoriteProjection
  const transformedProjections = useMemo(() => {
    return projections.map((proj: Proyeccion): FavoriteProjection => {
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

  const handleViewDetail = (proj: FavoriteProjection) => {
    setSelectedProjection(proj);
    setIsModalOpen(true);
  };

  const handleMarkAsFavorite = async (id: number) => {
    try {
      setIsMarkingFavorite(true);
      await projectionService.setFavoriteProjection(id);
      // Recargar proyecciones para actualizar la favorita
      window.location.reload(); // O mejor: usa un estado para refrescar
    } catch (error) {
      console.error('Error al marcar como favorita:', error);
      alert('Error al marcar como favorita');
    } finally {
      setIsMarkingFavorite(false);
    }
  };

  if (isLoading) {
    return <Loading message="Cargando proyecciones..." />;
  }

  return (
    <div className={styles.proyeccionPage}>
      <div className={styles.header}>
        <h1>Mis Proyecciones</h1>
        <div className={styles.actions}>
          <button
            onClick={() => navigate('/proyeccion/comparar')}
            className={styles.compareBtn}
          >
            📊 Comparar Proyecciones
          </button>
          <button
            onClick={() => navigate('/proyeccion/manual')}
            className={styles.newBtn}
          >
            + Nueva Proyección
          </button>
        </div>
      </div>

      {favorite && (
        <div style={{ marginBottom: 24 }}>
          <FavoriteProjectionCard projection={favorite} />
        </div>
      )}

      {projections.length === 0 ? (
        <div className={styles.empty}>
          <h2>No tienes proyecciones guardadas</h2>
          <p>Crea tu primera proyección para planificar tus semestres.</p>
          <button
            onClick={() => navigate('/proyeccion/manual')}
            className={styles.createBtn}
          >
            Crear Proyección
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {transformedProjections.map((proj) => (
            <div key={proj.id_proyeccion} className={styles.card}>
              <h3>{proj.nombre_proyeccion}</h3>
              <p>Fecha: {new Date(proj.fecha_creacion).toLocaleDateString()}</p>
              <button 
                className={styles.viewBtn}
                onClick={() => handleViewDetail(proj)}
              >
                Ver Detalle
              </button>
            </div>
          ))}
        </div>
      )}


      <ProjectionDetailModal
          projection={selectedProjection}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onMarkAsFavorite={handleMarkAsFavorite}
          isFavorite={selectedProjection?.id_proyeccion === favorite?.id_proyeccion}
        isLoading={isMarkingFavorite}
        />
    </div>
  );
};

export default ProyeccionPage;