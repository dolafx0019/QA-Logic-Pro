import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FlaskConical, History, Settings, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import { apiService } from '../../services/api';

interface BackendStatus {
  mock_mode: boolean;
  gemini_configured: boolean;
}

export default function MainLayout() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    apiService.getStatus().then(s => setBackendStatus(s));
  }, []);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors',
      isActive
        ? 'bg-qa-surface2 text-qa-text-pri font-medium shadow-sm'
        : 'text-qa-text-sec hover:text-qa-text-pri hover:bg-qa-surface1 font-normal'
    );

  const showMockBanner = backendStatus?.mock_mode === true || backendStatus?.gemini_configured === false;

  return (
    <div className="min-h-screen bg-qa-bg text-qa-text-pri flex">

      {/* ── Sidebar ── */}
      <aside className="w-56 border-r border-qa-border bg-qa-surface1 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-qa-border">
          <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-qa-text-pri">
            <FlaskConical className="w-4 h-4 text-qa-accent-pri" />
            QA-Logic Pro
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <NavLink to="/" end className={navClass}>
            <FlaskConical className="w-4 h-4" />
            Generator
          </NavLink>
          <NavLink to="/history" className={navClass}>
            <History className="w-4 h-4" />
            History
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <Settings className="w-4 h-4" />
            Settings
          </NavLink>
        </nav>

        {/* Footer version note */}
        <div className="px-4 py-3 border-t border-qa-border">
          <p className="text-[10px] text-qa-text-sec leading-relaxed font-mono">MVP · Integration-ready</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-qa-bg">

        {/* Top bar — only shown when backend status is known */}
        {backendStatus !== null && (
          <header className="h-14 flex items-center px-6 border-b border-qa-border flex-shrink-0 gap-3">
            {showMockBanner ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-qa-warning/10 border border-qa-warning/20 text-qa-warning text-xs font-medium">
                <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Mock Mode active — AI generation disabled. 
                  Set a valid <code className="font-mono mx-1 bg-qa-warning/20 px-1 rounded">GEMINI_API_KEY</code>
                  and <code className="font-mono ml-1 bg-qa-warning/20 px-1 rounded">MOCK_MODE=False</code>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-qa-text-sec">
                <span className="w-1.5 h-1.5 rounded-full bg-qa-success inline-block shadow-[0_0_8px_rgba(50,213,131,0.5)]" />
                Live generation active
              </div>
            )}
          </header>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
