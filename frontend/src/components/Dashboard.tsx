import React, { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import MallaVisualizer from "./MallaVisualizer";
import PlanVisualizer from "./PlanVisualizer";
import ProjectionSelector from "./ProjectionSelector"
import ManualProjection from './ManualProjection';
import { planSemesters } from "../utils/planner";
import type { Ramo as PlannerRamo, PlanSemester } from "../utils/planner";
import { saveAvanceCurricular, getAvanceCurricular } from "../utils/localStorageManager";
import { saveProjectionToServer } from "../api/projection";
import { authGet } from "../utils/authFetch";

// Types
export type RamoCompleto = {
  codigo: string;
  asignatura: string;
  creditos: number;
  nivel: number;
  status: string;
  nrc?: string;
  period?: string;
  prereq?: string | string[];
};

type Carrera = {
  nombre: string;
  codigo: string;
  catalogo: string;
};

type DashboardProps = {
  userData: {
    rut: string;
    email: string;
    carreras: Carrera[];
  };
  onLogout: () => void;
};

type ValidatedRamo = RamoCompleto & {
    validPrereqs: string[];
    originalPrereqs?: string | string[];
};

const falsePrereqs: string[] = [
    "DDOC-01184", "EAIN-01184", "UNFG-01183", "UNFG-01184", "UNFI-01001", 
    "UNFI-01184", "DDOC-00102", "DCTE-00002", "UNFG-02294", "DATE-00015", 
    "DCCB-00261", "DCTE-00002", "SSED-00202", "UNFV-00001", "UNFV-01001", 
    "UNFG-03294", "UNFV-03003", "ECIN-00805", "ECIN-08616", "ECIN-00512", 
    "ECIN-00618", "DAIS-00305", "ECIN-00301", "ECIN-00606", "ECIN-00700", 
    "ECIN-00703", "ECIN-00800", "ECIN-00803", "ECIN-00804", "ECIN-00806", 
    "ECIN-00808", "ECIN-00809", "ECIN-00901", "ECIN-00903", "ECIN-00905", 
    "ECIN-00907", "ECIN-00910", "ECIN-08606"
];

const Dashboard: React.FC<DashboardProps> = ({ userData, onLogout }) => {
  const [ramosInscritos, setRamosInscritos] = useState<RamoCompleto[]>([]);
  const [ramosAprobados, setRamosAprobados] = useState<RamoCompleto[]>([]);
  const [mallaCompleta, setMallaCompleta] = useState<RamoCompleto[]>([]);
  const [mallaCompleta2, setMallaCompleta2] = useState<RamoCompleto[]>([]);
  const [carreraActiva, setCarreraActiva] = useState<Carrera | null>(null);
  const [mostrarMalla, setMostrarMalla] = useState(false);
  const [mostrarPlan, setMostrarPlan] = useState(false);
   // Vista actual: 'malla', 'plan', 'inscritos'
  const [vistaActual, setVistaActual] = useState<'malla' | 'plan' | 'inscritos'>('inscritos');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanSemester[] | null>(null);
  const [planErrors, setPlanErrors] = useState<string[] | null>(null);
  const [manualPlan, setManualPlan] = useState<PlanSemester[] | null>(null);
  const [savingProjection, setSavingProjection] = useState(false);
  const [saveProjectionError, setSaveProjectionError] = useState<string | null>(null);


  const validateAndNormalizeMalla = (mallaData: RamoCompleto[]): ValidatedRamo[] => {
    // Create lookup map for quick code validation
    const codesMap = new Map(
        mallaData.map(r => [r.codigo.trim().toUpperCase(), r.asignatura])
    );

    // Debug log
    console.log('Validating malla prerequisites...');

    return mallaData.map(ramo => {
        // Convert prerequisites to array
        let prereqArray: string[] = [];
        if (ramo.prereq) {
            prereqArray = Array.isArray(ramo.prereq) 
                ? ramo.prereq 
                : ramo.prereq.split(',');
        }

        // Filter out false prerequisites and validate against malla
        const validPrereqs = prereqArray
            .map(p => p.trim().toUpperCase())
            .filter(p => {
                const isValid = codesMap.has(p) && !falsePrereqs.includes(p);
                if (!isValid) {
                    console.log(`Filtered out prerequisite ${p} for ${ramo.codigo}`);
                }
                return isValid;
            });

        // Store result with validation info
        return {
            ...ramo,
            validPrereqs,
            originalPrereqs: ramo.prereq
        };
    });
};

  useEffect(() => {
    const fetchDatosCompletos = async () => {
      try {
        const cached = getAvanceCurricular(userData.rut);
        if (cached) {
          setRamosAprobados(cached.ramosAprobados);
          setRamosInscritos(cached.ramosInscritos);
        }
        const carreraActual = userData.carreras[0];
        if (!carreraActual) {
          throw new Error("No se encontró una carrera para el usuario.");
        }
        setCarreraActiva(carreraActual);

        const res = await authGet(
          `http://localhost:3001/api/avance?rut=${userData.rut}&codcarrera=${carreraActual.codigo}&catalogo=${carreraActual.catalogo}`
        );
        
        if (!res.ok) {
          throw new Error("No se pudo obtener el avance curricular.");
        }

        const avanceCombinado: RamoCompleto[] = await res.json();
        
        const inscritos = avanceCombinado.filter(ramo => 
          ramo.status.trim().toUpperCase() === 'INSCRITO'
        );
        const aprobados = avanceCombinado.filter(ramo => 
          ramo.status.trim().toUpperCase() === 'APROBADO'
        );

        setRamosInscritos(inscritos);
        setRamosAprobados(aprobados);
        
        const resMalla = await authGet(
          `http://localhost:3001/api/mallas?codigoCarrera=${carreraActual.codigo}&catalogo=${carreraActual.catalogo}`
        );

        if (!resMalla.ok) {
          throw new Error("No se pudo obtener la malla curricular.");
        }

        const mallaData = await resMalla.json();
        const validatedMalla = validateAndNormalizeMalla(mallaData);
        setMallaCompleta(avanceCombinado);
        setMallaCompleta2(validatedMalla);

        saveAvanceCurricular({
        rut: userData.rut,
        ramosInscritos: inscritos,
        ramosAprobados: aprobados,
        lastUpdate: new Date().toISOString()
      });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatosCompletos();
  }, [userData]);

  const handleProyectionClick = () => {
    if (!carreraActiva || !mallaCompleta.length) return;

    const mallaPlanner: PlannerRamo[] = mallaCompleta.map(r => ({
      codigo: r.codigo.trim().toUpperCase(),
      asignatura: r.asignatura,
      creditos: r.creditos,
      nivel: r.nivel,
      prereq: Array.isArray(r.prereq) 
        ? r.prereq.map(p => p.trim().toUpperCase())
        : typeof r.prereq === 'string'
          ? r.prereq.split(',').map(p => p.trim().toUpperCase())
          : []
    }));

    const completedSet = new Set(
      ramosInscritos.map(r => r.codigo.trim().toUpperCase())
    );
    const aprobados = mallaCompleta
          .map(r => ({
            ...(r.status === 'INSCRITO' ? { ...r, status: 'APROBADO' } : r)
          })) 
          .filter(ramo => 
          ramo.status.trim().toUpperCase() === 'APROBADO'
        );
    const approvedSet = new Set(
      aprobados.map(r => r.codigo.trim().toUpperCase())
    );

    const { plan: computedPlan, remaining, errors } = planSemesters(
      mallaPlanner,
      completedSet,
      approvedSet,
      35
    );

    setPlan(computedPlan);
    setPlanErrors(errors.length ? errors : null);
    
    if (remaining.length) {
      setPlanErrors(prev => [
        ...(prev ?? []),
        `Ramos sin planificar: ${remaining.join(", ")}`
      ]);
    }

    setMostrarMalla(false);
  };

  const [selectedProjections, setSelectedProjections] = useState<string[]>([]);
  const [projectionsLoading, setProjectionsLoading] = useState(false);

  const handleProjectionSelect = async (selected: string[]) => {
    setSelectedProjections(selected);
    if (selected.length > 0){
      setProjectionsLoading(true);
      try {
        for (const key of selected) {
          const [codigo, catalogo] = key.split('-');
          await handleProyectionClick();
        }
      } catch (err) {
        console.error('Error generando proyecciones:', err);
      } finally {
        setProjectionsLoading(false);
      }
    }
  }

  const handleSaveRecommended = async (plan: PlanSemester[]) => {
    if (!carreraActiva) return;
    try {
      setSavingProjection(true);
      const token = localStorage.getItem('authToken');
      await saveProjectionToServer({
        rut: userData.rut,
        codigoCarrera: carreraActiva.codigo,
        catalogo: carreraActiva.catalogo,
        tipo: 'recommended',
        plan
      } as any, { token: token || undefined });
      alert('Proyección recomendada guardada');
    } catch (err: any) {
      console.error('Error guardando proyeccion: ' + (err.message ?? ''));
    } finally {
      setSavingProjection(false);
    }
  };

  const handleSaveFromManual = async (plan: PlanSemester[]) => {
    if (!carreraActiva) return;
    try {
      setSavingProjection(true);
      const token = localStorage.getItem('authToken');
      await saveProjectionToServer({
        rut: userData.rut,
        codigoCarrera: carreraActiva.codigo,
        catalogo: carreraActiva.catalogo,
        tipo: 'manual',
        plan
      } as any, { token: token || undefined });
      alert('Proyección manual guardada');
    } catch (err: any) {
      console.error('Error guardando proyeccion: ' + (err.message ?? ''));
    } finally {
      setSavingProjection(false);
    }
  };


console.log('Malla data check:', mallaCompleta);
const mallaParaProyeccion = mallaCompleta2.map(ramo => ({
    ...ramo,
    status: (ramo.status?.trim().toUpperCase() === 'INSCRITO') ? 'APROBADO' : (ramo.status || 'PENDIENTE')
}));
  return (
    <div className={styles.backWhite}>
      <div className={styles.blueBar}></div>
      <h1 className={styles.blackH1}>Área Personal</h1>

        <div className={styles.container}>
          <img
            src="./src/assets/profilepic.png"
            style={{ height: "110px" }}
            alt="Foto de perfil"
          />
          <div className={styles.infoDiv}>
            <p>{userData.rut || "RUT no disponible"}</p>
            <p>{userData.email}</p>
            <p>Universidad Católica del Norte</p>
            {carreraActiva && <p>Carrera Actual: {carreraActiva.nombre}</p>}
            <button className={styles.buttonLogout} onClick={onLogout}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className={styles.buttonDiv}>
          <button
            onClick={() => {
              if (vistaActual === 'plan') {
                setVistaActual('malla');
              } else if (vistaActual === 'malla') {
                setVistaActual('inscritos');
              } else {
                setVistaActual('malla');
              }
            }}
            className={styles.buttonEgreso}
          >
            {vistaActual === 'malla' ? "Ver Ramos Inscritos" : "Ver Malla Completa"}  
          </button>
          <button
            onClick={() => {
              handleProyectionClick();
              setVistaActual('plan');
            }}
            className={styles.buttonEgreso}
          >
            Planificación sugerida
          </button>
        </div>

        {planErrors && (
          <div style={{ color: "red" }}>
            {planErrors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        {vistaActual === 'plan' && plan && (
          <div className={styles.planContainer}>
            <h3>Plan sugerido</h3>
            <PlanVisualizer plan={plan} />
          </div>
        )}

        {vistaActual === 'malla' && carreraActiva && mallaCompleta.length > 0 ? (
            <MallaVisualizer malla={mallaCompleta} />
          ) : vistaActual === 'malla' ? (
            <p>Cargando o no se pudo encontrar la malla.</p>
        ) : vistaActual === 'inscritos' && (
          <div className={styles.ramoContainer}>
            <h3>Mis Ramos Inscritos</h3>
            {isLoading && <p>Cargando tus ramos...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {!isLoading && !error && ramosInscritos.length === 0 && (
              <p>No tienes ramos inscritos actualmente</p>
            )}

            {!isLoading && ramosInscritos.map((ramo) => (
              <div
                className={styles.ramo}
                key={`${ramo.codigo}-${ramo.nrc}`}
              >
                <h2>{ramo.asignatura}</h2>
                <p>{ramo.codigo}</p>
                <p>Estado: {ramo.status || "Sin Estado"}</p>
                <p>NRC: {ramo.nrc || "Sin NRC"}</p>
              </div>
            ))}
          </div>)
        }

      <div>
        <h2>Proyección Manual</h2>

        
        <ManualProjection
          availableCourses={mallaCompleta2}
          approvedCourses={new Set([...ramosAprobados,...ramosInscritos].map(r => r.codigo.trim().toUpperCase()))}
          maxCreditsPerSemester={30}
          onProjectionChange={setManualPlan}
          onSave={handleSaveFromManual}
        />
      </div>
    </div>
  );
};

export default Dashboard;