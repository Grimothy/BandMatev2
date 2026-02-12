import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';
import { PageLoading } from '../ui/Loading';

// External link icons
const ExternalLinkIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// Ko-Fi logo SVG - official style
const KoFiIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#FF5E5B" />
    <path d="M9.5 7C9.5 7 9 10.5 7 11.5C5 12.5 5.5 15 7.5 15.5C9.5 16 13 13.5 13.5 11C14 8.5 12 6 9.5 7Z" fill="white" />
    <path d="M16 6.5C16 6.5 15 9.5 14.5 10.5C14 11.5 16 11.5 17 10.5C18 9.5 17 6.5 16 6.5Z" fill="white" />
  </svg>
);

export function Layout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-surface px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-4">
              <a
                href="https://grimothy.github.io/BandMate_site/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-text hover:text-primary transition-colors"
              >
                <ExternalLinkIcon />
                Documentation
              </a>
              <span className="hidden sm:inline text-border">|</span>
              <a
                href="https://ko-fi.com/mrgrimothy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-text hover:text-primary transition-colors"
              >
                <KoFiIcon />
                Support on Ko-Fi
              </a>
            </div>
            <div className="text-xs text-muted">
              BandMate - Collaborative Music Production
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
