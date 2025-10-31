import React from 'react';
import styles from './PlanVisualizer.module.css';

import type { PlanSemester } from '../utils/planner';

type PlanVisualizerProps = {
    plan: PlanSemester[];
};

const PlanVisualizer: React.FC<PlanVisualizerProps> = ({ plan }) => {
    if (!plan || plan.length === 0) {
        return <p>No se pudo generar un plan.</p>;
    }

    return (
        <div className={styles.planContainer}>
            {plan.map(semester => (
                <div className={styles.semesterColumn} key = {semester.semester}>
                    <h3>Semestre {semester.semester}</h3>
                    <p className={styles.semesterCredits}>Créditos: {semester.totalCredits}</p>
                    <div className={styles.ramosList}>
                        {semester.courses.map(ramo => (
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

export default PlanVisualizer;