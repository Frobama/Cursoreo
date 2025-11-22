import { useMemo } from 'react';
import { type RamoCompleto } from '../../types';
import styles from './MallaVisualizer.module.css';

type MallaVisualizerProps = {
    malla: RamoCompleto[];
    ramosAprobados: Set<string>;
    ramosInscritos: Set<string>;
    onRamoClick?: (ramo: RamoCompleto) => void;
};

const MallaVisualizer: React.FC<MallaVisualizerProps> = ({ 
    malla,
    ramosAprobados,
    ramosInscritos,
    onRamoClick
 }) => {

    const ramosPorNivel = useMemo(() => {
        // La lógica de agrupación sigue siendo la misma, solo cambia el tipo
        return malla.reduce((acc, ramo) => {
            const nivel = ramo.nivel;
            if(!acc[nivel]) {
                acc[nivel] = [];
            }
            acc[nivel].push(ramo);
            return acc;
        }, {} as Record<number, RamoCompleto[]>); // Actualizamos el tipo aquí
    }, [malla]);

    const nivelesOrdenados = useMemo(() => {
        return Object.keys(ramosPorNivel)
        .map(n => parseInt(n))
        .sort((a, b) => a - b);
    }, [ramosPorNivel]);
    
        
    const getRamoStatus = (ramo: RamoCompleto): string => {
        if (ramo.status) {
            const statusUpper = ramo.status.toString().trim().toUpperCase();
            if (statusUpper === 'APROBADO') return 'aprobado';
            if (statusUpper === 'INSCRITO') return 'inscrito';
            if (statusUpper === 'REPROBADO') return 'reprobado';
        }

        if (ramosAprobados.has(ramo.codigo)) return 'aprobado';
        if (ramosInscritos.has(ramo.codigo)) return 'inscrito';

        return 'pendiente';
    }
    
    // 3. (Opcional pero recomendado) Función de ayuda para mantener el JSX limpio
    // Devuelve el nombre de la clase CSS según el estado del ramo.
    const getStatusClass = (status: string): string => {
        switch (status) {
        case 'aprobado':
            return styles.statusAprobado;
        case 'inscrito':
            return styles.statusInscrito;
        case 'reprobado':
            return styles.statusReprobado;
        case 'pendiente':
        default:
            return styles.statusPendiente;
        }
    };

    const handleRamoClick = (ramo: RamoCompleto) => {
        if (onRamoClick) {
            onRamoClick(ramo);
        }
    };

    const isClickeable = (status: string): boolean => {
        return status !== 'aprobado';
    };

    return (
        <div className={styles.mallaContainer}>
        {nivelesOrdenados.map(nivel => {
            const ramos = ramosPorNivel[nivel];
            if (!ramos || ramos.length === 0) return null;

            return (
            <div className={styles.nivelColumn} key={nivel}>
                <div className={styles.nivelHeader}>
                <h3 className={styles.nivelTitle}>Nivel {nivel}</h3>
                <span className={styles.nivelCount}>
                    {ramos.length} {ramos.length === 1 ? 'ramo' : 'ramos'}
                </span>
                </div>

                <div className={styles.ramosList}>
                {ramos.map(ramo => {
                    const status = getRamoStatus(ramo);
                    const statusClass = getStatusClass(status);
                    const clickeable = isClickeable(status);

                    return (
                    <div
                        key={ramo.codigo}
                        className={`${styles.ramoCard} ${statusClass} ${
                        clickeable ? styles.clickeable : ''
                        }`}
                        onClick={() => clickeable && handleRamoClick(ramo)}
                        role={clickeable ? 'button' : undefined}
                        tabIndex={clickeable ? 0 : undefined}
                    >
                        <div className={styles.ramoHeader}>
                        <span className={styles.ramoCodigo}>{ramo.codigo}</span>
                        <span className={styles.ramoCreditos}>
                            {ramo.creditos} cr
                        </span>
                        </div>

                        <p className={styles.ramoNombre} title={ramo.asignatura}>
                        {ramo.asignatura}
                        </p>

                        {/* Mostrar prerrequisitos si existen */}
                        {ramo.prereq && ramo.prereq !== '-' && (
                        <div className={styles.prereqContainer}>
                            <span className={styles.prereqLabel}>Prereq:</span>
                            <span className={styles.prereqValue}>{ramo.prereq}</span>
                        </div>
                        )}

                        {/* Badge de estado */}
                        <div className={styles.statusBadge}>
                        {status === 'aprobado' && '✓'}
                        {status === 'inscrito' && '📚'}
                        {status === 'reprobado' && '✗'}
                        {status === 'pendiente' && '⏳'}
                        </div>

                        {/* Información adicional si está inscrito */}
                        {ramo.nrc && (
                        <div className={styles.extraInfo}>
                            <small>NRC: {ramo.nrc}</small>
                        </div>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>
            );
        })}

        {/* Mensaje si no hay ramos */}
        {nivelesOrdenados.length === 0 && (
            <div className={styles.emptyState}>
            <p>No hay ramos para mostrar</p>
            </div>
        )}
        </div>
    );
};

export default MallaVisualizer;