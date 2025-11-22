import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    return (
        <div className={styles.layout}>
            <Navbar />
            <div className={styles.container}>
                <Sidebar />
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;