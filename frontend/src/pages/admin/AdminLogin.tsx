import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { MdEmail, MdLock, MdAdminPanelSettings } from 'react-icons/md';
import styles from './AdminLogin.module.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.adminBadge}>
          <MdAdminPanelSettings />
          ACCESO RESTRINGIDO
        </div>
        <h1>Cursoreo</h1>
        <h2>Panel Administrativo</h2>
        <p>Acceso exclusivo para profesores</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label>Correo Electrónico</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}><MdEmail /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@ucn.cl"
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Contraseña</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}><MdLock /></span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" disabled={isLoading} className={styles.submitBtn}>
            {isLoading ? (
              <span className={styles.loading}>
                <span className={styles.spinner} />
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p>
            ¿No eres profesor?{' '}
            <button 
              type="button"
              onClick={() => navigate('/login')} 
              className={styles.backLink}
            >
              Ir a login de estudiantes
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;