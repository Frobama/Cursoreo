import React from 'react';
import type { FavoriteProjection } from '../../types';
import styles from './ProjectionDetailModal.module.css';

interface Props {
    projection: FavoriteProjection | null;
    isOpen: boolean;
    onClose: () => void;
    onMarkAsFavorite: (id: number) => void;
    isFavorite: boolean;
    isLoading?: boolean;
}

const ProjectionDetailModal: React.FC<Props> = ({ 
    projection,
    isOpen,
    onClose,
    onMarkAsFavorite,
    isFavorite,
    isLoading = false
}) => {
    if (!isOpen || !projection) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2>{projection.nombre_proyeccion}</h2>
                        <p className={styles.date}>
                            Creada: {new Date(projection.fecha_creacion).toLocaleDateString()}
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        X
                    </button>
                </div>

                <div className={styles.actions}>
                    <button
                        className={`${styles.favoriteBtn} ${isFavorite ? styles.isFavorite : ''} ${isLoading ? styles.loading : ''}`}
                        onClick={() => onMarkAsFavorite(projection.id_proyeccion)}
                        disabled={isLoading}  // ✅ Deshabilitar mientras carga
                    >
                        {isLoading ? (
                        <>
                            <span className={styles.spinner}></span>
                            Guardando...
                        </>
                        ) : (
                        isFavorite ? '⭐ Favorita' : '☆ Marcar como favorita'
                        )}
                    </button>
                </div>

                <div className={styles.content}>
                    <h3>Plan de Estudios</h3>
                    <div className={styles.semesters}>
                        {projection.plan.map((sem) => (
                            <div key={sem.semester} className={styles.semester}>
                                <div className={styles.semesterHeader}>
                                    <h4>Semestre {sem.semester}</h4>
                                    <span className={styles.credits}>{sem.totalCredits}</span>
                                </div>
                                <div className={styles.courses}>
                                    {sem.courses.map((course) => (
                                        <div key={course.codigo} className={styles.courseCard}>
                                        <div className={styles.courseCode}>{course.codigo}</div>
                                        <div className={styles.courseName}>{course.asignatura}</div>
                                        <div className={styles.courseCredits}>{course.creditos} créditos</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.summary}>
                    <div className={styles.stat}>
                        <strong>{projection.plan.length}</strong>
                        <span>Semestres</span>
                    </div>
                    <div className={styles.stat}>
                        <strong>
                        {projection.plan.reduce((sum, s) => sum + (s.totalCredits || 0), 0)}
                        </strong>
                        <span>Total Créditos</span>
                    </div>
                    <div className={styles.stat}>
                        <strong>
                        {projection.plan.reduce((sum, s) => sum + s.courses.length, 0)}
                        </strong>
                        <span>Total Ramos</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectionDetailModal;