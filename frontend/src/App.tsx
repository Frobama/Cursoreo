import { useState, useEffect } from 'react';
import Login from './components/Login';
import ucnLogo from './assets/UCN.png'
import eicLogo from './assets/eic.png'
import Dashboard from './components/Dashboard';
import MisProyecciones from './pages/MisProyecciones';

function App() {
  const [user, setUser] = useState<any | null>(null);
  const [hash, setHash] = useState<string>(typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const loggedUser = localStorage.getItem("user");
    if(loggedUser) {
      const foundUser = JSON.parse(loggedUser);
      setUser(foundUser);
    }
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
