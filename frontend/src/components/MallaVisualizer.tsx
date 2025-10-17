import { useMemo } from 'react';
import styles from './MallaVisualizer.module.css';

type CarreraMalla = {
    codigo: string;
    asignatura: string;
    creditos: number;
    nivel: number;
    prereq: string;
};

type MallaVisualizerProps = {
    malla: CarreraMalla[];
};

const MallaVisualizer: React.FC<MallaVisualizerProps> = ({ malla }) => {

    const ramosPorNivel = useMemo(() => {
        console.log("Calculando agrupación de ramos");

        return malla.reduce((acc, ramo) => {
            const nivel = ramo.nivel;
            if(!acc[nivel]) {
                acc[nivel] = [];
            }
            acc[nivel].push(ramo);
            return acc;
        }, {} as Record<number, CarreraMalla[]>);
    }, [malla]);

    const nivelesOrdenados = Object.keys(ramosPorNivel).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className={styles.mallaContainer}>
            {nivelesOrdenados.map(nivel => (
                <div className={styles.nivelColumn} key={nivel}>
                    <h3>Nivel {nivel}</h3>
                    <div className={styles.ramoList}>
                        {ramosPorNivel[parseInt(nivel)].map(ramo => (
                            <div className={styles.ramoCard} key={ramo.codigo}>
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