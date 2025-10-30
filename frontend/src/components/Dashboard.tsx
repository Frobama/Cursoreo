import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import MallaVisualizer from './MallaVisualizer';
import { planSemesters } from '../utils/planner';
import type { Ramo as PlannerRamo, PlanSemester } from '../utils/planner';
import { saveAvanceCurricular, getAvanceCurricular } from '../utils/localStorageManager';

// --- TIPOS DE DATOS ---
type RamoAvance = {
    course: string;
    status: string;
    nrc: string;
};

type CarreraMalla = {
    codigo: string;
    asignatura: string;
    creditos: number;
    nivel: number;
    prereq: string;
};

// Ramo de avance + el nombre que encontramos
export type RamoExtend = RamoAvance & {
    nombreAsignatura: string;
};

type Carrera = {
    nombre: string;
    codigo: string;
    catalogo: string;
};

type MallasPorCarrera = {
    [codigoCarrera: string]: CarreraMalla[]
};

type DashboardProps = {
    userData: {
        rut: string;
        email: string;
        carreras: Carrera[]
    };
    onLogout: () => void;
};

const Dashboard: React.FC<DashboardProps> = ({ userData, onLogout }) => {

    const [ramosInscritos, setRamosInscritos] = useState<RamoExtend[]>([]);
    const [ramosAprobados, setRamosAprobados] = useState<RamoExtend[]>([]);
    const [mallasCargadas, setMallasCargadas] = useState<MallasPorCarrera>({});
    const [carreraActiva, setCarreraActiva] = useState<Carrera | null>(null);
    const [mostrarMalla, setMostrarMalla] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<PlanSemester[] | null>(null);
    const [planErrors, setPlanErrors] = useState<string[] | null>(null);

    useEffect(() => {
        const fetchDatosCompletos = async () => {
            try {

                const cachedData = getAvanceCurricular(userData.rut);
                if (cachedData) {
                    setRamosInscritos(cachedData.ramosInscritos);
                    setRamosAprobados(cachedData.ramosAprobados);
                }
                // CARGAR TODAS LAS MALLAS Y CREAR UN MAPA
                const mapaNombres = new Map<string, string>();
                const nuevasMallasCargadas: MallasPorCarrera = {};
                
                const promesasMallas = userData.carreras.map(carrera =>
                    fetch(`http://localhost:3001/api/mallas?codigoCarrera=${carrera.codigo}&catalogo=${carrera.catalogo}`)
                );
                const respuestasMallas = await Promise.all(promesasMallas);

                for (let i = 0; i < respuestasMallas.length; i++) {
                    const res = respuestasMallas[i];
                    const carrera = userData.carreras[i];

                    if (!res.ok) {
                        console.error("Hubo un error al cargar una de las mallas.");
                        continue; // Salta a la siguiente si una falla
                    }
                    const malla: CarreraMalla[] = await res.json();
                    if (Array.isArray(malla)) {
                        nuevasMallasCargadas[carrera.codigo] = malla;

                        malla.forEach(asignatura => {
                            const codigoNormalizado = asignatura.codigo.trim().toUpperCase();
                            if (!mapaNombres.has(codigoNormalizado)) {
                                mapaNombres.set(codigoNormalizado, asignatura.asignatura);
                            }
                        });
                    }
                }
                setMallasCargadas(nuevasMallasCargadas);

                if (!cachedData) {
                // CARGAR TODO EL AVANCE CURRICULAR 
                const todosRamos: RamoAvance[] = [];
                
                for (const carrera of userData.carreras) {
                    const res = await fetch(`http://localhost:3001/api/avance?rut=${userData.rut}&codcarrera=${carrera.codigo}`);
                    if (res.ok) {
                        const ramosCarrera: RamoAvance[] = await res.json();
                        if (Array.isArray(ramosCarrera)) {
                            todosRamos.push(...ramosCarrera);
                        }
                    } else {
                        console.error(`Error al obtener el avance para la carrera ${carrera.codigo}`);
                    }
                }   
                console.log("Todos los ramos obtenidos:", todosRamos);
                // FILTRAR LOS RAMOS INSCRITOS
                const inscritosEnriquecidos = todosRamos
                    .filter(ramo => ramo.status === 'INSCRITO')
                    .map(ramoInscrito => {
                        const codigoNormalizado = ramoInscrito.course.trim().toUpperCase();
                        return {   //Aca poner un if en un for en todos ramos para ver si el ramo inscrito no tiene una copia que está aprobada, porque eso significa que ya lo está (aunque no se si sea necesario)
                            ...ramoInscrito,
                            nombreAsignatura: mapaNombres.get(codigoNormalizado) || "Nombre no encontrado"
                        };
                    });
                setRamosInscritos(inscritosEnriquecidos);

                // FILTRAR LOS RAMOS APROBADOS
                const aprobadosEnriquecidos = todosRamos
                    .filter(ramo => ramo.status === 'APROBADO')
                    .map(ramoAprobado => {
                        const codigoNormalizado = ramoAprobado.course.trim().toUpperCase();
                        return {
                            ...ramoAprobado,
                            nombreAsignatura: mapaNombres.get(codigoNormalizado) || "Nombre no encontrado"
                        };
                    });
                setRamosAprobados(aprobadosEnriquecidos);

                saveAvanceCurricular({
                        rut: userData.rut,
                        ramosInscritos: inscritosEnriquecidos,
                        ramosAprobados: aprobadosEnriquecidos,
                        lastUpdate: new Date().toISOString()
                    });
                }
                
                if (userData.carreras.length > 0) {
                    setCarreraActiva(userData.carreras[0]);
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDatosCompletos();
    }, [userData]);

    const handleProyectionClick = () => {
        // Calcular plan de egreso con la malla activa y los ramos inscritos
        if (!carreraActiva) return;// Acá debería ir un pequeño menú para seleccionar carrera
        const malla = mallasCargadas[carreraActiva.codigo]; //Acá entre los [] debería ir la selección de carrera
        if (!malla) return;
        console.log("Malla para planificar:", malla);
        // convertir la malla al tipo que espera el planner
        const mallaPlanner: PlannerRamo[] = malla.map(r => {
            const raw = (r as any).prereq;
            let prereqArr: string[] = [];
            if (Array.isArray(raw)) {
                prereqArr = raw.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean);
            } else if (typeof raw === 'string' && raw.trim() !== '') {
                prereqArr = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            }

            return {
                codigo: r.codigo.trim().toUpperCase(),
                asignatura: r.asignatura,
                creditos: r.creditos,
                nivel: r.nivel,
                prereq: prereqArr
            } as PlannerRamo;
        });

        const completedSet = new Set<string>(ramosInscritos.map(r => r.course.trim().toUpperCase()));
        const approvedSet = new Set<string>(ramosAprobados.map(r => r.course.trim().toUpperCase()));

        console.log("Ramos inscritos (completados):", completedSet);
        console.log("Ramos aprobados:", ramosAprobados);
        const { plan: computedPlan, remaining, errors } = planSemesters(mallaPlanner, completedSet, 24);
        setPlan(computedPlan);
        setPlanErrors(errors.length ? errors : null);
        if (remaining.length) {
            // Si quedan ramos sin planificar, añadir aviso a errores
            setPlanErrors(prev => [...(prev ?? []), `Quedan sin planificar: ${remaining.join(', ')}`]);
        }
    };
    
    return (
        <>
            <div className={styles.backWhite}>
                <div className={styles.blueBar}></div>
                <h1 className={styles.blackH1}>Área Personal</h1>

                <div className={styles.container}>
                    <img src="./src/assets/profilepic.png" style={{ height: '110px' }} alt="Foto de perfil" />
                    <div className={styles.infoDiv}>
                        <p>{userData.rut || "RUT no disponible"}</p>
                        <p>{userData.email}</p>
                        <p>Universidad Católica del Norte</p>
                        {carreraActiva && (
                            <p>Carrera Actual: {carreraActiva.nombre}</p>
                        )}
                        <button className={styles.buttonLogout} onClick={onLogout}>Cerrar Sesión</button>
                    </div>
                </div>

                <div className={styles.buttonDiv }>
                    <button
                        onClick={() => setMostrarMalla(!mostrarMalla)}
                        className={styles.buttonEgreso}
                    >
                        {mostrarMalla ? 'Ver Ramos Inscritos' : 'Ver Malla Completa'}
                    </button>
                    <button onClick={handleProyectionClick} className={styles.buttonEgreso}>
                        Proyectar egreso
                    </button>
                </div>

                {planErrors && (
                    <div style={{ color: 'red' }}>
                        {planErrors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                )}

                {plan && (
                    <div className={styles.planContainer}>
                        <h3>Plan sugerido</h3>
                        {plan.map(s => (
                            <div key={s.semester}>
                                <h4>Semestre {s.semester} - Créditos: {s.totalCredits}</h4>
                                <ul>
                                    {s.courses.map(c => (
                                        <li key={c.codigo}>{c.codigo} - {c.asignatura} ({c.creditos}cr)</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {mostrarMalla ? (
                    carreraActiva && mallasCargadas[carreraActiva.codigo] ? (
                        <MallaVisualizer malla={mallasCargadas[carreraActiva.codigo]} />
                    ) : (
                        <p>Cargando o no se pudo encontrar la malla.</p>
                    )
                ) : (
                    <div className={styles.ramoContainer}>
                        <h3>Mis Ramos Inscritos</h3>
                        {isLoading && <p>Cargando tus ramos...</p>}
                        {error && <p style={{ color: 'red' }}>{error}</p>}

                        {!isLoading && !error && ramosInscritos.length === 0 && <p>No tienes ramos inscritos actualmente</p>}

                        {ramosInscritos.map((ramo, index) => (
                            <div className={styles.ramo} key={`${ramo.course}-${ramo.nrc || index}`}>
                                <h2>{ramo.nombreAsignatura}</h2>
                                <p>{ramo.course}</p>
                                <p>Estado: {ramo.status || "Sin Estado"}</p>
                                <p>NRC: {ramo.nrc || "Sin NRC"}</p>
                            </div>
                        ))}
                    </div>
                )}

                
            </div>
        </>
    );
};

export default Dashboard;