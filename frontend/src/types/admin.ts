
export interface Profesor {
    rut: string;
    nombre: string;
    email: string;
    departamento?: string;
    rol?: string;
}

export type CourseProjection = {
    codigo: string;
    nombre: string;
    count: number;
}

export type AdminStats = {
    totalEstudiantes: number;
    totalProyecciones: number;
    proyeccionesFavoritas: number;
    carrerasActivas: number;
    topCourses?: CourseProjection[];
}

export default {};