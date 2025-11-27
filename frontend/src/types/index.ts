// src/types/index.ts

// ============================================
// TIPOS DE RAMOS
// ============================================

export type RamoMalla = {
  codigo: string;
  asignatura: string;
  creditos: number;
  nivel: number;
  prereq: string;
};

export type RamoAvance = {
  nrc: string;
  period: string;
  student: string;
  course: string;
  excluded: boolean;
  inscriptionType: string;
  status: string;
};

export type RamoAvanceCompleto = {
  codigo: string;
  asignatura: string;
  creditos: number;
  nivel: number;
  status: string;
  nrc?: string;
  period?: string;
  prereq?: string;
};

// Tipo combinado de Malla + Avance
export type RamoCompleto = RamoMalla & {
  status?: string;
  nrc?: string;
  period?: string;
  aprobado?: boolean;
  inscrito?: boolean;
};

// ============================================
// TIPOS DE CARRERA
// ============================================

export interface Carrera {
  codigo: string;
  nombre: string;
  catalogo: string;
}

// ============================================
// TIPOS DE USUARIO
// ============================================

export interface User {
  rut: string;
  email: string;
  nombre?: string;
  carreras?: Carrera[];
}

// ============================================
// TIPOS DE PROYECCIÓN
// ============================================

export type PlanSemester = {
  semester: number;
  courses: Array<{
    codigo: string;
    asignatura?: string;
    creditos?: number;
  }>;
  totalCredits?: number;
};

export type SaveProjectionPayload = {
  rut: string;
  codigoCarrera: string;
  catalogo: string;
  tipo: 'manual' | 'recommended';
  plan: PlanSemester[];
  nombre_proyeccion?: string;
  createdAt?: string;
};

export type ValidationError = {
  tipo: string;
  semestre?: number;
  codigo?: string;
  nombre?: string;
  mensaje: string;
  faltantes?: string[];
};

export type ValidationWarning = {
  tipo: string;
  semestre?: number;
  codigo?: string;
  nombre?: string;
  mensaje: string;
};

export type ValidationResult = {
  valido: boolean;
  errores: ValidationError[];
  advertencias: ValidationWarning[];
  resumen: {
    totalErrores: number;
    totalAdvertencias: number;
    creditosMaxRegular: number;
    creditosMaxSobrecupo: number;
  };
};

export type ProjectionResponse = {
  ok: boolean;
  id?: number;
  missingAsignaturas?: string[];
  error?: string;
};

export type FavoriteProjection = {
  id_proyeccion: number;
  nombre_proyeccion: string;
  tipo: string;
  fecha_creacion: string;
  plan: PlanSemester[];
};

export type Proyeccion = {
  id_proyeccion: number;
  nombre_proyeccion: string;
  fecha_creacion: string;
  favorita: boolean;
  ItemProyeccion: ItemProyeccion[];
};

export type ItemProyeccion = {
  id_item_proyeccion: number;
  ano_proyectado: number;
  semestre_proyectado: number;
  Asignatura: Asignatura;
};

export type Asignatura = {
  id_asignatura: number;
  codigo_asignatura: string;
  nombre_asignatura: string;
  creditos: number;
};

// ============================================
// TIPOS DE PRERREQUISITOS
// ============================================

export type PrereqValidation = {
  valid: boolean;
  missingPrereqs: string[];
};

// ============================================
// TIPOS DE COMPONENTES
// ============================================

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red';
}

export interface ProgressChartProps {
  ramosAprobados: RamoAvanceCompleto[];
  ramosInscritos: RamoAvanceCompleto[];
  totalCreditos: number;
  creditosAprobados: number;
}

// ============================================
// TIPOS DE HOOKS
// ============================================

export interface UseMallaParams {
  codigoCarrera: string;
  catalogo: string;
}

export interface UseAvanceParams {
  rut: string;
  codigoCarrera: string;
  catalogo: string;
}

export interface UseMallaReturn {
  malla: RamoMalla[];
  isLoading: boolean;
  error: string | null;
  totalRamos: number;
  totalCreditos: number;
}

export interface UseAvanceReturn {
  ramosAprobados: RamoAvanceCompleto[];
  ramosInscritos: RamoAvanceCompleto[];
  isLoading: boolean;
  error: string | null;
  totalAprobados: number;
  totalInscritos: number;
}

// ============================================
// TIPOS DE API RESPONSES
// ============================================

export interface LoginResponse {
  token: string;
  expiresIn: string;
  rut: string;
  email: string;
  nombre?: string;
  carreras?: Carrera[];
}

export interface ValidateTokenResponse {
  valid: boolean;
  user: User;
}