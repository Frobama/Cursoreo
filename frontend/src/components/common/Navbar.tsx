import { useAuth } from '../../hooks/useAuth';
import { useApp } from '../../context/AppContext';
import CarreraSelector from './CarreraSelector';
import styles from './Navbar.module.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { clearAppData } = useApp();

    const handleLogout = () => {
        clearAppData();
        logout();
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <h2>Cursoreo</h2>
            </div>

            <div className={styles.center}>
                <CarreraSelector />
            </div>

            <div className={styles.right}>
                <span className={styles.userName}>{user?.nombre || user?.email}</span>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                    Cerrar Sesión
                </button>
            </div>
        </nav>
    );
};

export default Navbar;