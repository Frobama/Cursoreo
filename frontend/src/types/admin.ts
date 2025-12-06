export interface Profesor {
    rut: string;
    nombre: string;
    email: string;
    departamento?: string;
    rol: 'PROFESOR';
}

export interface AdminStats {
    totalEstudiantes: number;
    totalProyecciones: number;
    proyeccionesFavoritas: number;
    carrerasActivas: number;
}

export interface CourseProjection {
    asignatura: {
        codigo: string;
        nombre: string;
        creditos: number;
    };
    totalEstudiantes: number;
    estudiantes: {
        rut: string;
        email: string;
    }[];
}