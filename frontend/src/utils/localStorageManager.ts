import type { RamoExtend }  from '../components/Dashboard';

const STORAGE_KEYS = {
    AVANCE_CURRICULAR: 'cursoreo_avance_curricular',
    LAST_UPDATE: 'cursoreo_last_update'
} as const;

export interface AvanceCurricularData {
    rut: string;
    ramosInscritos: RamoExtend[];
    ramosAprobados: RamoExtend[];
    lastUpdate: string;
}

export function saveAvanceCurricular(data:AvanceCurricularData): void {
    try {
        localStorage.setItem(STORAGE_KEYS.AVANCE_CURRICULAR, JSON.stringify(data));
        localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
        
    } catch (error) {
        console.error('Error guardando avance curricular en localStorage:', error);
    }
}

export function getAvanceCurricular(rut: string): AvanceCurricularData | null {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.AVANCE_CURRICULAR);
        if (!data) return null;

        const parsed = JSON.parse(data) as AvanceCurricularData;
        if (parsed.rut !== rut) return null;

        return parsed;
    } catch (error) {
        console.error("Error obteniendo avance curricular de localStorage:", error);
        return null;
    }
}

export function clearAvanceCurricular(): void {
    localStorage.removeItem(STORAGE_KEYS.AVANCE_CURRICULAR);
    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATE);
}