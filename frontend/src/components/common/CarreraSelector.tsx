import { useAuth } from '../../hooks/useAuth';
import { useApp } from '../../context/AppContext';
import styles from './CarreraSelector.module.css'

const CarreraSelector = () => {
    const { user } = useAuth();
    const { carreraActiva, setCarreraActiva } = useApp();

    if (!user?.carreras || user.carreras.length === 0) {
        return null;
    }

    if (user.carreras.length === 1 && !carreraActiva) {
        setCarreraActiva(user.carreras[0]);
        return null;
    } 

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = user.carreras?.find(c => c.codigo === e.target.value);
        setCarreraActiva(selected || null);
    };

    return (
        <div className={styles.selector}>
            <label htmlFor='carrera-select'>Carrera</label>
            <select
                id='carrera-select'
                value={carreraActiva?.codigo || ''}
                onChange={handleChange}
                className={styles.select}
            >
                <option value="">Seleccione una carrera...</option>
                {user.carreras?.map(carrera => (
                    <option key={carrera.codigo} value={carrera.codigo}>
                        {carrera.nombre} ({carrera.catalogo})
                    </option>
                ))}
            </select>
        </div>
    );
};

export default CarreraSelector;