import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChallengeCreatePage from '@/domains/admin/ChallengeCreate';
import ChallengeDetailPage from '@/domains/ChallengeDetail';
import DashboardPage from '@/domains/Dashboard';
import LoginPage from '@/domains/User/Login/Page';

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/challenges/:code" element={<ChallengeDetailPage />} />
          <Route path="/admin/challenges/new" element={<ChallengeCreatePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
