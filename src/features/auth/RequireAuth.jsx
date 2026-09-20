import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { ROUTES } from '../../app/routes';

export default function RequireAuth({ adminOnly = false, children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.signIn} state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={ROUTES.feed} replace />;
  }

  return children;
}
