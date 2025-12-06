import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from './context/AppContext';
import { AdminProvider } from "./context/AdminContext";
import { AppRoutes } from "./routes";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
