import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { CardsPanelPage } from './pages/CardsPanelPage';
import { POSPage } from './pages/POSPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CashPage } from './pages/CashPage';
import { MenuAdminPage } from './pages/MenuAdminPage';
import { CardsAdminPage } from './pages/CardsAdminPage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { ReportsPage } from './pages/ReportsPage';

interface ProtectedRouteProps {
  children: React.ReactElement;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/comandas" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/comandas" replace /> : <LoginPage />}
      />

      {/* Protected App Routes under Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/comandas" replace />} />
        <Route path="comandas" element={<CardsPanelPage />} />
        <Route path="pdv" element={<POSPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="caixa" element={<CashPage />} />

        {/* Admin-only Routes */}
        <Route
          path="cardapio"
          element={
            <ProtectedRoute adminOnly>
              <MenuAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cartoes"
          element={
            <ProtectedRoute adminOnly>
              <CardsAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute adminOnly>
              <UsersAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="relatorios"
          element={
            <ProtectedRoute adminOnly>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/comandas" replace />} />
    </Routes>
  );
};
