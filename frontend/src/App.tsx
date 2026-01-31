import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProjectList } from './pages/projects/ProjectList';
import { ProjectDetail } from './pages/projects/ProjectDetail';
import { CutDetail } from './pages/cuts/CutDetail';
import { FileExplorer } from './pages/files/FileExplorer';
import { Users } from './pages/admin/Users';
import { SharedFile } from './pages/shared/SharedFile';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            duration: 5000,
          }}
        />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/shared/:shareToken" element={<SharedFile />} />
            
            {/* Protected routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/cuts/:id" element={<CutDetail />} />
              <Route path="/files" element={<FileExplorer />} />
              <Route path="/admin/users" element={<Users />} />
              {/* Redirect old vibe routes to projects */}
              <Route path="/vibes/:id" element={<Navigate to="/projects" replace />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
