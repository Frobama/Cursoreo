import React from 'react'
import type { FavoriteProjection } from '../../types';
import styles from './ProjectionStats.module.css';

interface Props {
    projection: FavoriteProjection;
}

const ProjectionStats: React.FC<Props> = ({ projection }) => {
    const totalSemesters = projection.plan.length;
    const totalCredits = projection.plan.reduce((sum, sem) => sum + (sem.totalCredits || 0), 0);
    const avgCreditPerSemester = Math.round(totalCredits / totalSemesters);

    const maxSemester = projection.plan.reduce((max, sem) => 
        (sem.totalCredits || 0) > (max.totalCredits || 0) ? sem : max 
    );

    const minSemester = projection.plan.reduce((max, sem) => 
        (sem.totalCredits || 0) < (max.totalCredits || 0) ? sem : max 
    );

    const variance = projection.plan.reduce((sum, sem) => 
        sum + Math.pow((sem.totalCredits || 0) - avgCreditPerSemester, 2), 0
    ) / totalSemesters;
    const stdDev = Math.sqrt(variance);
    const isBalanced = stdDev < 5;

    return (
        <div className={styles.statsContainer}>
            <div className={styles.statCard}>
                <div className={styles.statValue}>{totalSemesters}</div>
                <div className={styles.statLabel}>Total semestres</div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statValue}>{avgCreditPerSemester}</div>
                <div className={styles.statLabel}>Créditos promedio por semestre</div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statValue}>S{maxSemester.semester} ({maxSemester.totalCredits})</div>
                <div className={styles.statLabel}>Semestre más cargado</div>
            </div>
            
            <div className={styles.statCard}>
                <div className={styles.statValue}>S{minSemester.semester} ({minSemester.totalCredits})</div>
                <div className={styles.statLabel}>Semestre menos cargado</div>
            </div>
            
            <div className={`${styles.statCard} ${isBalanced ? styles.balanced : styles.unbalanced}`}>
                <div className={styles.statValue}>
                {isBalanced ? '✓' : '⚠️'}
                </div>
                <div className={styles.statLabel}>
                {isBalanced ? 'Balanceada' : 'Desbalanceada'}
                </div>
            </div>
        </div>
    );
};

export default ProjectionStats;