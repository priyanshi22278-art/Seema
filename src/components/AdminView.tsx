import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EventItem, UserProfile } from '../types';
import { ExcelRegistrationGrid } from './ExcelRegistrationGrid';
import { GoogleCalendarView } from './GoogleCalendarView';
import { QrAttendanceScanner } from './QrAttendanceScanner';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { CertificateManager } from './CertificateManager';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { getEventThemeImage } from '../utils/eventThemes';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit2,
  Trash2,
  Ban,
  ExternalLink,
  Download,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  FileSpreadsheet,
  UserCheck,
  UserX,
  GraduationCap,
  Mail,
  IdCard,
  Search,
  Filter,
  RotateCcw,
  QrCode,
  BarChart3,
  Award,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const {
    events,
    registrations,
    users,
    createEvent,
    updateEvent,
    cancelEvent,
    deleteEvent,
    restoreEvent,
    approveStudent,
    rejectStudent,
    setStudentStatus,
  } = useApp();

  // Admin Portal Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'events' | 'registrations_dashboard' | 'attendance' | 'analytics' | 'certificates'
  >('events');

  // Event status filter within Events tab: 'Active' | 'Cancelled' | 'Deleted' | 'All'
  const [eventStatusFilter, setEventStatusFilter] = useState<'Active' | 'Cancelled' | 'Deleted' | 'All'>('Active');

  // Event creation & editing modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formEventId, setFormEventId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('2026-10-15');
  const [formTime, setFormTime] = useState('14:00');
  const [formVenue, setFormVenue] = useState('');
  const [formMaxCapacity, setFormMaxCapacity] = useState<number>(50);
  const [formError, setFormError] = useState('');
  const [showCalendarInEvents, setShowCalendarInEvents] = useState(false);

  // Delete confirmation modal state (Explicit Requirement 4)
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Student approvals search & filter
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'All' | 'Pending' | 'Active' | 'Rejected'>('Pending');

  // Open modal for adding an event
  const handleOpenAddEvent = () => {
    setEditingEventId(null);
    setFormEventId(`EVT-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormDescription('');
    setFormDate('2026-10-15');
    setFormTime('14:00');
    setFormVenue('');
    setFormMaxCapacity(50);
    setFormError('');
    setIsEventModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (event: EventItem) => {
    setEditingEventId(event.id);
    setFormEventId(event.id);
    setFormName(event.name);
    setFormDescription(event.description);
    setFormDate(event.date);
    setFormTime(event.time);
    setFormVenue(event.venue);
    setFormMaxCapacity(event.maxCapacity);
    setFormError('');
    setIsEventModalOpen(true);
  };

  // Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEventId.trim() || !formName.trim() || !formDate || !formTime || !formVenue.trim()) {
      setFormError('Please fill in all required event details.');
      return;
    }

    if (formMaxCapacity <= 0) {
      setFormError('Maximum capacity must be greater than 0.');
      return;
    }

    try {
      if (editingEventId) {
        await updateEvent(editingEventId, {
          name: formName.trim(),
          description: formDescription.trim(),
          date: formDate,
          time: formTime,
          venue: formVenue.trim(),
          maxCapacity: Number(formMaxCapacity),
        });
      } else {
        await createEvent({
          id: formEventId.trim().toUpperCase(),
          name: formName.trim(),
          description: formDescription.trim(),
          date: formDate,
          time: formTime,
          venue: formVenue.trim(),
          maxCapacity: Number(formMaxCapacity),
          status: 'Active',
        });
      }
      setIsEventModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error saving event. Please try again.');
    }
  };

  // Confirm and permanently delete event (Cascades to remove related registrations)
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.id);
      setEventToDelete(null);
    } catch (err: any) {
      console.error('Error deleting event:', err);
    }
  };

  // Handle Cancel Event
  const handleExecuteCancel = async (eventId: string) => {
    try {
      await cancelEvent(eventId);
      setCancelConfirmId(null);
    } catch (err: any) {
      console.error('Error cancelling event:', err);
    }
  };

  // Filter students for Student Approval Requests section
  const studentUsers = users.filter((u) => u.role === 'student');
  const filteredStudents = studentUsers.filter((stu) => {
    if (studentStatusFilter !== 'All' && stu.status !== studentStatusFilter) return false;
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      stu.name.toLowerCase().includes(q) ||
      stu.email.toLowerCase().includes(q) ||
      (stu.studentId && stu.studentId.toLowerCase().includes(q)) ||
      (stu.course && stu.course.toLowerCase().includes(q))
    );
  });

  const pendingStudentCount = studentUsers.filter((u) => u.status === 'Pending').length;

  // Event counts
  const totalEvents = events.length;
  const activeEventsCount = events.filter((e) => e.status === 'Active' || !e.status).length;
  const cancelledEventsCount = events.filter((e) => e.status === 'Cancelled').length;
  const deletedEventsCount = events.filter((e) => e.status === 'Deleted').length;

  // Filter events for Event Management tab based on eventStatusFilter
  const displayedEvents = events.filter((e) => {
    if (eventStatusFilter === 'All') return true;
    if (eventStatusFilter === 'Active') return e.status === 'Active' || !e.status;
    if (eventStatusFilter === 'Cancelled') return e.status === 'Cancelled';
    if (eventStatusFilter === 'Deleted') return e.status === 'Deleted';
    return true;
  });

  // Registration metrics
  // Registrations linked to deleted events are marked 'Event Deleted' and MUST NOT be counted as active/approved registrations
  const totalRegistrations = registrations.length;
  const approvedRegistrations = registrations.filter((r) => r.status === 'Approved').length;
  const pendingRegistrations = registrations.filter((r) => r.status === 'Pending').length;
  const rejectedRegistrations = registrations.filter((r) => r.status === 'Rejected').length;
  const cancelledRegistrations = registrations.filter((r) => r.status === 'Event Cancelled').length;
  const deletedRegistrations = registrations.filter((r) => r.status === 'Event Deleted').length;
  const activeRegistrationsCount = approvedRegistrations + pendingRegistrations;

  // Capacity calculation across active events only
  const activeEventsList = events.filter((e) => e.status === 'Active' || !e.status);
  const totalCapacity = activeEventsList.reduce((sum, e) => sum + (e.maxCapacity || 0), 0);
  const capacityUtilization = totalCapacity > 0 ? Math.round((activeRegistrationsCount / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Admin Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Events</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'events'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('registrations_dashboard')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'registrations_dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Registrations</span>
            {pendingStudentCount > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold animate-pulse">
                {pendingStudentCount} New
              </span>
            ) : (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'registrations_dashboard'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                }`}
              >
                {registrations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'certificates'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Certificates</span>
          </button>
        </div>

        {activeTab === 'events' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCalendarInEvents(!showCalendarInEvents)}
              className="text-xs font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer hidden sm:flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>{showCalendarInEvents ? 'Show Cards' : 'Calendar View'}</span>
            </button>

            <button
              onClick={handleOpenAddEvent}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add an Event</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: EVENTS MANAGEMENT */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {showCalendarInEvents ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Google Calendar Live Synchronization
                </h3>
                <button
                  onClick={() => setShowCalendarInEvents(false)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  ← Back to Event Cards
                </button>
              </div>
              <GoogleCalendarView
                events={events}
                role="admin"
                onSelectEvent={(evt) => handleOpenEdit(evt)}
              />
            </div>
          ) : (
            <>
              {/* Top Banner & Quick Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>Manage Campus Events</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono">
                      {activeEventsCount} Active
                    </span>
                    {deletedEventsCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {deletedEventsCount} Deleted
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Add an Event, cancel sessions, or delete records to mark as Deleted and set active counts to 0.
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  {/* Status Filter for Events */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setEventStatusFilter('Active')}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        eventStatusFilter === 'Active'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Active ({activeEventsCount})
                    </button>
                    <button
                      onClick={() => setEventStatusFilter('Cancelled')}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        eventStatusFilter === 'Cancelled'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Cancelled ({cancelledEventsCount})
                    </button>
                    <button
                      onClick={() => setEventStatusFilter('Deleted')}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        eventStatusFilter === 'Deleted'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Deleted ({deletedEventsCount})
                    </button>
                    <button
                      onClick={() => setEventStatusFilter('All')}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        eventStatusFilter === 'All'
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All ({totalEvents})
                    </button>
                  </div>

                  <button
                    onClick={handleOpenAddEvent}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event</span>
                  </button>
                </div>
              </div>

              {/* Event Cards Grid with Thematic Imagery */}
              {displayedEvents.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Calendar className="w-12 h-12 text-blue-500/50 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No {eventStatusFilter !== 'All' ? eventStatusFilter.toLowerCase() : ''} events found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                    {eventStatusFilter === 'Deleted'
                      ? 'No events are currently marked as deleted.'
                      : 'Click "Add an Event" to schedule your first university workshop, seminar, Dandiya night, or festival.'}
                  </p>
                  <button
                    onClick={handleOpenAddEvent}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add an Event</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedEvents.map((event) => {
                    const isCancelled = event.status === 'Cancelled';
                    const isDeleted = event.status === 'Deleted';
                    const bgImage = getEventThemeImage(event.name, event.description);
                    const percentFilled = isDeleted
                      ? 0
                      : Math.min(
                          100,
                          Math.round((event.currentRegistrations / (event.maxCapacity || 1)) * 100)
                        );
                    const gcalUrl = getGoogleCalendarUrl(event);

                    return (
                      <div
                        key={event.id}
                        className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative shadow-md group ${
                          isDeleted
                            ? 'border-slate-300 dark:border-slate-800 opacity-70'
                            : isCancelled
                            ? 'border-slate-300 dark:border-slate-800 opacity-80'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                        }`}
                        style={{
                          backgroundImage: `url(${bgImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {/* High-legibility dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-900/75 pointer-events-none" />

                        {/* Content Container (Layered above background) */}
                        <div className="p-5 pb-3 relative z-10 text-white flex-1 flex flex-col justify-between">
                          <div>
                            {/* Header row with badges */}
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950/80 border border-blue-600/40 px-2 py-0.5 rounded">
                                {event.id}
                              </span>

                              {isDeleted ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">
                                  <Ban className="w-3 h-3 mr-1" />
                                  Event Deleted
                                </span>
                              ) : isCancelled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">
                                  <Ban className="w-3 h-3 mr-1" />
                                  Cancelled
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-300 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                                  Cap: {event.maxCapacity}
                                </span>
                              )}
                            </div>

                            <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1 group-hover:text-blue-300 transition-colors">
                              {event.name}
                            </h3>

                            <p className="text-xs text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                              {event.description}
                            </p>
                          </div>

                          {/* Event details specs */}
                          <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2 text-xs text-slate-200">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="font-medium">{event.date}</span>
                              <span className="text-slate-400">•</span>
                              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>{event.time}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{event.venue}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>
                                {isDeleted ? (
                                  <span>
                                    Active: <strong className="text-slate-300">0 / 0 students</strong> (Event Deleted)
                                  </span>
                                ) : (
                                  <span>
                                    Registered: <strong className="text-white">{event.currentRegistrations}</strong> / {event.maxCapacity} students
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Capacity Bar */}
                            <div className="pt-1">
                              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    isDeleted || isCancelled ? 'bg-slate-600' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${percentFilled}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 relative z-10 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1">
                            {!isDeleted && (
                              <>
                                <a
                                  href={gcalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Sync with Google Calendar"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => downloadIcsFile(event)}
                                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
                                  title="Download .ics calendar file"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {isDeleted ? (
                              <button
                                onClick={() => restoreEvent(event.id)}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                title="Restore deleted event back to Active"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore Event</span>
                              </button>
                            ) : (
                              <>
                                {/* Cancel Event button */}
                                {!isCancelled && (
                                  <button
                                    onClick={() => setCancelConfirmId(event.id)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                    title="Cancel event and invalidate registrations"
                                  >
                                    <Ban className="w-3 h-3 text-slate-400" />
                                    <span>Cancel</span>
                                  </button>
                                )}

                                {isCancelled && (
                                  <button
                                    onClick={() => restoreEvent(event.id)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                    title="Reactivate cancelled event"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reactivate</span>
                                  </button>
                                )}

                                {/* Edit button */}
                                <button
                                  onClick={() => handleOpenEdit(event)}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>

                                {/* Delete button (Triggers Confirmation Modal) */}
                                <button
                                  onClick={() => setEventToDelete(event)}
                                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Delete event and mark registrations as Event Deleted"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* In-card Cancel confirmation overlay */}
                        {cancelConfirmId === event.id && (
                          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md p-5 flex flex-col justify-center items-center text-center">
                            <Ban className="w-8 h-8 text-amber-400 mb-2" />
                            <h4 className="text-sm font-bold text-white">Cancel Event?</h4>
                            <p className="text-xs text-slate-300 mt-1 max-w-xs">
                              This keeps the event record, closes registration, and marks all participant entries as "Event Cancelled".
                            </p>
                            <div className="flex items-center space-x-2 mt-4">
                              <button
                                onClick={() => handleExecuteCancel(event.id)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold"
                              >
                                Confirm Cancel
                              </button>
                              <button
                                onClick={() => setCancelConfirmId(null)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                              >
                                Abort
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: REGISTRATIONS & DASHBOARD */}
      {activeTab === 'registrations_dashboard' && (
        <div className="space-y-8">
          {/* Dashboard Summary Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Events
              </span>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {totalEvents}
              </p>
              <span className="text-[11px] text-slate-400">
                {activeEventsCount} active • {cancelledEventsCount} cancelled • {deletedEventsCount} deleted
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Registrations
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {activeRegistrationsCount}
              </p>
              <span className="text-[11px] text-slate-400">
                {totalRegistrations} total records in database
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Approved Seats
              </span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {approvedRegistrations}
              </p>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Confirmed entries</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Registrations
              </span>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pendingRegistrations}
              </p>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Awaiting approval</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Deleted / Cancelled
              </span>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
                {deletedRegistrations + cancelledRegistrations}
              </p>
              <span className="text-[11px] text-slate-400">
                {deletedRegistrations} deleted • {cancelledRegistrations} cancelled
              </span>
            </div>
          </div>

          {/* SECTION: Student Approval Requests (Requirement 1) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Student Approval Requests
                    </h3>
                    {pendingStudentCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                        {pendingStudentCount} Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verify new student registrations before granting access to view and register for events.
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 w-40 sm:w-48"
                  />
                </div>

                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs">
                  {(['All', 'Pending', 'Active', 'Rejected'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStudentStatusFilter(filter)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                        studentStatusFilter === filter
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Students List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Registration Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No student approval requests match the current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu) => {
                      const isPending = stu.status === 'Pending';
                      const isActive = stu.status === 'Active';
                      const isRejected = stu.status === 'Rejected';

                      return (
                        <tr key={stu.uid} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            {stu.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                            {stu.email}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {stu.course || 'General Curriculum'}
                          </td>
                          <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 font-medium">
                            {stu.studentId || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                            {stu.createdAt?.split('T')[0] || stu.createdAt}
                          </td>
                          <td className="px-4 py-3">
                            {isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Active
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-700">
                                Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                Pending Approval
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {stu.status !== 'Active' && (
                                <button
                                  onClick={() => approveStudent(stu.uid)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                                  title="Approve student access"
                                >
                                  Approve
                                </button>
                              )}
                              {stu.status !== 'Rejected' && (
                                <button
                                  onClick={() => rejectStudent(stu.uid)}
                                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="Reject student access"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION: Excel Spreadsheet Style Grid for Database Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Database Management: Registrations Grid
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Excel Sheet Structure with Direct Real-time Firestore Updates
              </span>
            </div>

            <ExcelRegistrationGrid registrations={registrations} />
          </div>
        </div>
      )}

      {/* TAB 3: QR ATTENDANCE SCANNER & ROSTER */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <QrAttendanceScanner />
        </div>
      )}

      {/* TAB 4: ADVANCED ANALYTICS DASHBOARD */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <AnalyticsDashboard />
        </div>
      )}

      {/* TAB 5: CERTIFICATES ISSUANCE CENTER */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <CertificateManager />
        </div>
      )}

      {/* ADD / EDIT EVENT MODAL (Requirement 8: Added vertical scrollbar, renamed to "Add an Event") */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-850/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingEventId ? 'Edit Event' : 'Add an Event'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete the event specifications. The theme background will be automatically selected based on the event title.
                </p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body with Visible Scrollbar (Requirement 8) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 pr-3">
              {formError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="add-event-form" onSubmit={handleSaveEvent} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Event ID *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingEventId}
                      value={formEventId}
                      onChange={(e) => setFormEventId(e.target.value.toUpperCase())}
                      placeholder="e.g. EVT-DANDIYA-101"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Maximum Capacity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formMaxCapacity}
                      onChange={(e) => setFormMaxCapacity(parseInt(e.target.value, 10) || 0)}
                      placeholder="50"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Event Name * (e.g. Dandiya Night, AI Workshop, Sports Meet)
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Grand Dandiya & Raas Celebration 2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Provide detailed description of workshop topics, prerequisites, musical performers, or competition rules..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Venue / Campus Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="e.g. Central University Grounds / Auditorium Hall B"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </form>
            </div>

            {/* Modal Fixed Footer with Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-event-form"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                {editingEventId ? 'Update Event' : 'Add an Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT EVENT DELETE CONFIRMATION MODAL (Requirement 4) */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Confirm Event Deletion
            </h3>

            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-2 leading-relaxed">
              "Deleting this event will also remove/invalidate its registrations. Do you want to continue?"
            </p>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-left">
              <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{eventToDelete.name}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {eventToDelete.id} • Date: {eventToDelete.date}</div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                Connected registrations will change to 'Event Deleted' and active count becomes 0.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Mark Event Deleted & Invalidate Registrations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
