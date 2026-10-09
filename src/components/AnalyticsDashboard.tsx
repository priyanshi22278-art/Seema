import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  Award,
  Users,
  Flame,
  Clock,
  Ban,
  Percent,
} from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { events, registrations, attendance, users } = useApp();

  // Metrics computation
  const totalRegistrations = registrations.length;
  const approvedRegistrations = registrations.filter((r) => r.status === 'Approved').length;
  const pendingRegistrations = registrations.filter((r) => r.status === 'Pending').length;
  const rejectedRegistrations = registrations.filter((r) => r.status === 'Rejected').length;
  const cancelledRegistrations = registrations.filter(
    (r) => r.status === 'Event Cancelled' || r.status === 'Event Deleted'
  ).length;

  // Attendance metrics
  const totalAttendance = attendance.filter((a) => a.status === 'Present').length;
  const attendanceRate =
    approvedRegistrations > 0 ? Math.round((totalAttendance / approvedRegistrations) * 100) : 0;

  // Event lifecycle breakdown
  const todayStr = new Date().toISOString().split('T')[0];
  const activeEvents = events.filter((e) => e.status === 'Active' || !e.status);
  const upcomingEvents = activeEvents.filter((e) => e.date >= todayStr);
  const completedEvents = activeEvents.filter((e) => e.date < todayStr);
  const cancelledEvents = events.filter((e) => e.status === 'Cancelled' || e.status === 'Deleted');

  // Most popular events (sorted by active registrations or attendance)
  const eventStats = events
    .filter((e) => e.status !== 'Deleted')
    .map((e) => {
      const eventRegs = registrations.filter(
        (r) => r.eventId === e.id && r.status !== 'Event Deleted' && r.status !== 'Rejected'
      );
      const eventApproved = registrations.filter((r) => r.eventId === e.id && r.status === 'Approved');
      const eventAtt = attendance.filter((a) => a.eventId === e.id && a.status === 'Present');
      const rate = eventApproved.length > 0 ? Math.round((eventAtt.length / eventApproved.length) * 100) : 0;
      return {
        ...e,
        totalRegs: eventRegs.length,
        approvedRegs: eventApproved.length,
        presentAtt: eventAtt.length,
        rate,
      };
    })
    .sort((a, b) => b.totalRegs - a.totalRegs);

  const topEvents = eventStats.slice(0, 5);
  const maxRegsForScaling = Math.max(1, ...eventStats.map((e) => e.totalRegs));

  // Student participation statistics by Course/Department
  const courseCounts: Record<string, number> = {};
  registrations.forEach((r) => {
    if (r.status !== 'Event Deleted') {
      const course = r.studentCourse || 'General Curriculum';
      courseCounts[course] = (courseCounts[course] || 0) + 1;
    }
  });

  const sortedCourses = Object.entries(courseCounts).sort((a, b) => b[1] - a[1]);
  const totalCourseEntries = Object.values(courseCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Registrations</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {totalRegistrations}
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{approvedRegistrations} Approved</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400">{pendingRegistrations} Pending</span>
          </div>
        </div>

        {/* Total Attendance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Attendance</span>
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {totalAttendance}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Verified check-ins via QR Scanner
          </p>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Rate</span>
            <Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {attendanceRate}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {totalAttendance} of {approvedRegistrations} approved attendees
          </p>
        </div>

        {/* Event Counts Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Events</span>
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {events.length}
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-1">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{upcomingEvents.length} Upcoming</span>
            <span>•</span>
            <span className="text-slate-600 dark:text-slate-400">{completedEvents.length} Past</span>
            <span>•</span>
            <span className="text-rose-600 dark:text-rose-400">{cancelledEvents.length} Cancelled</span>
          </div>
        </div>
      </div>

      {/* Chart Section 1: Event-Wise Registrations vs Attendance */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Event-Wise Registrations & Attendance Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparison between total registered student seats and actual physical check-ins.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-3 h-3 rounded-xs bg-blue-600" />
              <span>Registered</span>
            </span>
            <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-xs bg-emerald-500" />
              <span>Attended</span>
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="space-y-4">
          {eventStats.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No event statistics available yet.</p>
          ) : (
            eventStats.map((evt) => {
              const regWidth = Math.max(4, Math.round((evt.totalRegs / maxRegsForScaling) * 100));
              const attWidth = Math.max(
                evt.presentAtt > 0 ? 4 : 0,
                Math.round((evt.presentAtt / maxRegsForScaling) * 100)
              );

              return (
                <div key={evt.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
                      {evt.name} <span className="font-mono text-[10px] text-slate-400">({evt.id})</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <strong>{evt.presentAtt}</strong> attended / <strong>{evt.totalRegs}</strong> registered ({evt.rate}%)
                    </span>
                  </div>

                  <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center p-0.5 space-x-1">
                    {/* Reg bar */}
                    <div
                      style={{ width: `${regWidth}%` }}
                      className="h-full bg-blue-600 rounded-sm transition-all duration-500"
                      title={`${evt.totalRegs} registered`}
                    />
                    {/* Att bar */}
                    <div
                      style={{ width: `${attWidth}%` }}
                      className="h-full bg-emerald-500 rounded-sm transition-all duration-500"
                      title={`${evt.presentAtt} attended`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Grid: Most Popular Events Leaderboard + Student Participation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Popular Events */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Flame className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Most Popular Events (Leaderboard)
              </h3>
            </div>

            <div className="space-y-3">
              {topEvents.map((evt, idx) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {evt.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {evt.venue} • {evt.date}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {evt.totalRegs}
                    </span>
                    <span className="text-[10px] text-slate-400 block">students</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Student Participation Statistics (By Curriculum / Department) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Student Participation by Department
            </h3>
          </div>

          <div className="space-y-3">
            {sortedCourses.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No registration data yet.</p>
            ) : (
              sortedCourses.slice(0, 6).map(([course, count]) => {
                const percent = Math.round((count / totalCourseEntries) * 100);
                return (
                  <div key={course} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {course}
                      </span>
                      <span className="font-mono text-slate-500">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
