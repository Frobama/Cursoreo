import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { adminService } from '../../services/admin.service';
import type { AdminStats } from '../../types/admin';
import Loading from '../../components/common/Loading';
import { 
  HiUsers, 
  HiDocumentText, 
  HiStar, 
  HiAcademicCap,
  HiLogout,
  HiTrendingUp,
  HiChartBar
} from 'react-icons/hi';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const { profesor, logout } = useAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const mockStats: AdminStats = {
        totalEstudiantes: 247,
        totalProyecciones: 892,
        proyeccionesFavoritas: 247,
        carrerasActivas: 5,
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats(mockStats);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Loading message="Cargando estadísticas..." />;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1>Panel Administrativo</h1>
          <p>Bienvenido, {profesor?.nombre || 'Profesor Admin'}</p>
        </div>
        <button onClick={logout} className={styles.logoutBtn}>
          <HiLogout /> Cerrar Sesión
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <HiUsers className={styles.statIcon} />
          <div className={styles.statValue}>{stats?.totalEstudiantes}</div>
          <div className={styles.statLabel}>Estudiantes Registrados</div>
          <div className={styles.statDetail}>En la plataforma</div>
        </div>

        <div className={styles.statCard}>
          <HiDocumentText className={styles.statIcon} />
          <div className={styles.statValue}>{stats?.totalProyecciones}</div>
          <div className={styles.statLabel}>Proyecciones Totales</div>
          <div className={styles.statDetail}>Todas las creadas</div>
        </div>

        <div className={styles.statCard}>
          <HiStar className={styles.statIcon} />
          <div className={styles.statValue}>{stats?.proyeccionesFavoritas}</div>
          <div className={styles.statLabel}>Proyecciones Activas</div>
          <div className={styles.statDetail}>Marcadas como favoritas</div>
        </div>

        <div className={styles.statCard}>
          <HiAcademicCap className={styles.statIcon} />
          <div className={styles.statValue}>{stats?.carrerasActivas}</div>
          <div className={styles.statLabel}>Carreras</div>
          <div className={styles.statDetail}>Con estudiantes activos</div>
        </div>
      </div>

      <div className={styles.chartsSection}>
        <h2>Estadísticas Detalladas</h2>
        <div className={styles.placeholderCharts}>
          <div className={styles.chartPlaceholder}>
            <HiTrendingUp className={styles.chartIcon} />
            <span>Proyecciones por semestre</span>
            <p className={styles.comingSoon}>Próximamente</p>
          </div>
          <div className={styles.chartPlaceholder}>
            <HiChartBar className={styles.chartIcon} />
            <span>Ramos más populares</span>
            <p className={styles.comingSoon}>Próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;