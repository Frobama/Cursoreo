import React, { useState } from 'react';
import styles from './PlanVisualizer.module.css';
import SaveProjectionModal from './SaveProjectionModal';
import HamburgerMenu from './HamburgerMenu';

import type { PlanSemester } from '../utils/planner';

type PlanVisualizerProps = {
    plan: PlanSemester[];
    userData?: { rut: string };
    carrera?: { codigo: string; catalogo: string } | null;
};

const PlanVisualizer: React.FC<PlanVisualizerProps> = ({ plan, userData, carrera }) => {
    const [showSaveModal, setShowSaveModal] = useState(false);

    if (!plan || plan.length === 0) {
        return <p>No se pudo generar un plan.</p>;
    }

    return (
        <>
            <div className={styles.planContainer}>
                <HamburgerMenu />
                <div className={styles.planHeader}>
                    <h2>Plan de Egreso Sugerido</h2>
                    {userData && (
                        <button
                            className={styles.saveButton}
                            onClick={() => setShowSaveModal(true)}
                            title="Guardar esta proyección"
                        >
                            💾 Guardar Proyección
                        </button>
                    )}
                </div>

                <div className={styles.semetersGrid}>
                    {plan.map(semester => (
                        <div className={styles.semesterColumn} key={semester.semester}>
                            <div className={styles.semesterHeader}>
                                <h3>Semestre {semester.semester}</h3>
                                <p className={styles.semesterCredits}>
                                    {semester.totalCredits} cr
                                </p>
                            </div>
                            <div className={styles.ramosList}>
                                {semester.courses.map(ramo => (
                                    <div className={styles.ramoCard} key={ramo.codigo}>
                                        <div className={styles.ramoCardContent}>
                                            <p className={styles.ramoNombre}>
                                                {ramo.asignatura}
                                            </p>
                                            <p className={styles.ramoCodigo}>{ramo.codigo}</p>
                                            <p className={styles.ramoCreditos}>
                                                {ramo.creditos} créditos
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {userData && showSaveModal && (
                <SaveProjectionModal
                    plan={plan}
                    userData={userData}
                    carrera={carrera ?? null}
                    onClose={() => setShowSaveModal(false)}
                    onSaved={() => {
                        // Aquí puedes actualizar lista de proyecciones si lo deseas
                    }}
                />
            )}
        </>
    );
};

export default PlanVisualizer;