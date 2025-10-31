import React, { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import MallaVisualizer from "./MallaVisualizer";
import PlanVisualizer from "./PlanVisualizer";
import { planSemesters } from "../utils/planner";
import type { Ramo as PlannerRamo, PlanSemester } from "../utils/planner";
import {
  saveAvanceCurricular,
  getAvanceCurricular,
} from "../utils/localStorageManager";

// --- TIPOS DE DATOS ---
export type RamoCompleto = {
  codigo: string;
  asignatura: string;
  creditos: number;
  nivel: number;
  status: string;
  nrc?: string;
  period?: string;
  prereq?: string | string[]; // Añadido para compatibilidad con planner
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

const Dashboard: React.FC<DashboardProps> = ({ userData, onLogout }) => {
  const [ramosInscritos, setRamosInscritos] = useState<RamoCompleto[]>([]);
  const [ramosAprobados, setRamosAprobados] = useState<RamoCompleto[]>([]);
  const [mallaCompleta, setMallaCompleta] = useState<RamoCompleto[]>([]);
  const [carreraActiva, setCarreraActiva] = useState<Carrera | null>(null);
  const [mostrarMalla, setMostrarMalla] = useState(false);
  const [mostrarPlan, setMostrarPlan] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanSemester[] | null>(null);
  const [planErrors, setPlanErrors] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchDatosCompletos = async () => {
      try {
        const carreraActual = userData.carreras.length > 0 ? userData.carreras[0] : null;
        if (!carreraActual) {
          throw new Error("No se encontró una carrera para el usuario.");
        }
        setCarreraActiva(carreraActual);

        const res = await fetch(
          `http://localhost:3001/api/avance?rut=${userData.rut}&codcarrera=${carreraActual.codigo}&catalogo=${carreraActual.catalogo}`
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "No se pudo obtener el avance curricular combinado.");
        }

        const avanceCombinado: RamoCompleto[] = await res.json();
        console.log("Avance combinado: ", avanceCombinado)
        const inscritos = avanceCombinado.filter(ramo => ramo.status === 'INSCRITO');
        const aprobados = avanceCombinado.filter(ramo => ramo.status === 'APROBADO');

        setRamosInscritos(inscritos);
        setRamosAprobados(aprobados);
        setMallaCompleta(avanceCombinado);

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
    const malla = mallaCompleta;
    
    console.log("Malla para planificar:", malla);

    // convertir la malla al tipo que espera el planner
    const mallaPlanner: PlannerRamo[] = malla.map((r) => {
      const raw = r.prereq;
      let prereqArr: string[] = [];
      if (Array.isArray(raw)) {
        prereqArr = raw
          .map((s: any) => String(s).trim().toUpperCase())
          .filter(Boolean);
      } else if (typeof raw === "string" && raw.trim() !== "") {
        prereqArr = raw
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
      }

      return {
        codigo: r.codigo.trim().toUpperCase(),
        asignatura: r.asignatura,
        creditos: r.creditos,
        nivel: r.nivel,
        prereq: prereqArr,
      } as PlannerRamo;
    });

    const completedSet = new Set<string>(
      ramosInscritos.map((r) => r.codigo.trim().toUpperCase())
    );
    const approvedSet = new Set<string>(
      ramosAprobados.map((r) => r.codigo.trim().toUpperCase())
    );

    const {
      plan: computedPlan,
      remaining,
      errors,
    } = planSemesters(mallaPlanner, completedSet, approvedSet, 30);
    setPlan(computedPlan);
    setPlanErrors(errors.length ? errors : null);
    if (remaining.length) {
      setPlanErrors((prev) => [
        ...(prev ?? []),
        `Quedan sin planificar: ${remaining.join(", ")}`,
      ]);
    }
    setMostrarMalla(false);
  };

  return (
    <>
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
            onClick={() => setMostrarMalla(!mostrarMalla)}
            className={styles.buttonEgreso}
          >
            {mostrarMalla ? "Ver Ramos Inscritos" : "Ver Malla Completa"}
          </button>
          <button
            onClick={() => {handleProyectionClick(); setMostrarPlan(!mostrarPlan)}}
            className={styles.buttonEgreso}
          >
            Proyectar egreso
          </button>
        </div>

        {planErrors && (
          <div style={{ color: "red" }}>
            {planErrors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        {plan && mostrarPlan && (
          <div>
            <h2 style={{ textAlign: 'center', marginTop: '30px'}}> Plan de Egreso Sugerido</h2>
            <PlanVisualizer plan={plan} />
          </div>
        )}

        {!mostrarPlan && mostrarMalla ? (
          carreraActiva && mallaCompleta.length > 0 ? (
            <MallaVisualizer malla={mallaCompleta} />
          ) : (
            <p>Cargando o no se pudo encontrar la malla.</p>
          )
        ) : !mostrarPlan && (
          <div className={styles.ramoContainer}>
            <h3>Mis Ramos Inscritos</h3>
            {isLoading && <p>Cargando tus ramos...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {!isLoading && !error && ramosInscritos.length === 0 && (
              <p>No tienes ramos inscritos actualmente</p>
            )}

            {ramosInscritos.map((ramo) => (
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
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;