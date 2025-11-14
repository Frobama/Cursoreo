import React from 'react';
import styles from './ProjectionSelector.module.css';

type Carrera = { 
    nombre: string;
    codigo: string;
    catalogo: string;
};

type Props = {
    carreras: Carrera[];
    selected: string[];
    onChange: (s: string[]) => void;
    isLoading?: boolean;
};

const ProjectionSelector: React.FC<Props> = ({ carreras, selected, onChange, isLoading }) => {
    const toggle = (key: string) => onChange(
        selected.includes(key) 
        ? selected.filter(s => s !== key) 
        : [...selected, key]);

    if (isLoading) {
        return <div className={styles.loading}>Cargando carreras...</div>;
    }
    return (
        <div className={styles.container}>
            <h3>Seleccionar Proyecciones</h3>
            <div className={styles.grid}>
                {carreras.map(c => {
                    const key = `${c.codigo}-${c.catalogo}`;
                    return (
                        <label 
                            key={key} 
                            className={`${styles.item} ${selected.includes(key) ? styles.selected : ''}`}
                        >
                            <input 
                                type='checkbox' 
                                checked={selected.includes(key)} 
                                onChange={() => toggle(key)} />
                            <div className={styles.content}>
                                <strong>{c.nombre}</strong>
                                <small>{c.codigo} - {c.catalogo}</small>
                            </div>
                        </label>
                    );
                })}
            </div>
            {selected.length > 0 && (
                <div className={styles.summary}>
                    {selected.length} proyección(es) seleccionad(s)
                </div>
            )}
        </div>
    );
};

export default ProjectionSelector;