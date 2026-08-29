import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.js';
import Layout from './components/Layout.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import Landing from './pages/Landing.js';
import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import Coach from './pages/Coach.js';
import Demo from './pages/Demo.js';
import DemoView from './pages/DemoView.js';
import Goals from './pages/Goals.js';
import Health from './pages/Health.js';
import History from './pages/History.js';
import Settings from './pages/Settings.js';
import NotFound from './pages/NotFound.js';
import ErrorBoundary from './components/ErrorBoundary.js';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/demo/:id" element={<DemoView />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach"
              element={
                <ProtectedRoute>
                  <Coach />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <Goals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/health"
              element={
                <ProtectedRoute>
                  <Health />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
