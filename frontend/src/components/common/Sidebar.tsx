import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const Sidebar = () => {
    const menuItems = [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/malla', label: 'Malla Curricular' },
        { path: '/proyeccion', label: 'Proyecciones' },
        { path: '/proyeccion/manual', label: 'Nueva Proyección' }
    ];

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                {menuItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => 
                            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                        }
                    >
                        <span className={styles.label}>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;