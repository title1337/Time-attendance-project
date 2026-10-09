import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import {
  PrivateRoute,
  PublicRoute,
  AdminRoute,
} from './components/guards/RouteGuards';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LeavePage from './pages/LeavePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public routes - only accessible when NOT logged in */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leave" element={<LeavePage />} />
          </Route>

          {/* Private routes - require authentication */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* TODO: Add more pages */}
            {/* <Route path="/attendance" element={<AttendancePage />} /> */}
            {/* <Route path="/leave" element={<LeavePage />} /> */}
            {/* <Route path="/overtime" element={<OvertimePage />} /> */}
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            {/* <Route path="/admin/users" element={<UsersPage />} /> */}
            {/* <Route path="/admin/reports" element={<ReportsPage />} /> */}
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
          success: {
            style: { background: '#22c55e', color: 'white' },
          },
          error: {
            style: { background: '#ef4444', color: 'white' },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
