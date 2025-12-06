import { Navigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import Loading from '../components/common/Loading';

interface Props {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<Props> = ({ children }) => {
  const { profesor, isLoading } = useAdmin();

  if (isLoading) {
    return <Loading message="Verificando acceso..." />;
  }

  if (!profesor) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};