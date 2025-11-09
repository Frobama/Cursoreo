import React, { useState, useEffect } from 'react';
import { type Ramo, type PlanSemester } from '../utils/planner';
import styles from './ManualProjection.module.css';

type props = {
    availableCourses: Ramo[];
    approvedCourses: Set<string>;
    maxCreditsPerSemester?: number;
    onProjectionChange: (plan: PlanSemester[]) => void;
};

type PrereqValidation = {
    canTake: boolean;
    missingPrereqs: Array<{
        codigo: string;
        nombre: string;
    }>;
}

const falsePrereqs: string[] = [
    "DDOC-01184", "EAIN-01184", "UNFG-01183", "UNFG-01184", "UNFI-01001", 
    "ECIN-00907", "ECIN-00910", "ECIN-08606"
];

const ManualProjection: React.FC<props> = ({availableCourses, approvedCourses, maxCreditsPerSemester = 30, onProjectionChange}) => {
    const initialSemesters = Math.min(
        Math.max(1, Math.max(...availableCourses.map(c => c.nivel || 1))),
        15
    );
    const [currentSemesters, setCurrentSemesters] = useState<number>(initialSemesters);
    const [selectedCourses, setSelectedCourses] = useState<Map<number, Set<string>>>(new Map());
    const [semesterCredits, setSemesterCredits ] = useState<Map<number, number>>(new Map());
    const [allSelectedCourses, setAllSelectedCourses] = useState<Set<string>>(new Set());


    const getValidPrereqs = (course: Ramo): string[] => {
        if (!course.prereq) return [];
        
        const prereqArray = Array.isArray(course.prereq) 
            ? course.prereq 
            : course.prereq.split(',');

        const availableCodes = new Set(
            availableCourses.map(c => c.codigo.trim().toUpperCase())
        );

        return prereqArray
            .map(p => p.trim().toUpperCase())
            .filter(p => availableCodes.has(p) && !falsePrereqs.includes(p));
    };

    const validatePrerequisites = (course: Ramo, semester: number): PrereqValidation => {
        const validPrereqs = getValidPrereqs(course);
        
        if (validPrereqs.length === 0) {
            return { canTake: true, missingPrereqs: [] };
        }

        const missingPrereqs = validPrereqs
        .map(prereq => {
            const prereqCourse = availableCourses.find(
                c => c.codigo.trim().toUpperCase() === prereq
            );
            return prereqCourse ? {
                codigo: prereqCourse.codigo,
                nombre: prereqCourse.asignatura
            } : null;
        })
        
        .filter((prereq): prereq is {codigo: string, nombre: string} => {
            if(!prereq) return false;
            const isApproved = approvedCourses.has(prereq.codigo);
            const isSelectedBefore = Array.from({ length: semester }).some((_, i) => 
                selectedCourses.get(i)?.has(prereq.codigo)
            );
            return !isApproved && !isSelectedBefore;
        });

        return {
            canTake: missingPrereqs.length === 0,
            missingPrereqs
        };
    };


    const canTakeCourse = (course: Ramo, semester: number): boolean => {
        return validatePrerequisites(course, semester).canTake;
    };


    const wouldExceedCredits = (course: Ramo, semester: number) => {
        const currentCredits = semesterCredits.get(semester) || 0;
        return (currentCredits + course.creditos) > maxCreditsPerSemester;
    };

    const toggleCourse = (course: Ramo, semester: number) => {
        console.group(`Toggling ${course.codigo} in semester ${semester}`);

        const semesterSet = selectedCourses.get(semester) || new Set();
        const currentCredits = semesterCredits.get(semester) || 0;    

        if(semesterSet.has(course.codigo)) {
            semesterSet.delete(course.codigo);
            setSemesterCredits(new Map(semesterCredits.set(
                semester,
                currentCredits - course.creditos
            )));
            setAllSelectedCourses(prev => {
                const next = new Set(prev);
                next.delete(course.codigo);
                return next;
            });
        } else {
            const existingSelection = Array.from(selectedCourses.entries())
                .find(([sem, courses]) => sem !== semester && courses.has(course.codigo));
            
            if (existingSelection) {
                alert(`${course.asignatura} ya está seleccionado en el semestre ${existingSelection[0] + 1}`);
                console.groupEnd();
                return;
            }
            
            console.groupEnd();

            const { canTake, missingPrereqs } = validatePrerequisites(course, semester);
            
            if (!canTake) {
                alert(`No puedes tomar ${course.asignatura}. Faltan prerrequisitos:\n${missingPrereqs.map(p => `- ${p.codigo} (${p.nombre})`).join('\n')}`);
                return;
            }

            if ((currentCredits + course.creditos) > 35) {
                alert(`Excederías el límite de 35 créditos por semestre`);
                return;
            }
            
            if ((currentCredits + course.creditos) > maxCreditsPerSemester && (currentCredits + course.creditos) < 36) {
                const confirmOvercredit = window.confirm(
                    `Advertencia: Agregarías ${course.creditos} créditos llegando a
                    ${currentCredits + course.creditos} créditos (sobrecupo) \n\n¿Deseas continuar?`
                );
                if(!confirmOvercredit) {
                    return;
                }
            }

            semesterSet.add(course.codigo);
            setSemesterCredits(new Map(semesterCredits.set(
                semester,
                currentCredits + course.creditos
            )));
            setAllSelectedCourses(prev => new Set([...prev, course.codigo]));
        }

        setSelectedCourses(new Map(selectedCourses.set(semester, semesterSet)));
    };

    useEffect(() => {
        const plan: PlanSemester[] = [];
        selectedCourses.forEach((codes,semester) => {
            const courses = Array.from(codes)
            .map(code => availableCourses.find(c => c.codigo === code))
            .filter((c): c is Ramo => c !== undefined);

            plan.push({
                semester,
                courses,
                totalCredits: semesterCredits.get(semester) || 0
            });
        });
        onProjectionChange(plan.sort((a,b) => a.semester - b.semester));
    }, [selectedCourses, semesterCredits, availableCourses, onProjectionChange]);

    return (
        <div className={styles.container}>
            {Array.from({length: Math.min(currentSemesters, 15) }, (_, idx) => {
                const semester = idx +1;
                return (
                    <div className={styles.semester} key={semester}>
                        <h3>Semestre {semester}</h3>
                        <div className={styles.creditCounter}>
                            Créditos: {semesterCredits.get(semester) || 0}/{maxCreditsPerSemester}
                            {(semesterCredits.get(semester) || 0) > maxCreditsPerSemester && (
                                <span className={styles.overcredit}> (Sobrecupo) </span>
                            )}
                        </div>
                        <div className={styles.courseGrid}>
                            {availableCourses
                                .filter(c => !approvedCourses.has(c.codigo))
                                .map(course => {
                                    const validation = validatePrerequisites(course, semester);
                                    const isSelected = selectedCourses.get(semester)?.has(course.codigo);
                                    const currentCredits = semesterCredits.get(semester) || 0;
                                    const wouldExceedCredits = (currentCredits + course.creditos) > maxCreditsPerSemester
                                    const isSelectedInOtherSemester = Array.from(selectedCourses.entries())
                                        .some(([sem, courses]) => sem !== semester && courses.has(course.codigo));

                                    return(
                                        <button
                                            key={course.codigo}
                                            className={`
                                            ${styles.courseButton}
                                            ${isSelected ? styles.selected : ''}
                                            ${!validation.canTake ? styles.disabled : ''}
                                            ${isSelectedInOtherSemester ? styles.duplicate : ''}
                                        `}
                                        disabled={(!validation.canTake || isSelectedInOtherSemester) && !isSelected} 
                                        onClick={() => toggleCourse(course, semester)}
                                        title={validation.missingPrereqs.length > 0
                                            ? `Prerrequisitos faltantes:\n
                                            ${validation.missingPrereqs
                                                .map(p => `${p.codigo} (${p.nombre})`)
                                                .join('\n')
                                            }`
                                            : `${course.codigo} - ${course.creditos} créditos`
                                        }
                                    >
                                        {isSelectedInOtherSemester && (
                                            <small className={styles.warning}>
                                                Ya seleccionado en otro semestre
                                            </small>
                                        )}
                                        <div>{course.asignatura}</div>
                                        <small>{course.creditos} cr.</small>
                                        
                                        {/** 
                                        {validation.missingPrereqs.length > 0 && (
                                            <small className={styles.prereqWarning}>
                                                Faltan {
                                                    validation.missingPrereqs
                                                    .map(p => `${p.codigo} (${p.nombre})`)
                                                    .join(', ')}
                                            </small>
                                        )}
                                        */}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {currentSemesters < 15 && (
                <button
                    onClick={() => setCurrentSemesters(prev => prev + 1)}
                    className={styles.addSemesterButton}
                    >
                    Agregar semestre
                </button>
            )}
            
        </div>
    );
};

export default ManualProjection;