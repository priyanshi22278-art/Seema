import React, { useState } from 'react';
import { EventItem, RegistrationItem } from '../types';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { Calendar as CalendarIcon, ExternalLink, Download, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface GoogleCalendarViewProps {
  events: EventItem[];
  userRegistrations?: RegistrationItem[];
  role: 'student' | 'admin';
  onSelectEvent?: (event: EventItem) => void;
}

export const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({
  events,
  userRegistrations = [],
  role,
  onSelectEvent,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 1)); // October 2026

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const registeredEventIds = new Set(userRegistrations.map((r) => r.eventId));

  // Filter events relevant to calendar (exclude deleted events from active calendar schedule)
  const getEventsForDay = (day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => {
      if (e.status === 'Deleted') return false;
      if (e.date !== formattedDate) return false;
      return true;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-900">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Google Calendar Sync & Schedule
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                Live Real-Time
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {role === 'student'
                ? 'Track your registered workshops and upcoming campus events'
                : 'Monitor all scheduled events and real-time registration counts'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-semibold text-slate-800 dark:text-slate-200 min-w-32 text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-px mb-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-sm">
        {/* Leading blank days */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div
            key={`blank-${i}`}
            className="min-h-24 p-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/40 border border-transparent"
          />
        ))}

        {/* Days of Month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayEvents = getEventsForDay(dayNum);
          const isToday =
            dayNum === 2 && month === 9 && year === 2026; // Current local date reference

          return (
            <div
              key={`day-${dayNum}`}
              className={`min-h-24 p-1.5 rounded-lg border transition-all flex flex-col justify-between ${
                isToday
                  ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {dayNum}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1 rounded">
                    {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-1 flex-1 overflow-y-auto max-h-20">
                {dayEvents.map((evt) => {
                  const isRegistered = registeredEventIds.has(evt.id);
                  const isCancelled = evt.status === 'Cancelled';
                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent && onSelectEvent(evt)}
                      className={`text-[11px] p-1 rounded font-medium cursor-pointer truncate transition-transform hover:scale-[1.02] ${
                        isCancelled
                          ? 'bg-slate-700 text-slate-300 line-through opacity-80'
                          : isRegistered
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-blue-600 text-white shadow-xs'
                      }`}
                      title={`${isCancelled ? '[CANCELLED] ' : ''}${evt.name} - ${evt.time} at ${evt.venue} (${evt.currentRegistrations}/${evt.maxCapacity} registered)`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{isCancelled ? `[Cancelled] ${evt.name}` : evt.name}</span>
                      </div>
                      <div className="text-[9px] opacity-90 flex items-center justify-between mt-0.5">
                        <span>{evt.time}</span>
                        <span>{evt.currentRegistrations}/{evt.maxCapacity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming events sync list */}
      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Quick Sync with Google Calendar
        </h4>
        {events.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            No events available to sync. Events created by admins will automatically appear here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.filter((e) => e.status !== 'Deleted').slice(0, 6).map((evt) => {
              const isRegistered = registeredEventIds.has(evt.id);
              const gcalUrl = getGoogleCalendarUrl(evt);

              return (
                <div
                  key={`quick-sync-${evt.id}`}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                        {evt.status === 'Cancelled' ? `[Cancelled] ${evt.name}` : evt.name}
                      </span>
                      {evt.status === 'Cancelled' ? (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          Cancelled
                        </span>
                      ) : isRegistered ? (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                          Registered
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>{evt.date} • {evt.time}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3 h-3 text-blue-500" />
                        <span>{evt.currentRegistrations} / {evt.maxCapacity} seats filled</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <a
                      href={gcalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Google Calendar</span>
                    </a>
                    <button
                      onClick={() => downloadIcsFile(evt)}
                      className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded transition-colors"
                      title="Download .ics calendar file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
