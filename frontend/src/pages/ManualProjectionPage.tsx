import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLightBulb, HiCheckCircle } from 'react-icons/hi';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import { useMalla } from '../hooks/useMalla';
import { useAvance } from '../hooks/useAvance';
import { projectionService } from '../services/projection.service';
import type { SaveProjectionPayload, PlanSemester, RamoCompleto } from '../types';
import { planSemesters } from '../utils/planner'
import Loading from '../components/common/Loading';
import styles from './ManualProjectionPage.module.css';

const FALSE_PREREQS = [
  "DDOC-01184", "EAIN-01184", "UNFG-01183", "UNFG-01184", "UNFI-01001",
  "ECIN-00907", "ECIN-00910", "ECIN-08606"
];

interface PrereqValidation {
  canTake: boolean;
  missingPrereqs: Array<{
    codigo: string;
    nombre: string;
  }>;
}

const ManualProjectionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { carreraActiva } = useApp();
  
  const [proyeccionNombre, setProyeccionNombre] = useState('');
  const [currentSemesters, setCurrentSemesters] = useState(1);
  const [visibleSemesters, setVisibleSemesters] = useState(3);
  const [selectedCourses, setSelectedCourses] = useState<Map<number, Set<string>>>(new Map());
  const [semesterCredits, setSemesterCredits] = useState<Map<number, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxCreditsPerSemester = 30;
  const maxAbsoluteCredits = 35;

  const { malla, isLoading: mallaLoading } = useMalla({
    codigoCarrera: carreraActiva?.codigo || '',
    catalogo: carreraActiva?.catalogo || ''
  });

  const { ramosAprobados, ramosInscritos, isLoading: avanceLoading } = useAvance({
    rut: user?.rut || '',
    codigoCarrera: carreraActiva?.codigo || '',
    catalogo: carreraActiva?.catalogo || ''
  });

  const approvedCoursesSet = useMemo(() => {
    return new Set(ramosAprobados.map(r => r.codigo.trim().toUpperCase()));
  }, [ramosAprobados]);

  const allSelectedCourses = useMemo(() => {
        const all = new Set<string>();
        selectedCourses.forEach((coursesSet) => {  // ← Renombrar para claridad
            coursesSet.forEach(code => all.add(code));
        });
        return all;
    }, [selectedCourses]);

  // Filtrar ramos disponibles (no aprobados ni inscritos)
  const ramosDisponibles = useMemo(() => {
    return malla.filter(ramo =>
      !ramosAprobados.find(r => r.codigo === ramo.codigo) &&
      !ramosInscritos.find(r => r.codigo === ramo.codigo)
    );
  }, [malla, ramosAprobados, ramosInscritos]);

  useEffect(() => {
    if (ramosDisponibles.length > 0) {
      const maxNivel = Math.max(...ramosDisponibles.map(r => r.nivel || 1));
      setCurrentSemesters(Math.min(Math.max(1, maxNivel), 15));
    }
  }, [ramosDisponibles]);

  const loadMoreSemesters = useCallback(() => {
    setVisibleSemesters(prev => Math.min(prev + 3, currentSemesters));
  }, [currentSemesters]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= documentHeight - 200) {
        if (visibleSemesters < currentSemesters) {
          loadMoreSemesters();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleSemesters, currentSemesters, loadMoreSemesters]);

  const getValidPrereqs = (ramo: RamoCompleto): string[] => {
    if (!ramo.prereq || ramo.prereq === '-') return [];

    const prereqArray = ramo.prereq.split(',').map(p => p.trim().toUpperCase());
    const availableCodes = new Set(ramosDisponibles.map(r => r.codigo.trim().toUpperCase()));

    return prereqArray.filter(p =>
      availableCodes.has(p) && !FALSE_PREREQS.includes(p)
    );
  };


  const validatePrerequisites = (ramo: RamoCompleto, semester: number): PrereqValidation => {
    const validPrereqs = getValidPrereqs(ramo);

    if (validPrereqs.length === 0) {
      return { canTake: true, missingPrereqs: [] };
    }

    const missingPrereqs = validPrereqs
      .map(prereqCode => {
        const prereqRamo = ramosDisponibles.find(
          r => r.codigo.trim().toUpperCase() === prereqCode
        );
        return prereqRamo ? {
          codigo: prereqRamo.codigo,
          nombre: prereqRamo.asignatura
        } : null;
      })
      .filter((prereq): prereq is { codigo: string; nombre: string } => {
        if (!prereq) return false;

        const isApproved = approvedCoursesSet.has(prereq.codigo.trim().toUpperCase());
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

  const getAvailableCoursesForSemester = (semester: number): RamoCompleto[] => {
    return ramosDisponibles.filter(ramo => {
      // No mostrar si ya está seleccionado en otro semestre
      const isInOtherSemester = Array.from(selectedCourses.entries())
        .some(([sem, courses]) => sem !== semester && courses.has(ramo.codigo));
      
      if (isInOtherSemester) return false;

      // Validar prerrequisitos
      const { canTake } = validatePrerequisites(ramo, semester);
      return canTake;
    });
  };

  const calculateEfficientProjection = useCallback(() => {
    setIsCalculating(true);
    setError(null);

    try {
      const ramosPlannerFormat = ramosDisponibles.map(r => ({
        codigo: r.codigo,
        asignatura: r.asignatura,
        creditos: r.creditos,
        nivel: r.nivel,
        prereq: r.prereq
      }));

      const approvedSet = new Set(ramosAprobados.map(r => r.codigo));
      const inscriptedSet = new Set(ramosInscritos.map(r => r.codigo));

      const { plan, remaining, errors } = planSemesters(
        ramosPlannerFormat,
        inscriptedSet,
        approvedSet,
        maxCreditsPerSemester
      );

      if (errors.length > 0) {
        setError(`Errores en la planificación:\n${errors.join('\n')}`);
        console.error('Errores de planificación:', errors);
      }

      if (remaining.length > 0) {
        console.warn(`⚠️ ${remaining.length} ramos no pudieron ser planificados:`, remaining);
      }

      const newSelectedCourses = new Map<number, Set<string>>();
      const newSemesterCredits = new Map<number, number>();

      plan.forEach((semester) => {
        const semesterIndex = semester.semester - 1; // 0-indexed
        const courseCodes = new Set(semester.courses.map(c => c.codigo));
        newSelectedCourses.set(semesterIndex, courseCodes);
        newSemesterCredits.set(semesterIndex, semester.totalCredits);
      });

      setSelectedCourses(newSelectedCourses);
      setSemesterCredits(newSemesterCredits);
      setCurrentSemesters(Math.max(plan.length, 1));
      setVisibleSemesters(Math.min(plan.length, 3));

      const totalRamos = plan.reduce((sum, sem) => sum + sem.courses.length, 0);
      const message =
        `Proyección calculada exitosamente\n\n` +
        `Semestres necesarios: ${plan.length}\n` +
        `Total de ramos planificados: ${totalRamos}\n` +
        (remaining.length > 0 ? `Ramos sin planificar: ${remaining.length}` : '');

      alert(message);
    } catch (err) {
      setError('Error al calcular la proyección automática');
    } finally {
      setIsCalculating(false);
    }
  }, [ramosDisponibles, ramosAprobados, ramosInscritos, maxCreditsPerSemester]);

  const toggleCourse = (ramo: RamoCompleto, semester: number) => {
    const semesterSet = new Set(selectedCourses.get(semester) || []);
    const currentCredits = semesterCredits.get(semester) || 0;

    // Si ya está seleccionado, deseleccionar
    if (semesterSet.has(ramo.codigo)) {
      semesterSet.delete(ramo.codigo);
      setSemesterCredits(new Map(semesterCredits.set(
        semester,
        currentCredits - ramo.creditos
      )));
      setSelectedCourses(new Map(selectedCourses.set(semester, semesterSet)));
      return;
    }

    // Verificar si ya está en otro semestre
    const existingSelection = Array.from(selectedCourses.entries())
      .find(([sem, courses]) => sem !== semester && courses.has(ramo.codigo));

    if (existingSelection) {
      alert(`${ramo.asignatura} ya está seleccionado en el Semestre ${existingSelection[0] + 1}`);
      return;
    }

    // Validar límite absoluto de créditos
    if (currentCredits + ramo.creditos > maxAbsoluteCredits) {
      alert(`Excederías el límite absoluto de ${maxAbsoluteCredits} créditos por semestre.`);
      return;
    }

    // Advertencia de sobrecupo
    if (
      currentCredits + ramo.creditos > maxCreditsPerSemester &&
      currentCredits + ramo.creditos <= maxAbsoluteCredits
    ) {
      const confirmOvercredit = window.confirm(
        `⚠️ Advertencia: Estarías en sobrecupo\n\n` +
        `Créditos actuales: ${currentCredits}\n` +
        `Agregando: ${ramo.creditos}\n` +
        `Total: ${currentCredits + ramo.creditos} (límite normal: ${maxCreditsPerSemester})\n\n` +
        `¿Deseas continuar?`
      );
      if (!confirmOvercredit) return;
    }

    // Agregar el ramo
    semesterSet.add(ramo.codigo);
    setSemesterCredits(new Map(semesterCredits.set(
      semester,
      currentCredits + ramo.creditos
    )));
    setSelectedCourses(new Map(selectedCourses.set(semester, semesterSet)));
  };

  const buildPlan = (): PlanSemester[] => {
    const plan: PlanSemester[] = [];

    selectedCourses.forEach((codes, semester) => {
      const courses = Array.from(codes)
        .map(code => ramosDisponibles.find(r => r.codigo === code))
        .filter((c): c is RamoCompleto => c !== undefined)
        .map(c => ({
          codigo: c.codigo,
          asignatura: c.asignatura,
          creditos: c.creditos
        }));

      if (courses.length > 0) {
        plan.push({
          semester: semester + 1, // +1 porque internamente usamos 0-indexed
          courses,
          totalCredits: semesterCredits.get(semester) || 0
        });
      }
    });

    return plan.sort((a, b) => a.semester - b.semester);
  };

  const handleSave = async () => {
    const plan = buildPlan();

    if (plan.length === 0) {
      alert('La proyección está vacía. Agrega al menos un ramo.');
      return;
    }

    if (!user || !carreraActiva) {
      setError('Faltan datos de usuario o carrera');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: SaveProjectionPayload = {
        rut: user.rut,
        codigoCarrera: carreraActiva.codigo,
        catalogo: carreraActiva.catalogo,
        tipo: 'manual',
        plan,
        nombre_proyeccion: proyeccionNombre || `Proyección ${new Date().toLocaleDateString()}`
      };

      const response = await projectionService.saveProjection(payload);

      if (response.ok) {
        alert('Proyección guardada exitosamente');
        navigate('/proyeccion');
      } else {
        setError(response.error || 'Error al guardar la proyección');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la proyección');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSemester = () => {
    if (currentSemesters < 15) {
      setCurrentSemesters(prev => prev + 1);
    }
  };

  if (mallaLoading || avanceLoading) {
    return <Loading message="Cargando datos..." />;
  }

  if (!carreraActiva) {
    return (
      <div className={styles.error}>
        <h2>No hay carrera seleccionada</h2>
        <p>Por favor, selecciona una carrera para crear una proyección.</p>
      </div>
    );
  }

  return (
    <div className={styles.projectionPage}>
      <div className={styles.header}>
        <h1>Crear Proyección Manual</h1>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      <div className={styles.formSection}>
        <label htmlFor="nombre">Nombre de la Proyección</label>
        <input
          id="nombre"
          type="text"
          value={proyeccionNombre}
          onChange={(e) => setProyeccionNombre(e.target.value)}
          placeholder="Ej: Proyección Primer Semestre 2025"
          className={styles.input}
        />
      </div>

      <div className={styles.autoProjectionSection}>
        <button
          onClick={calculateEfficientProjection}
          disabled={isCalculating || ramosDisponibles.length === 0}
          className={styles.autoBtn}
        >
          {isCalculating ? 'Calculando...' : 'Calcular Proyección Más Eficiente'}
        </button>
        <p className={styles.autoInfo}>
          El sistema calculará automáticamente la proyección más eficiente respetando prerrequisitos
          y optimizando la cantidad de semestres, para que la fecha de egreso sea lo antes posible.
        </p>
      </div> 

      <div className={styles.info}>
        <p><HiLightBulb style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Solo se muestran los ramos que puedes tomar en cada semestre según tus prerrequisitos.</p>
      </div>

      <div className={styles.semestersContainer}>
        {Array.from({ length: visibleSemesters }, (_, index) => {
          const semester = index;
          const credits = semesterCredits.get(semester) || 0;
          const selectedInThisSemester = selectedCourses.get(semester) || new Set();
          const availableCourses = getAvailableCoursesForSemester(semester);

          return (
            <div key={semester} className={styles.semesterCard}>
              <div className={styles.semesterHeader}>
                <h3>Semestre {semester + 1}</h3>
                <div className={styles.creditCounter}>
                  <span className={credits > maxCreditsPerSemester ? styles.overcredit : ''}>
                    {credits} / {maxCreditsPerSemester} créditos
                  </span>
                  {credits > maxCreditsPerSemester && (
                    <span className={styles.overcreditBadge}>Sobrecupo</span>
                  )}
                </div>
              </div>

              {availableCourses.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No hay ramos disponibles para este semestre</p>
                  <small>
                    {selectedInThisSemester.size > 0 
                      ? 'Has seleccionado todos los ramos disponibles'
                      : 'Todos los ramos pendientes requieren prerrequisitos previos'
                    }
                  </small>
                </div>
              ) : (
                <div className={styles.coursesGrid}>
                  {availableCourses.map(ramo => {
                    const isSelected = selectedInThisSemester.has(ramo.codigo);

                    return (
                      <button
                        key={ramo.codigo}
                        className={`
                          ${styles.courseButton}
                          ${isSelected ? styles.selected : ''}
                        `}
                        onClick={() => toggleCourse(ramo, semester)}
                        title={`${ramo.codigo} - ${ramo.creditos} créditos${
                          ramo.prereq && ramo.prereq !== '-' 
                            ? `\nPrerrequisitos: ${ramo.prereq}` 
                            : ''
                        }`}
                      >
                        <div className={styles.courseName}>{ramo.asignatura}</div>
                        <div className={styles.courseInfo}>
                          <span className={styles.courseCredits}>{ramo.creditos} cr</span>
                          <span className={styles.courseCode}>{ramo.codigo}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedInThisSemester.size > 0 && (
                <div className={styles.selectedSummary}>
                  <strong>Seleccionados:</strong> {selectedInThisSemester.size} ramos
                </div>
              )}
            </div>
          );
        })}

        {visibleSemesters < currentSemesters && (
          <button onClick={loadMoreSemesters} className={styles.loadMoreBtn}>
            Cargar más semestres ({visibleSemesters} de {currentSemesters})
          </button>
        )}

        {currentSemesters < 15 && (
          <button onClick={handleAddSemester} className={styles.addSemesterBtn}>
            + Agregar Semestre
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleSave}
          disabled={isSaving || buildPlan().length === 0}
          className={styles.saveBtn}
        >
          {isSaving ? 'Guardando...' : '💾 Guardar Proyección'}
        </button>
      </div>

      {isSaving && (
        <div className={styles.savingOverlay}>
          <div className={styles.savingModal}>
            <Loading />
            <p className={styles.savingText}>Guardando proyección...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualProjectionPage;