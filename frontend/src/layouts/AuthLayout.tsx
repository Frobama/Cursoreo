import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

const AuthLayout = () => {
  return (
    <div className={styles.authLayout}>
      <div className={styles.authCard}>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;