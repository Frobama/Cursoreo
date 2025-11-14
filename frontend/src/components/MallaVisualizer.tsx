import { useMemo } from 'react';
import styles from './MallaVisualizer.module.css';
// 1. Importamos el nuevo tipo desde Dashboard para mantener la consistencia
import type { RamoCompleto } from './Dashboard';

// 2. Actualizamos los props para que esperen un array del nuevo tipo
type MallaVisualizerProps = {
    malla: RamoCompleto[];
};

const MallaVisualizer: React.FC<MallaVisualizerProps> = ({ malla }) => {

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

    const nivelesOrdenados = Object.keys(ramosPorNivel).sort((a, b) => parseInt(a) - parseInt(b));

    // 3. (Opcional pero recomendado) Función de ayuda para mantener el JSX limpio
    // Devuelve el nombre de la clase CSS según el estado del ramo.
    const getStatusClass = (status: string) => {
        const statusUpper = (status || '').toString().trim().toUpperCase();
        if (statusUpper === 'APROBADO') {
            return styles.statusAprobado;
        }
        if (statusUpper === 'INSCRITO') {
            return styles.statusInscrito;
        }
        if (statusUpper === 'REPROBADO') {
            return styles.statusReprobado;
        }
        return styles.statusPendiente; // Para 'PENDIENTE' o cualquier otro caso
    };

    return (
        <div className={styles.mallaContainer}>
            {nivelesOrdenados.map(nivel => (
                <div className={styles.nivelColumn} key={nivel}>
                    <h3>Nivel {nivel}</h3>
                    <div className={styles.ramosList}>
                        {ramosPorNivel[parseInt(nivel)].map(ramo => (
                            // 4. Aplicamos la clase de estado dinámicamente
                            <div 
                                className={`${styles.ramoCard} ${getStatusClass(ramo.status)}`} 
                                key={ramo.codigo}
                            >
                                <p className={styles.ramoNombre}>{ramo.asignatura}</p>
                                <p className={styles.ramoCodigo}>{ramo.codigo}</p>
                                <p className={styles.ramoCreditos}>Créditos: {ramo.creditos}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MallaVisualizer;