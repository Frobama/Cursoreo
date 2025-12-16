import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { adminService } from '../../services/admin.service';
import type { AdminStats, CourseProjection } from '../../types/admin';
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
  const [assignedAsignaturas, setAssignedAsignaturas] = useState<Array<{ codigo: string; nombre: string }>>([]);
  const [globalTopCourses, setGlobalTopCourses] = useState<CourseProjection[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'proyecciones' | 'cursos'>('overview');
  
  // Estados para búsqueda de proyecciones
  const [searchRamo, setSearchRamo] = useState('');
  const [searchSemestre, setSearchSemestre] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const remote = await adminService.getStats();
      setStats(remote);

      try {
        const asigns = await adminService.getMyAssignatures();
        setMyAsignaturas(asigns.map(a => a.codigo.toUpperCase()));
        setAssignedAsignaturas(asigns.map(a => ({ codigo: a.codigo.toUpperCase(), nombre: a.nombre })));
      } catch (err) {
        console.warn('No se pudieron cargar asignaturas del profesor:', err);
        setMyAsignaturas([]);
        setAssignedAsignaturas([]);
      }
      // If the logged user is a Jefe de Carrera, also fetch global top courses
      try {
        if (profesor?.rol && profesor.rol.toLowerCase() === 'jefe de carrera') {
          const global = await adminService.getGlobalTopCourses();
          setGlobalTopCourses(global.map(g => ({ ...g })));
        } else {
          setGlobalTopCourses(null);
        }
      } catch (err) {
        console.warn('No se pudieron cargar top courses globales:', err);
        setGlobalTopCourses(null);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Nota: mostramos aquí las asignaturas registradas en ProfesorAsignatura para el profesor

  const handleSearchProjections = async () => {
    if (!searchRamo && !searchSemestre) {
      alert('Ingrese al menos un criterio de búsqueda');
      return;
    }

    setIsSearching(true);
    try {
      // Obtener todas las proyecciones desde el backend y filtrar localmente
      const resp = await adminService.getAllProjections();
      const proyeccionesData = resp.proyecciones || [];

      const resultsMap: Record<string, any> = {};

      for (const p of proyeccionesData) {
        const estudiante = p.Estudiante;
        const nombreProyeccion = p.nombre_proyeccion || '';
        for (const item of p.ItemProyeccion || []) {
          const asign = item.Asignatura;
          const codigo = (asign?.codigo_asignatura || '').toUpperCase();
          const nombre = asign?.nombre_asignatura || '';
          const semestre = String(item.semestre_proyectado || item.semestre || '');

          // Filtros por entrada
          const matchCodigoOrNombre = !searchRamo || codigo.includes(searchRamo.toUpperCase()) || nombre.toLowerCase().includes(searchRamo.toLowerCase());
          const matchSemestre = !searchSemestre || semestre === String(searchSemestre);
          if (!matchCodigoOrNombre || !matchSemestre) continue;

          // Si es profesor, limitar a sus asignaturas
          if (profesor && profesor.rol && profesor.rol.toLowerCase() !== 'jefe de carrera') {
            if (!myAsignaturas.includes(codigo)) continue;
          }

          const key = `${codigo}::${semestre}`;
          if (!resultsMap[key]) {
            resultsMap[key] = { codigo, nombre, semestre, estudiantes: [], totalEstudiantes: 0 };
          }

          resultsMap[key].estudiantes.push({ rut: estudiante?.rut, nombre: estudiante?.nombre, correo: estudiante?.email, proyeccion: nombreProyeccion });
          resultsMap[key].totalEstudiantes = resultsMap[key].estudiantes.length;
        }
      }

      const finalResults = Object.values(resultsMap).sort((a: any, b: any) => b.totalEstudiantes - a.totalEstudiantes);
      setSearchResults(finalResults);
    } catch (error) {
      console.error('Error al buscar proyecciones:', error);
      alert('Error al buscar proyecciones');
    } finally {
      setIsSearching(false);
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
      
      {/* Tabs de navegación */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <HiChartBar /> Vista General
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'proyecciones' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('proyecciones')}
        >
          <HiDocumentText /> Proyecciones
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'cursos' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('cursos')}
        >
          <HiAcademicCap /> Cursos Populares
        </button>
      </div>

      {/* Contenido según tab activo */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewSection}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <HiTrendingUp className={styles.sectionIcon} />
                <h3>Resumen General</h3>
              </div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Estudiantes</span>
                  <span className={styles.summaryValue}>{stats?.totalEstudiantes || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Proyecciones</span>
                  <span className={styles.summaryValue}>{stats?.totalProyecciones || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Proyecciones Activas</span>
                  <span className={styles.summaryValue}>{stats?.proyeccionesFavoritas || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Carreras Activas</span>
                  <span className={styles.summaryValue}>{stats?.carrerasActivas || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Promedio Proyecciones/Estudiante</span>
                  <span className={styles.summaryValue}>
                    {stats?.totalEstudiantes ? (stats.totalProyecciones / stats.totalEstudiantes).toFixed(1) : '0'}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>% Proyecciones Favoritas</span>
                  <span className={styles.summaryValue}>
                    {stats?.totalProyecciones ? ((stats.proyeccionesFavoritas / stats.totalProyecciones) * 100).toFixed(0) : '0'}%
                  </span>
                </div>
              </div>
            </div>
            
            {globalTopCourses && globalTopCourses.length > 0 && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <HiStar className={styles.sectionIcon} />
                  <h3>Top Cursos Más Populares (Semestre 1)</h3>
                </div>
                <div className={styles.topCoursesList}>
                  {globalTopCourses.slice(0, 5).map((course, idx) => (
                    <div key={course.codigo} className={styles.topCourseItem}>
                      <div className={styles.courseRank}>#{idx + 1}</div>
                      <div className={styles.courseInfo}>
                        <div className={styles.courseTitle}>
                          <strong>{course.codigo}</strong>
                          <span className={styles.courseName}>{course.nombre}</span>
                        </div>
                        <div className={styles.courseBar}>
                          <div 
                            className={styles.courseBarFill} 
                            style={{ 
                              width: `${(course.count / (globalTopCourses[0]?.count || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div className={styles.courseCount}>{course.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignedAsignaturas && assignedAsignaturas.length > 0 && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <HiAcademicCap className={styles.sectionIcon} />
                  <h3>Mis Asignaturas Asignadas</h3>
                </div>
                <div className={styles.topCoursesList}>
                  {assignedAsignaturas.map((course, idx) => (
                    <div key={`mine-${course.codigo}`} className={`${styles.topCourseItem} ${styles.myCourse}`}>
                      <div className={styles.courseRank}>#{idx + 1}</div>
                      <div className={styles.courseInfo}>
                        <div className={styles.courseTitle}>
                          <strong className={styles.courseCode}>{course.codigo}</strong>
                          <span className={styles.courseName}>{course.nombre}</span>
                        </div>
                      </div>
                      <div className={styles.myBadge}>Asignada</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'proyecciones' && (
          <div className={styles.proyeccionesSection}>
            <div className={styles.sectionHeader}>
              <HiDocumentText className={styles.sectionIcon} />
              <h3>Búsqueda de Proyecciones por Curso</h3>
            </div>
            
            <div className={styles.searchCard}>
              <div className={styles.searchForm}>
                <div className={styles.searchInputGroup}>
                  <label>Código o Nombre del Curso</label>
                  <input
                    type="text"
                    placeholder="Ej: INF-239 o Base de Datos"
                    value={searchRamo}
                    onChange={(e) => setSearchRamo(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                
                <div className={styles.searchInputGroup}>
                  <label>Semestre Proyectado</label>
                  <input
                    type="number"
                    placeholder="Ej: 5"
                    min="1"
                    max="15"
                    value={searchSemestre}
                    onChange={(e) => setSearchSemestre(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                
                <button 
                  onClick={handleSearchProjections}
                  disabled={isSearching}
                  className={styles.searchButton}
                >
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              
              <p className={styles.searchHint}>
                💡 Puede buscar por código de curso (ej: INF-239), nombre del curso, 
                semestre específico, o combinar ambos criterios
              </p>
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className={styles.resultsContainer}>
                <h4 className={styles.resultsTitle}>
                  Resultados de búsqueda ({searchResults.length})
                </h4>
                
                <div className={styles.resultsGrid}>
                  {searchResults.map((result, idx) => (
                    <div key={idx} className={styles.resultCard}>
                      <div className={styles.resultHeader}>
                        <div className={styles.resultCourse}>
                          <strong className={styles.resultCode}>{result.codigo}</strong>
                          <span className={styles.resultName}>{result.nombre}</span>
                        </div>
                        <div className={styles.resultMeta}>
                          <span className={styles.resultSemester}>Semestre {result.semestre}</span>
                          <span className={styles.resultCount}>
                            <HiUsers /> {result.totalEstudiantes} estudiantes
                          </span>
                        </div>
                      </div>
                      
                      <details className={styles.studentDetails}>
                        <summary className={styles.studentsSummary}>
                          Ver lista de estudiantes
                        </summary>
                        <div className={styles.studentsList}>
                          {result.estudiantes.map((est: any, i: number) => (
                            <div key={i} className={styles.studentItem}>
                              <span className={styles.studentRut}>{est.rut}</span>
                              <span className={styles.studentName}>{est.correo}</span>
                              <span className={styles.studentProjection}>{est.proyeccion}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {searchResults && searchResults.length === 0 && (
              <div className={styles.emptyState}>
                <HiDocumentText className={styles.emptyIcon} />
                <p>No se encontraron resultados para esta búsqueda</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cursos' && (
          <div className={styles.cursosSection}>
            <div className={styles.sectionHeader}>
              <HiAcademicCap className={styles.sectionIcon} />
              <h3>Mis Cursos - Análisis de Demanda (Semestre 1)</h3>
            </div>
            {stats?.topCourses && stats.topCourses.length > 0 ? (
              <div className={styles.coursesTable}>
                <div className={styles.tableHeader}>
                  <span className={styles.colRank}>Rank</span>
                  <span className={styles.colCode}>Código</span>
                  <span className={styles.colName}>Nombre</span>
                  <span className={styles.colCount}>Estudiantes</span>
                  <span className={styles.colPercent}>Popularidad</span>
                </div>
                {stats.topCourses.map((course, idx) => (
                  <div key={course.codigo} className={styles.tableRow}>
                    <span className={styles.colRank}>
                      <span className={styles.rankBadge}>#{idx + 1}</span>
                    </span>
                    <span className={styles.colCode}>{course.codigo}</span>
                    <span className={styles.colName}>{course.nombre}</span>
                    <span className={styles.colCount}>
                      <strong>{course.count}</strong>
                    </span>
                    <span className={styles.colPercent}>
                      <div className={styles.percentBar}>
                        <div 
                          className={styles.percentFill}
                          style={{ width: `${(course.count / (stats.topCourses[0]?.count || 1)) * 100}%` }}
                        />
                        <span className={styles.percentText}>
                          {course.count} est.
                        </span>
                      </div>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <HiChartBar className={styles.emptyIcon} />
                <p>No hay datos de cursos disponibles</p>
              </div>
            )}
            
            {/* Vista general de todos los cursos para Jefes de Carrera */}
            {profesor?.rol && profesor.rol.toLowerCase() === 'jefe de carrera' && globalTopCourses && globalTopCourses.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <div className={styles.sectionHeader}>
                  <HiChartBar className={styles.sectionIcon} />
                  <h3>Vista General - Todos los Cursos (Semestre 1)</h3>
                </div>
                <div className={styles.coursesTable}>
                  <div className={styles.tableHeader}>
                    <span className={styles.colRank}>Rank</span>
                    <span className={styles.colCode}>Código</span>
                    <span className={styles.colName}>Nombre</span>
                    <span className={styles.colCount}>Estudiantes</span>
                    <span className={styles.colPercent}>Popularidad</span>
                  </div>
                  {globalTopCourses.map((course, idx) => (
                    <div key={`global-${course.codigo}`} className={styles.tableRow}>
                      <span className={styles.colRank}>
                        <span className={styles.rankBadge}>#{idx + 1}</span>
                      </span>
                      <span className={styles.colCode}>{course.codigo}</span>
                      <span className={styles.colName}>{course.nombre}</span>
                      <span className={styles.colCount}>
                        <strong>{course.count}</strong>
                      </span>
                      <span className={styles.colPercent}>
                        <div className={styles.percentBar}>
                          <div
                            className={styles.percentFill}
                            style={{ width: `${(course.count / (globalTopCourses[0]?.count || 1)) * 100}%` }}
                          />
                          <span className={styles.percentText}>
                            {course.count} est.
                          </span>
                        </div>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;