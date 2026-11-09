import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getSession, type SessionResult } from '@/api/auth';

const ProtectedRoute = () => {
  const [session, setSession] = useState<SessionResult | null>(null);

  useEffect(() => {
    let active = true;
    getSession().then((result) => {
      if (active) setSession(result);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!session) return null;

  if (session.status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (session.status === 'error') {
    return (
      <div style={{ padding: '96px 24px', textAlign: 'center' }} role="alert">
        <p style={{ marginBottom: 16 }}>서버에 연결할 수 없습니다.</p>
        <button
          type="button"
          style={{ textDecoration: 'underline', cursor: 'pointer' }}
          onClick={() => window.location.reload()}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <Outlet context={session.user} />;
};

export default ProtectedRoute;
