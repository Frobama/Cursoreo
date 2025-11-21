import React, { useState } from 'react';
import styles from './SaveProjectionModal.module.css';
import type { PlanSemester } from '../utils/planner';

type SaveProjectionModalProps = {
  plan: PlanSemester[] | null;
  userData: { rut: string };
  carrera?: { codigo: string; catalogo: string } | null;
  onClose: () => void;
  onSaved?: () => void;
};

const SaveProjectionModal: React.FC<SaveProjectionModalProps> = ({
  plan,
  userData,
  carrera,
  onClose,
  onSaved
}) => {
  const [nombreProyeccion, setNombreProyeccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!nombreProyeccion.trim()) {
      setError('Por favor ingresa un nombre para la proyección');
      return;
    }

    if (!plan || plan.length === 0) {
      setError('No hay plan para guardar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!carrera || !carrera.codigo || !carrera.catalogo) {
        throw new Error('No se encontró la carrera o catálogo activo para guardar la proyección');
      }

      // Construir el plan en la estructura que espera el backend
      const planPayload = plan.map(s => ({
        semester: s.semester,
        courses: s.courses.map(c => ({ codigo: c.codigo }))
      }));

      const body = {
        rut: userData.rut,
        codigoCarrera: String(carrera.codigo).trim(),
        catalogo: String(carrera.catalogo).trim(),
        tipo: 'recommended',
        nombre_proyeccion: nombreProyeccion,
        plan: planPayload
      };

      const response = await fetch('http://localhost:3001/api/proyecciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error guardando proyección');
      }

      const savedProyeccion = await response.json();
      setSuccess(true);
      console.log('✅ Proyección guardada:', savedProyeccion);

      // Limpiar y cerrar
      setTimeout(() => {
        setNombreProyeccion('');
        setSuccess(false);
        onSaved?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Guardar Proyección</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {success ? (
          <div className={styles.successMessage}>
            <div className={styles.checkmark}>✓</div>
            <p>¡Proyección guardada exitosamente!</p>
          </div>
        ) : (
          <div className={styles.modalBody}>
            <label htmlFor="nombreProyeccion" className={styles.label}>
              Nombre de la proyección:
            </label>
            <input
              id="nombreProyeccion"
              type="text"
              value={nombreProyeccion}
              onChange={(e) => setNombreProyeccion(e.target.value)}
              placeholder="ej: Plan 2025 - Egreso a tiempo"
              className={styles.input}
              disabled={loading}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.buttonGroup}>
              <button
                onClick={onClose}
                className={styles.cancelBtn}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className={styles.saveBtn}
                disabled={loading || !nombreProyeccion.trim()}
              >
                {loading ? 'Guardando...' : 'Guardar Proyección'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaveProjectionModal;
