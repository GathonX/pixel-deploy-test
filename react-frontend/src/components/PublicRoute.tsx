import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/spinner';

type PublicRouteProps = {
  children: React.ReactNode;
};

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <Spinner className="h-16" />;
  }

  if (isAuthenticated) {
    const isAdmin = user?.role === 'admin';
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/workspace'} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
