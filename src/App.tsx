import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { StudentView } from './components/StudentView';
import { StudentPendingView } from './components/StudentPendingView';
import { AdminView } from './components/AdminView';
import { AiAssistant } from './components/AiAssistant';

function MainLayout() {
  const { currentUser, userRole, loading } = useApp();

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="flex flex-col items-center space-y-3 relative z-10">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">
            Connecting to CampusPulse Real-Time Firestore...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  // If student account is Pending or Rejected, show dedicated verification status view
  const isStudentAwaitingApproval = userRole === 'student' && currentUser.status !== 'Active';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Atmospheric event-themed background lighting (clean & modern) */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-indigo-600/5 to-transparent pointer-events-none dark:opacity-80" />
      <div className="fixed -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {userRole === 'admin' ? (
          <AdminView />
        ) : isStudentAwaitingApproval ? (
          <StudentPendingView />
        ) : (
          <StudentView />
        )}
      </main>

      {/* Floating AI Assistant for Students & Admins */}
      <AiAssistant />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 transition-colors relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span>© 2026 CampusPulse Event Portal. All rights reserved.</span>
            <span>•</span>
            <span className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-medium">
              <span>Google Calendar Integrated</span>
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Real-time Firestore Database</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
