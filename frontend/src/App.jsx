import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dashboard from './components/analytics/Dashboard';
import MemberList from './components/members/MemberList';
import MemberDetail from './components/members/MemberDetail';
import MemberForm from './components/members/MemberForm';
import MembershipForm from './components/memberships/MembershipForm';
import RevenueAnalysis from './components/analytics/RevenueAnalysis';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<MemberList />} />
        <Route path="members/new" element={<MemberForm />} />
        <Route path="members/:id" element={<MemberDetail />} />
        <Route path="members/:id/edit" element={<MemberForm />} />
        <Route path="memberships/new" element={<MembershipForm />} />
        <Route path="memberships/new/:memberId" element={<MembershipForm />} />
        <Route path="revenue" element={<RevenueAnalysis />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;