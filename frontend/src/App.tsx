import { useState, useEffect } from 'react';
import Login from './components/Login';
import ucnLogo from './assets/UCN.png'
import eicLogo from './assets/eic.png'
import Dashboard from './components/Dashboard';
import { authGet } from './utils/authFetch';
import MisProyecciones from './pages/MisProyecciones';

function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [hash, setHash] = useState<string>(typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    // Validar token al cargar la app
    const validateToken = async () => {
      const token = localStorage.getItem("authToken");
      const savedUser = localStorage.getItem("user");

      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      try {
        // Validar token con el backend
        const response = await authGet('http://localhost:3001/api/validar-token');
        
        if (response.ok) {
          const data = await response.json();
          if (data.valid) {
            // Token válido, cargar usuario
            setUser(JSON.parse(savedUser));
          } else {
            // Token inválido, limpiar localStorage
            handleLogout();
          }
        } else {
          // Error al validar, limpiar localStorage
          handleLogout();
        }
      } catch (error) {
        console.error('Error validando token:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    validateToken();

    // Listener para logout automático cuando el token expire
    const handleTokenExpired = () => {
      console.log('🔒 Token expirado, cerrando sesión automáticamente');
      handleLogout();
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);

    // Cleanup
    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
  };
  
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
  };

  // Mostrar pantalla de carga mientras valida el token
  if (loading) {
    return (
      <div className="gradient-background">
        <h1>Cursoreo</h1>
        <main className="appMain">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Validando sesión...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>{user ? (
        <>
          <Dashboard userData={user} onLogout={handleLogout}/>
          {/* Render MisProyecciones as simple hash-driven overlay/page */}
          {hash.startsWith('#mis-proyecciones') && (
            <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:70, overflow:'auto'}}>
              <div style={{maxWidth:900, margin:'40px auto', background:'white', borderRadius:8}}>
                <MisProyecciones />
                <div style={{textAlign:'right', padding:8}}>
                  <button onClick={() => { window.location.hash = '#home'; setHash('#home'); }}>Cerrar</button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
      <div className="gradient-background">
        <h1>Cursoreo</h1>
        <main className="appMain">
          
            
          
          <Login onLoginSuccess={handleLoginSuccess} />
          
        </main>
        
        <footer className="appFooter">
           <img src= {ucnLogo} style={{height: '80px'}} alt="Logo UCN"/>
          <img src= {eicLogo} style={{height: '90px'}} alt="Logo EIC"/>
        </footer>
      </div>)}
    </>
/*
    <>
      <div className="gradient-background">
        <h1>Cursoreo</h1>
        <main className="appMain">
          {user ? (
            <Dashboard userData={user} onLogout={handleLogout}/>
          ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
          )}
        </main>
        
        <footer className="appFooter">
           <img src= {ucnLogo} style={{height: '80px'}} alt="Logo UCN"/>
          <img src= {eicLogo} style={{height: '90px'}} alt="Logo EIC"/>
        </footer>
      </div>
    </>*/
  )
}

export default App
