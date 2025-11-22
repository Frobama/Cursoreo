import { useNavigate } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.notFound}>
            <h1 className={styles.code}>404</h1>
            <h2>Página no encontrada</h2>
            <p>La página que buscas no existe.</p>
            <button onClick={() => navigate('/dashboard')} className={styles.btn}>
                Volver al Dashboard
            </button>
        </div>
    );
};

export default NotFoundPage;