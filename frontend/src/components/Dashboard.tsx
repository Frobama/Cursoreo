import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

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
type RamoExtend = RamoAvance & {
    nombreAsignatura: string;
};

type Carrera = {
    nombre: string;
    codigo: string;
    catalogo: string;
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDatosCompletos = async () => {
            try {
                // CARGAR TODAS LAS MALLAS Y CREAR UN MAPA
                const mapaNombres = new Map<string, string>();
                
                const promesasMallas = userData.carreras.map(carrera =>
                    fetch(`http://localhost:3001/api/mallas?codigoCarrera=${carrera.codigo}&catalogo=${carrera.catalogo}`)
                );
                const respuestasMallas = await Promise.all(promesasMallas);

                for (const res of respuestasMallas) {
                    if (!res.ok) {
                        console.error("Hubo un error al cargar una de las mallas.");
                        continue; // Salta a la siguiente si una falla
                    }
                    const malla: CarreraMalla[] = await res.json();
                    if (Array.isArray(malla)) {
                        malla.forEach(asignatura => {
                            const codigoNormalizado = asignatura.codigo.trim().toUpperCase();
                            if (!mapaNombres.has(codigoNormalizado)) {
                                mapaNombres.set(codigoNormalizado, asignatura.asignatura);
                            }
                        });
                    }
                }

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

                // FILTRAR LOS RAMOS INSCRITOS
                const inscritosEnriquecidos = todosRamos
                    .filter(ramo => ramo.status === 'INSCRITO')
                    .map(ramoInscrito => {
                        const codigoNormalizado = ramoInscrito.course.trim().toUpperCase();
                        return {
                            ...ramoInscrito,
                            nombreAsignatura: mapaNombres.get(codigoNormalizado) || "Nombre no encontrado"
                        };
                    });
                
                setRamosInscritos(inscritosEnriquecidos);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDatosCompletos();
    }, [userData]);

    const handleProyectionClick = () => {
        console.log("Navegando a la proyección...");
    };

    return (
        <>
            <div className={styles.backWhite}>
                <div className={styles.blueBar}></div>
                <h1 className={styles.blackH1}>Área Personal</h1>

                <div className={styles.container}>
                    <img src="./src/assets/profilepic.png" style={{ height: '100px' }} alt="Foto de perfil" />
                    <div className={styles.infoDiv}>
                        <p>{userData.rut || "RUT no disponible"}</p>
                        <p>{userData.email}</p>
                        <p>Universidad Católica del Norte</p>
                        <button className={styles.buttonLogout} onClick={onLogout}>Cerrar Sesión</button>
                    </div>
                </div>

                <div className={styles.buttonDiv}>
                    <button onClick={handleProyectionClick} className={styles.buttonEgreso}>
                        Proyectar egreso
                    </button>
                </div>

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
            </div>
        </>
    );
};

export default Dashboard;