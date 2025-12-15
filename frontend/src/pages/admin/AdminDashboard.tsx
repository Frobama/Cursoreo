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
  const [proyecciones, setProyecciones] = useState<any[] | null>(null);
  const [myAsignaturas, setMyAsignaturas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const remote = await adminService.getStats();
      setStats(remote);
      // Cargar proyecciones y asignaturas del profesor para la lista por semestre
      try {
        const projectionsResp = await adminService.getAllProjections();
        // projectionsResp may be { total, proyecciones } or an array
        const arr = Array.isArray(projectionsResp) ? projectionsResp : (projectionsResp.proyecciones || projectionsResp);
        setProyecciones(arr as any[]);
      } catch (err) {
        console.warn('No se pudieron cargar proyecciones:', err);
        setProyecciones([]);
      }

      try {
        const asigns = await adminService.getMyAssignatures();
        setMyAsignaturas(asigns.map(a => a.codigo.toUpperCase()));
      } catch (err) {
        console.warn('No se pudieron cargar asignaturas del profesor:', err);
        setMyAsignaturas([]);
      }
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
        <h3>Proyecciones por Semestre</h3>
        <div className={styles.projectionsList}>
          {proyecciones && proyecciones.length > 0 ? (
            proyecciones.map(proj => (
              <div key={proj.id_proyeccion || proj.id || proj.nombre_proyeccion} className={styles.projectionCard}>
                <div className={styles.projectionHeader}>
                  <strong>{proj.nombre_proyeccion || proj.nombre || `Proyección ${proj.id_proyeccion || proj.id}`}</strong>
                  <span className={styles.projectionStudent}>{proj.Estudiante?.nombre_completo || proj.estudiante?.nombre || proj.estudiante?.rut}</span>
                </div>
                <ul className={styles.projectionItems}>
                  {(proj.ItemProyeccion || proj.items || []).sort((a:any,b:any)=> (a.semestre_proyectado||a.sem||0)-(b.semestre_proyectado||b.sem||0)).map((item:any, idx:number)=>{
                    const codigo = (item.Asignatura?.codigo_asignatura || item.codigo || item.codigo_asignatura || '').toUpperCase();
                    const isMine = myAsignaturas.includes(codigo);
                    const sem = item.semestre_proyectado ?? item.sem ?? item.semestre ?? 'N/A';
                    return (
                      <li key={idx} className={isMine ? styles.myCourse : ''}>
                        <span className={styles.itemCode}>{codigo}</span>
                        <span className={styles.itemName}>{item.Asignatura?.nombre_asignatura || item.nombre || item.asignatura}</span>
                        <span className={styles.itemSem}>Sem: {sem}</span>
                        {isMine && <span className={styles.matchBadge}>Asignatura a su cargo</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <div className={styles.chartPlaceholder}>No hay proyecciones disponibles</div>
          )}
        </div>
        <div className={styles.placeholderCharts}>
          <div className={styles.popularCourses}>
            <h3>Ramos más populares</h3>
            {stats?.topCourses && stats.topCourses.length > 0 ? (
              <ul className={styles.courseList}>
                {stats.topCourses.map((c) => (
                  <li key={c.codigo} className={styles.courseItem}>
                    <div className={styles.courseRow}>
                      <strong className={styles.courseCode}>{c.codigo}</strong>
                      <span className={styles.courseCount}>{c.count} proyecciones</span>
                    </div>
                    <div className={styles.courseName}>{c.nombre}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.chartPlaceholder}>
                <HiChartBar className={styles.chartIcon} />
                <span>Ramos más populares</span>
                <p className={styles.comingSoon}>Sin datos</p>
              </div>
            )}
          </div>

          <div className={styles.chartPlaceholder}>
            <HiTrendingUp className={styles.chartIcon} />
            <span>Proyecciones por semestre</span>
            <p className={styles.comingSoon}>Próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;