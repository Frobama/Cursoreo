import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';
import styles from './ProyeccionPage.module.css';

const ProyeccionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { carreraActiva } = useApp();
  const [proyecciones, setProyecciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Implementar servicio para obtener proyecciones
    // Por ahora, datos dummy
    setProyecciones([]);
    setIsLoading(false);
  }, [user, carreraActiva]);

  if (isLoading) {
    return <Loading message="Cargando proyecciones..." />;
  }

  return (
    <div className={styles.proyeccionPage}>
      <div className={styles.header}>
        <h1>Mis Proyecciones</h1>
        <button
          onClick={() => navigate('/proyeccion/manual')}
          className={styles.newBtn}
        >
          + Nueva Proyección
        </button>
      </div>

      {proyecciones.length === 0 ? (
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
          {proyecciones.map(proj => (
            <div key={proj.id} className={styles.card}>
              <h3>{proj.nombre}</h3>
              <p>Fecha: {new Date(proj.fecha).toLocaleDateString()}</p>
              <button className={styles.viewBtn}>Ver Detalle</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProyeccionPage;