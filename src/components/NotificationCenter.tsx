import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { NotificationItem } from '../types';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  CalendarX,
  Mail,
  CheckCheck,
  X,
  Award,
} from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const {
    currentUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    emailServiceConfigured,
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter notifications relevant to current user
  const relevantNotifications = notifications.filter((n) => {
    if (currentUser?.role === 'admin') return true;
    return n.userId === currentUser?.uid || n.userId === 'all' || n.recipientEmail === currentUser?.email;
  });

  const unreadCount = relevantNotifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'account_approved':
      case 'registration_approved':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'account_rejected':
      case 'registration_rejected':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'event_cancelled':
      case 'event_deleted':
        return <CalendarX className="w-4 h-4 text-amber-500" />;
      default:
        return <Award className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
        title="Notifications & Alerts"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Email delivery service status banner */}
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[10px] flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
              <Mail className="w-3 h-3 text-slate-500" />
              <span>Outgoing Email Service:</span>
            </div>
            {emailServiceConfigured ? (
              <span className="flex items-center space-x-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Active (SMTP Configured)</span>
              </span>
            ) : (
              <span
                className="flex items-center space-x-1 font-medium text-amber-700 dark:text-amber-400"
                title="SMTP credentials not provided in server environment (.env.example)"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Not Configured (SMTP missing)</span>
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[60vh] divide-y divide-slate-100 dark:divide-slate-800/60">
            {relevantNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                <p className="text-xs font-semibold">No notifications yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  You will receive instant alerts for account approvals, registrations, and event updates.
                </p>
              </div>
            ) : (
              relevantNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markNotificationAsRead(notif.id)}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors cursor-pointer text-left relative ${
                    !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-blue-600" />
                  )}
                  <div className="flex items-start space-x-2.5">
                    <div className="mt-0.5 shrink-0 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Outgoing Email Delivery Status for this notification */}
                      {notif.recipientEmail && (
                        <div className="mt-2 flex items-center space-x-1.5 flex-wrap">
                          {notif.emailStatus === 'sent' ? (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <Mail className="w-2.5 h-2.5" />
                              <span>Email sent to {notif.recipientEmail}</span>
                            </span>
                          ) : notif.emailStatus === 'not_configured' ? (
                            <span
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              title="Email service not configured in server environment"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Email not sent (service not configured)</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                              title={notif.emailError || 'Email delivery failed'}
                            >
                              <XCircle className="w-2.5 h-2.5" />
                              <span>Email failed: {notif.emailError || 'Delivery error'}</span>
                            </span>
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
