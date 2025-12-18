import React from 'react';
import { HiStar } from 'react-icons/hi';
import type { FavoriteProjection } from '../../types';
import styles from './FavoriteProjectionCard.module.css';

interface Props {
  projection: FavoriteProjection | null;
}

const FavoriteProjectionCard: React.FC<Props> = ({ projection }) => {
  if (!projection) return null;

  return (
    <div className={styles.favoriteCard}>
      <div className={styles.header}>
        <h2 className={styles.headerWithIcon}><HiStar /> Proyección Favorita</h2>
        <h3>{projection.nombre_proyeccion}</h3>
        <div className={styles.date}>
          Creada: {new Date(projection.fecha_creacion).toLocaleDateString()}
        </div>
      </div>
      
      <div className={styles.semesters}>
        {projection.plan.map((sem) => (
          <div key={sem.semester} className={styles.semester}>
            <div className={styles.semesterHeader}>
              <h4>Semestre {sem.semester}</h4>
              <span className={styles.credits}>{sem.totalCredits} créditos</span>
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
  );
};

export default FavoriteProjectionCard;