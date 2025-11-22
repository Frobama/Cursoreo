import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useMalla } from '../hooks/useMalla';
import { useAvance } from '../hooks/useAvance';
import { useAuth } from '../hooks/useAuth';
import MallaVisualizer from '../components/malla/MallaVisualizer';
import Loading from '../components/common/Loading';
import { type RamoCompleto } from '../types';
import styles from './MallaPage.module.css';


const MallaPage = () => {
    const { user } = useAuth();
    const { carreraActiva } = useApp();
    const [selectedRamo, setSelectedRamo] = useState<RamoCompleto | null>(null);

    const { malla, isLoading: mallaLoading, error: mallaError } = useMalla({
        codigoCarrera: carreraActiva?.codigo || '',
        catalogo: carreraActiva?.catalogo || ''
    });

    const {
        ramosAprobados,
        ramosInscritos,
        isLoading: avanceLoading
    } = useAvance({
        rut: user?.rut || '',
        codigoCarrera: carreraActiva?.codigo || '',
        catalogo: carreraActiva?.catalogo || ''
    });

    const handleRamoClick = (ramo: RamoCompleto) => {
        setSelectedRamo(ramo);
    };

    const closeModal = () => {
        setSelectedRamo(null);
    };

    if (mallaLoading || avanceLoading) {
        return <Loading message="Cargando malla curricular..." />;
    }

    if (mallaError) {
        return (
            <div className={styles.error}>
                <h2>Error al cargar la malla</h2>
                <p>{mallaError}</p>
            </div>
        );
    }

    if (!carreraActiva) {
        return (
        <div className={styles.noCarrera}>
            <h2>No hay carrera seleccionada</h2>
            <p>Por favor, selecciona una carrera desde el selector superior.</p>
        </div>
        );
    }

    // Convertir arrays a Sets para MallaVisualizer
    const aprobadosSet = new Set(ramosAprobados.map(r => r.codigo));
    const inscritosSet = new Set(ramosInscritos.map(r => r.codigo));

    // Combinar malla con status de avance
    const mallaCompleta: RamoCompleto[] = malla.map(ramoMalla => {
        const codigo = ramoMalla.codigo;
        const aprobado = ramosAprobados.find(r => r.codigo === codigo);
        const inscrito = ramosInscritos.find(r => r.codigo === codigo);

        return {
        ...ramoMalla,
        status: aprobado ? 'APROBADO' : inscrito ? 'INSCRITO' : 'PENDIENTE',
        nrc: inscrito?.nrc,
        period: inscrito?.period || aprobado?.period,
        aprobado: !!aprobado,
        inscrito: !!inscrito
        };
    });

    return (
        <div className={styles.mallaPage}>
        <div className={styles.header}>
            <h1>Malla Curricular</h1>
            <p className={styles.carreraInfo}>
            {carreraActiva.nombre} - Catálogo {carreraActiva.catalogo}
            </p>
        </div>

        <div className={styles.stats}>
            <div className={styles.statItem}>
            <span className={styles.statLabel}>Total de Ramos:</span>
            <span className={styles.statValue}>{malla.length}</span>
            </div>
            <div className={styles.statItem}>
            <span className={styles.statLabel}>Aprobados:</span>
            <span className={styles.statValue}>{ramosAprobados.length}</span>
            </div>
            <div className={styles.statItem}>
            <span className={styles.statLabel}>Inscritos:</span>
            <span className={styles.statValue}>{ramosInscritos.length}</span>
            </div>
            <div className={styles.statItem}>
            <span className={styles.statLabel}>Pendientes:</span>
            <span className={styles.statValue}>
                {malla.length - ramosAprobados.length - ramosInscritos.length}
            </span>
            </div>
        </div>

        <div className={styles.legend}>
            <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.aprobado}`}></div>
            <span>Aprobado</span>
            </div>
            <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.inscrito}`}></div>
            <span>Inscrito</span>
            </div>
            <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.pendiente}`}></div>
            <span>Pendiente</span>
            </div>
        </div>

        <MallaVisualizer
            malla={mallaCompleta}
            ramosAprobados={aprobadosSet}
            ramosInscritos={inscritosSet}
            onRamoClick={handleRamoClick}
        />

        {/* Modal de detalle del ramo */}
        {selectedRamo && (
            <div className={styles.modal} onClick={closeModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={closeModal}>×</button>
                <h2>{selectedRamo.asignatura}</h2>
                <div className={styles.modalBody}>
                <p><strong>Código:</strong> {selectedRamo.codigo}</p>
                <p><strong>Créditos:</strong> {selectedRamo.creditos}</p>
                <p><strong>Nivel:</strong> {selectedRamo.nivel}</p>
                <p><strong>Estado:</strong> {selectedRamo.status}</p>
                {selectedRamo.prereq && (
                    <p><strong>Prerrequisitos:</strong> {selectedRamo.prereq}</p>
                )}
                {selectedRamo.nrc && (
                    <p><strong>NRC:</strong> {selectedRamo.nrc}</p>
                )}
                {selectedRamo.period && (
                    <p><strong>Período:</strong> {selectedRamo.period}</p>
                )}
                </div>
            </div>
            </div>
        )}
        </div>
    );
};

export default MallaPage;