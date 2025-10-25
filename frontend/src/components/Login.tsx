import React, { useState } from 'react';
import styles from './Login.module.css';

type LoginProps = {
    onLoginSuccess: (userData: any) => void;
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {

    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if(!correo || !password) {
            setError("Completa email y contraseña");
            setIsLoading(false);
            return;
        }

        const url = `http://localhost:3001/api/login?email=${correo}&password=${password}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `Error ${res.status}`);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            const userData = {...data, email: correo};

            localStorage.setItem("user", JSON.stringify(userData));

            onLoginSuccess(userData);
            console.log("Login exitoso:", userData);
        } catch (err:any) {
            setError(err.message || "Credenciales incorrectas o error en la conexión");
        } finally {
            setIsLoading(false);
        }
        
    };

    return (
        <>
            <div className={styles.loginContainer}>
                <form onSubmit={handleLogin}>
                    <h2>Correo Institucional</h2>
                    <input
                      type="email"
                      id="correo"
                      placeholder='Ingresa tu correo'
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      disabled={isLoading}
                    />
                    <h2>Contraseña</h2>
                    <input
                      type="password"
                      id="password"
                      placeholder='Ingresa tu contraseña'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <br />
                    {error && <p className={styles.errorMessage}>{error}</p>}
                    <button type="submit" className={styles.loginButton} disabled={isLoading}>
                        {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
            
        </>
    );
};

export default Login;