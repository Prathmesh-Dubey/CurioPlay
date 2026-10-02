import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthView from '@/components/auth/AuthView';
import type { User } from '@/api/api';

export default function Login() {
  const navigate = useNavigate();

  // If already logged in, go straight to the dashboard.
  useEffect(() => {
    if (localStorage.getItem('curioplay_user')) {
      navigate('/dashboard?tab=overview', { replace: true });
    }
  }, [navigate]);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('curioplay_user', JSON.stringify(user));
    // DashboardApp reads the stored user on mount. Replace, so back from the dashboard never returns to sign-in.
    navigate('/dashboard', { replace: true });
  };

  return <AuthView onLoginSuccess={handleLoginSuccess} />;
}
