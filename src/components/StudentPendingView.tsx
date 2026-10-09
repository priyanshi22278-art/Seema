import React from 'react';
import { useApp } from '../context/AppContext';
import { Clock, ShieldAlert, User, Mail, GraduationCap, IdCard, LogOut, Sparkles, RefreshCw } from 'lucide-react';

export const StudentPendingView: React.FC = () => {
  const { currentUser, logout } = useApp();
  const isRejected = currentUser?.status === 'Rejected';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden text-center">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Status Icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-lg relative">
          {isRejected ? (
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
              <ShieldAlert className="w-8 h-8 text-slate-300" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center border border-blue-400/40">
              <Clock className="w-8 h-8 text-white animate-pulse" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          {isRejected ? 'Account Access Not Approved' : 'Student Account Pending Approval'}
        </h2>

        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {isRejected
            ? 'Your student account registration was reviewed by campus administration and was not approved. Please consult the university event office.'
            : 'Your registration has been submitted to the Admin Portal for verification. Once approved by an administrator, your access to view and register for events will activate automatically.'}
        </p>

        {/* Live sync badge */}
        {!isRejected && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[11px] font-semibold mt-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Listening for Admin Approval in Real-Time</span>
          </div>
        )}

        {/* Profile Card Summary */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" /> Student Name
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{currentUser?.name}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-500" /> Email
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{currentUser?.email}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> Course
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentUser?.course || 'General Curriculum'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-blue-500" /> Student ID
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {currentUser?.studentId || 'Pending Generation'}
            </span>
          </div>
        </div>

        {/* Sign out action */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <button
            onClick={() => logout()}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
