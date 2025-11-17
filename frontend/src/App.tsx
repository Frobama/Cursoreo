import { useState, useEffect } from 'react';
import Login from './components/Login';
import ucnLogo from './assets/UCN.png'
import eicLogo from './assets/eic.png'
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const loggedUser = localStorage.getItem("user");
    if(loggedUser) {
      const foundUser = JSON.parse(loggedUser);
      setUser(foundUser);
    }

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
  };

  return (
    <>{user ? (
        <Dashboard userData={user} onLogout={handleLogout}/>
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
