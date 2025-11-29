import React from 'react'
import type { FavoriteProjection } from '../../types';
import styles from './ProjectionCompare.module.css';
import ProjectionStats from './ProjectionStats';

interface Props {
    projections: FavoriteProjection[];
    mostrarStats: boolean;
}

const ProjectionCompare: React.FC<Props> = ({ projections, mostrarStats }) => {
    if (!projections || projections.length === 0) {
        return <div>No hay proyecciones disponibles</div>;
    }

    if(projections.length < 2) {
        return <div>Selecciona al menos 2 proyecciones para comparar</div>;
    }

    const allSemesters = Array.from(
    new Set(
      projections
        .filter(p => p.plan && Array.isArray(p.plan)) //Filtrar proyecciones válidas
        .flatMap(p => p.plan.map(s => s.semester))
    )
  ).sort((a, b) => a - b);

    const getCourseStatus = (codigo: string, semester: number, allProjections: FavoriteProjection[]) => {
    const appearances = allProjections.map(proj => {
      const found = proj.plan.find(s => 
        s.courses.some(c => c.codigo === codigo)
      );
      return found ? found.semester : null;
    }).filter(s => s !== null);

    // Si aparece en diferentes semestres, resaltar como "diferente"
    const uniqueSemesters = new Set(appearances);
    if (uniqueSemesters.size > 1) return 'different-semester';
    
    // Si no aparece en todas las proyecciones, es "único"
    if (appearances.length < allProjections.length) return 'unique';
    
    return 'normal';
  };

    return (
    <div className={styles.compareContainer}>
      <h2>Comparación de Proyecciones</h2>
      
      <div className={styles.projectionsGrid}>
        {projections.map((proj) => (
          <div key={proj.id_proyeccion} className={styles.projectionColumn}>
            <div className={styles.projectionHeader}>
              <h3>{proj.nombre_proyeccion}</h3>
              <span className={styles.date}>
                {new Date(proj.fecha_creacion).toLocaleDateString()}
              </span>
            </div>

            {mostrarStats ? (
              <ProjectionStats projection={proj} />
            ) : (

              allSemesters.map((semNum) => {
                const semester = proj.plan.find(s => s.semester === semNum);
                
                return (
                  <div key={semNum} className={styles.semesterBlock}>
                    <div className={styles.semesterHeader}>
                      Semestre {semNum}
                    </div>
                    {semester ? (
                      <div className={styles.courses}>
                        {semester.courses.map((course) => (
                          <div key={course.codigo} className={`${styles.courseCard} ${styles[getCourseStatus(course.codigo, semNum, projections)]}`}>
                            <div className={styles.courseCode}>{course.codigo}</div>
                            <div className={styles.courseName}>{course.asignatura}</div>
                            <div className={styles.courseCredits}>{course.creditos} cr</div>
                          </div>
                        ))}
                        <div className={styles.semesterTotal}>
                          Total: {semester.totalCredits} créditos
                        </div>
                      </div>
                    ) : (
                      <div className={styles.emptySemester}>-</div>
                    )}
                  </div>
                );
              })
            )}

            
          </div>
        ))}
      </div>
    </div>
  );

};

export default ProjectionCompare;