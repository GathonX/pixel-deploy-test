
import { useNavigate, useLocation } from 'react-router-dom';

// Simple wrapper around useNavigate to mimic router interfaces from other frameworks
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    pathname: location.pathname
  };
}

export default useRouter;
