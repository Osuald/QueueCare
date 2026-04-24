import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import AppointmentForm from './pages/AppointmentForm';
import Queue from './pages/Queue';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="page-wrapper">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments"
                element={
                  <ProtectedRoute>
                    <Appointments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments/new"
                element={
                  <ProtectedRoute>
                    <AppointmentForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments/:id/edit"
                element={
                  <ProtectedRoute>
                    <AppointmentForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/queue"
                element={
                  <ProtectedRoute staffOnly>
                    <Queue />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
