// src/pages/DashboardPage.tsx
import { useNavigate } from 'react-router-dom';
import { HiChartBar, HiPencilAlt, HiCheckCircle, HiBookOpen, HiAcademicCap, HiClipboardList } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import { useMalla } from '../hooks/useMalla';
import { useAvance } from '../hooks/useAvance';
import StatsCard from '../components/dashboard/StatsCard';
import ProgressChart from '../components/dashboard/ProgressChart';
import styles from './DashboardPage.module.css';

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { carreraActiva } = useApp();

    // Hooks con parámetros necesarios
    const { 
        malla, 
        isLoading: mallaLoading,
        totalRamos,
        totalCreditos
    } = useMalla({
        codigoCarrera: carreraActiva?.codigo || '',
        catalogo: carreraActiva?.catalogo || ''
    });

    const { 
        ramosAprobados,
        ramosInscritos,
        isLoading: avanceLoading,
        totalAprobados,
        totalInscritos,
        error: avanceError
    } = useAvance({
        rut: user?.rut || '',
        codigoCarrera: carreraActiva?.codigo || '',
        catalogo: carreraActiva?.catalogo || ''
    });

    const handleViewMalla = () => {
        navigate('/malla');
    };

    const handleCreateProjection = () => {
        navigate('/proyeccion/manual');
    };

    // Mostrar loading mientras carga
    if (mallaLoading || avanceLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando datos...</p>
            </div>
        );
    }

    // Mostrar error si no hay carrera activa
    if (!carreraActiva) {
        return (
            <div className={styles.error}>
                <h2>No hay carrera seleccionada</h2>
                <p>Por favor, selecciona una carrera para continuar.</p>
            </div>
        );
    }

    // Calcular créditos aprobados
    const creditosAprobados = ramosAprobados.reduce(
        (sum, ramo) => sum + (ramo.creditos || 0), 
        0
    );

    // Calcular porcentaje de avance
    const porcentajeAvance = totalCreditos > 0 
        ? Math.round((creditosAprobados / totalCreditos) * 100)
        : 0;

    return (
        <div className={styles.dashboard}>
            <div className={styles.header}>
                <h1>Dashboard</h1>
                <p className={styles.userName}>Bienvenido, {user?.nombre || user?.email}</p>
                <p className={styles.carrera}>
                    {carreraActiva.nombre} - Catálogo {carreraActiva.catalogo}
                </p>
            </div>

            {avanceError && (
                <div className={styles.errorBanner}>
                    ⚠️ Error al cargar avance: {avanceError}
                </div>
            )}

            <div className={styles.statsGrid}>
                <StatsCard
                    title="Ramos Aprobados"
                    value={totalAprobados}
                    subtitle={`${creditosAprobados} créditos`}
                    icon={<HiCheckCircle />}
                    color="green"
                />
                <StatsCard
                    title="Ramos Inscritos"
                    value={totalInscritos}
                    subtitle={`${ramosInscritos.reduce((sum, r) => sum + (r.creditos || 0), 0)} créditos`}
                    icon={<HiBookOpen />}
                    color="blue"
                />
                <StatsCard
                    title="Avance Curricular"
                    value={`${porcentajeAvance}%`}
                    subtitle={`${creditosAprobados} / ${totalCreditos} créditos`}
                    icon={<HiAcademicCap />}
                    color="purple"
                />
                <StatsCard
                    title="Total Ramos"
                    value={totalRamos}
                    subtitle={`${totalCreditos} créditos totales`}
                    icon={<HiClipboardList />}
                    color="orange"
                />
            </div>

            <div className={styles.actions}>
                <button onClick={handleViewMalla} className={styles.btnPrimary}>
                    <HiChartBar style={{ marginRight: '6px' }} /> Ver Malla Curricular
                </button>
                <button onClick={handleCreateProjection} className={styles.btnSecondary}>
                    <HiPencilAlt style={{ marginRight: '6px' }} /> Crear Proyección Manual
                </button>
            </div>

            {ramosAprobados.length > 0 && (
                <ProgressChart 
                    ramosAprobados={ramosAprobados}
                    ramosInscritos={ramosInscritos}
                    totalCreditos={totalCreditos}
                    creditosAprobados={creditosAprobados}
                />
            )}

            {/* Lista rápida de ramos inscritos */}
            {ramosInscritos.length > 0 && (
                <div className={styles.currentSemester}>
                    <h2>Ramos Inscritos Actualmente</h2>
                    <ul className={styles.ramosList}>
                        {ramosInscritos.map((ramo, idx) => (
                            <li key={idx} className={styles.ramoItem}>
                                <span className={styles.ramoCodigo}>{ramo.codigo}</span>
                                <span className={styles.ramoNombre}>{ramo.asignatura}</span>
                                <span className={styles.ramoCreditos}>{ramo.creditos} cr.</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;