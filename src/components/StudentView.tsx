import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EventItem, RegistrationItem, CertificateItem } from '../types';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import { getEventThemeImage } from '../utils/eventThemes';
import { GoogleCalendarView } from './GoogleCalendarView';
import { DigitalEventPassModal } from './DigitalEventPassModal';
import { CertificateModal } from './CertificateModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  CheckCircle2,
  ExternalLink,
  Download,
  User,
  GraduationCap,
  Mail,
  IdCard,
  CalendarCheck,
  AlertCircle,
  FileCheck,
  X,
  Info,
  Ban,
  QrCode,
  Award,
  Ticket,
  Sparkles,
} from 'lucide-react';

export const StudentView: React.FC = () => {
  const { currentUser, events, registrations, certificates, registerForEvent } = useApp();

  // Student Navigation Tabs
  const [activeTab, setActiveTab] = useState<'events' | 'passes' | 'certificates' | 'profile'>('events');

  // Modal states for passes and certificates
  const [selectedPassReg, setSelectedPassReg] = useState<RegistrationItem | null>(null);
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);

  // Search & Filters for events tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventForModal, setSelectedEventForModal] = useState<EventItem | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState<EventItem | null>(null);
  const [showCalendarView, setShowCalendarView] = useState(false);

  // Registration form fields
  const [regName, setRegName] = useState(currentUser?.name || '');
  const [regEmail, setRegEmail] = useState(currentUser?.email || '');
  const [regCourse, setRegCourse] = useState(currentUser?.course || '');
  const [registrationSuccess, setRegistrationSuccess] = useState<{
    registrationId: string;
    studentId: string;
    eventName: string;
  } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  // Get student's registrations
  const studentRegistrations = registrations.filter(
    (r) =>
      r.userId === currentUser?.uid ||
      r.studentId === currentUser?.studentId ||
      r.studentEmail === currentUser?.email
  );

  const approvedStudentRegistrations = studentRegistrations.filter((r) => r.status === 'Approved');

  // Get student's certificates
  const studentCertificates = certificates.filter(
    (c) =>
      c.userId === currentUser?.uid ||
      c.studentEmail === currentUser?.email ||
      (c.studentId && c.studentId === currentUser?.studentId)
  );

  const registeredEventIds = new Set(studentRegistrations.map((r) => r.eventId));

  // Filter events (Exclude deleted events from active/upcoming browse view)
  const filteredEvents = events.filter((e) => {
    if (e.status === 'Deleted') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
    );
  });

  const handleOpenRegister = (event: EventItem) => {
    setSelectedEventForModal(null);
    setShowRegisterModal(event);
    setRegName(currentUser?.name || '');
    setRegEmail(currentUser?.email || '');
    setRegCourse(currentUser?.course || '');
    setRegError('');
    setRegistrationSuccess(null);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRegisterModal) return;

    if (!regName.trim() || !regEmail.trim() || !regCourse.trim()) {
      setRegError('Please answer Name, Email, and Course to register.');
      return;
    }

    if (showRegisterModal.status === 'Cancelled' || showRegisterModal.status === 'Deleted') {
      setRegError('This event is no longer accepting registrations.');
      return;
    }

    if (showRegisterModal.currentRegistrations >= showRegisterModal.maxCapacity) {
      setRegError('This event has reached maximum capacity.');
      return;
    }

    setRegistering(true);
    setRegError('');

    try {
      const result = await registerForEvent(showRegisterModal.id, {
        name: regName,
        email: regEmail,
        course: regCourse,
        studentId: currentUser?.studentId,
      });

      setRegistrationSuccess({
        registrationId: result.registrationId,
        studentId: result.studentId,
        eventName: showRegisterModal.name,
      });
    } catch (err: any) {
      setRegError(err.message || 'Failed to complete registration. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Navigation Tabs */}
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
            <Calendar className="w-4 h-4" />
            <span>Browse Events</span>
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
            onClick={() => setActiveTab('passes')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'passes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>My Event Passes</span>
            {approvedStudentRegistrations.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'passes'
                    ? 'bg-blue-700 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {approvedStudentRegistrations.length}
              </span>
            )}
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
            <span>My Certificates</span>
            {studentCertificates.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'certificates'
                    ? 'bg-blue-700 text-white'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                {studentCertificates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
            {studentRegistrations.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'profile'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                }`}
              >
                {studentRegistrations.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'events' && (
          <button
            onClick={() => setShowCalendarView(!showCalendarView)}
            className="hidden sm:flex items-center space-x-2 text-xs font-semibold px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{showCalendarView ? 'Show Event Cards' : 'View Google Calendar'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Calendar View Toggle Section */}
          {showCalendarView ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCalendarView(false)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  ← Back to Event Cards
                </button>
              </div>
              <GoogleCalendarView
                events={events}
                userRegistrations={studentRegistrations}
                role="student"
                onSelectEvent={(evt) => setSelectedEventForModal(evt)}
              />
            </div>
          ) : (
            <>
              {/* Search & Stats Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by event name, ID, or venue..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
                  <span>
                    Showing <strong className="text-slate-900 dark:text-white">{filteredEvents.length}</strong> of{' '}
                    <strong className="text-slate-900 dark:text-white">{events.length}</strong> events
                  </span>
                  <button
                    onClick={() => setShowCalendarView(true)}
                    className="sm:hidden text-xs text-blue-600 dark:text-blue-400 font-semibold"
                  >
                    Calendar View
                  </button>
                </div>
              </div>

              {/* Event Cards Grid */}
              {filteredEvents.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Calendar className="w-12 h-12 text-blue-500/50 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No events scheduled
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    There are currently no events matching your search. Check back soon as administrators schedule new workshops and sessions!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => {
                    const isCancelled = event.status === 'Cancelled';
                    const isRegistered = registeredEventIds.has(event.id);
                    const isFull = event.currentRegistrations >= event.maxCapacity;
                    const percentFilled = Math.min(
                      100,
                      Math.round((event.currentRegistrations / (event.maxCapacity || 1)) * 100)
                    );
                    const bgImage = getEventThemeImage(event.name, event.description);
                    const gcalUrl = getGoogleCalendarUrl(event);

                    return (
                      <div
                        key={event.id}
                        className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative shadow-md group ${
                          isCancelled
                            ? 'border-slate-300 dark:border-slate-800 opacity-85'
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

                        {/* Event Card Content */}
                        <div className="p-5 pb-3 relative z-10 text-white flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-xs font-bold text-blue-300 bg-blue-950/80 border border-blue-600/40 px-2 py-0.5 rounded">
                                {event.id}
                              </span>

                              {isCancelled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">
                                  <Ban className="w-3 h-3 mr-1" />
                                  Cancelled
                                </span>
                              ) : isRegistered ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Registered
                                </span>
                              ) : isFull ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                  Full Capacity
                                </span>
                              ) : (
                                <span className="text-xs text-blue-300 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs font-medium">
                                  {event.maxCapacity - event.currentRegistrations} seats left
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

                          {/* Event Specifications */}
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
                                Capacity: <strong className="text-white">{event.currentRegistrations}</strong> / {event.maxCapacity} students
                              </span>
                            </div>

                            {/* Capacity progress bar */}
                            <div className="pt-1">
                              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    isCancelled ? 'bg-slate-600' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${percentFilled}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer / Actions */}
                        <div className="p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 relative z-10 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedEventForModal(event)}
                            className="flex-1 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-center"
                          >
                            Details
                          </button>

                          {isCancelled ? (
                            <button
                              disabled
                              className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold opacity-80 cursor-not-allowed"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancelled</span>
                            </button>
                          ) : isRegistered ? (
                            <a
                              href={gcalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Calendar</span>
                            </a>
                          ) : (
                            <button
                              onClick={() => handleOpenRegister(event)}
                              disabled={isFull}
                              className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>{isFull ? 'Full' : 'Register'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: PROFILE & REGISTRATIONS */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {currentUser?.name || 'Student Name'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    CampusPulse Student Account
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      <GraduationCap className="w-3.5 h-3.5 mr-1" />
                      {currentUser?.course || 'General Curriculum'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      <IdCard className="w-3.5 h-3.5 mr-1 text-blue-500" />
                      {currentUser?.studentId || 'Assigned on registration'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="font-mono">{currentUser?.email || 'N/A'}</span>
              </div>
            </div>

            {/* Profile Information Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Total Registrations
                </span>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {studentRegistrations.length}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Approved Status
                </span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {studentRegistrations.filter((r) => r.status === 'Approved').length}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Assigned Student ID
                </span>
                <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {currentUser?.studentId || 'Generated on First Registration'}
                </p>
              </div>
            </div>
          </div>

          {/* Student's Registered Events List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  My Registered Events & Status
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Real-time synchronized
              </span>
            </div>

            {studentRegistrations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  You haven't registered for any events yet.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Switch to the "Browse Events" tab to find and join upcoming sessions.
                </p>
                <button
                  onClick={() => setActiveTab('events')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Explore Available Events
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {studentRegistrations.map((reg) => {
                  const eventObj = events.find((e) => e.id === reg.eventId);
                  const gcalUrl = eventObj ? getGoogleCalendarUrl(eventObj) : '#';

                  return (
                    <div
                      key={reg.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
                            {reg.eventId}
                          </span>
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {reg.eventName}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          <span>
                            Registration ID: <strong className="font-mono">{reg.id}</strong>
                          </span>
                          <span>
                            Student ID: <strong className="font-mono">{reg.studentId}</strong>
                          </span>
                          <span>
                            Registered on:{' '}
                            <strong>{reg.registrationDate?.split('T')[0] || reg.registrationDate}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Status and Calendar action */}
                      <div className="flex items-center space-x-3 shrink-0">
                        {reg.status === 'Event Deleted' || eventObj?.status === 'Deleted' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-400 dark:border-slate-700 flex items-center space-x-1">
                            <Ban className="w-3.5 h-3.5 text-slate-500" />
                            <span>Event Deleted</span>
                          </span>
                        ) : reg.status === 'Event Cancelled' || eventObj?.status === 'Cancelled' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-700 flex items-center space-x-1">
                            <Ban className="w-3.5 h-3.5 text-slate-500" />
                            <span>Event Cancelled</span>
                          </span>
                        ) : reg.status === 'Approved' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved</span>
                          </span>
                        ) : reg.status === 'Rejected' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-700">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Review</span>
                          </span>
                        )}

                        {eventObj && eventObj.status !== 'Deleted' && (
                          <div className="flex items-center space-x-1.5">
                            {reg.status === 'Approved' && (
                              <button
                                onClick={() => setSelectedPassReg(reg)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                title="View Digital Event Pass"
                              >
                                <Ticket className="w-3 h-3" />
                                <span>Digital Pass</span>
                              </button>
                            )}
                            <a
                              href={gcalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                              title="Sync to Google Calendar"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Google Calendar</span>
                            </a>
                            <button
                              onClick={() => downloadIcsFile(eventObj)}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200"
                              title="Download .ics file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MY EVENT PASSES */}
      {activeTab === 'passes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    My Digital Event Passes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official digital passes with verified QR code for admission into approved campus events.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {approvedStudentRegistrations.length} Active Passes
              </span>
            </div>

            {approvedStudentRegistrations.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Ticket className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No active event passes yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Once an administrator approves your event registration, your digital entry pass and personalized QR verification code will appear here instantly.
                </p>
                <button
                  onClick={() => setActiveTab('events')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Explore Events to Register
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {approvedStudentRegistrations.map((reg) => {
                  const eventObj = events.find((e) => e.id === reg.eventId);
                  return (
                    <div
                      key={reg.id}
                      className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-blue-400 transition-all"
                    >
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
                            {reg.eventId}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approved Entry
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                          {reg.eventName}
                        </h4>

                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{eventObj?.date || 'Scheduled Date'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{eventObj?.time || 'Check schedule'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{eventObj?.venue || 'Campus Venue'}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 flex justify-between">
                          <span>Pass: {reg.id}</span>
                          <span>ID: {reg.studentId}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">QR Entry Code Ready</span>
                        <button
                          onClick={() => setSelectedPassReg(reg)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View Digital Pass</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MY CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    My Certificates
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official academic certificates awarded for event participation and excellence.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {studentCertificates.length} Certificates Earned
              </span>
            </div>

            {studentCertificates.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Award className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No certificates issued yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Certificates are automatically issued by the administration after events are completed and attendance is confirmed.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {studentCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-amber-50/40 dark:bg-slate-850 border border-amber-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {cert.certificateType}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {cert.issueDate}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {cert.eventName}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {cert.collegeName}
                      </p>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
                        Certificate ID: <strong className="text-amber-700 dark:text-amber-400">{cert.id}</strong>
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Verified Credential</span>
                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View & Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEventForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedEventForModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                {selectedEventForModal.id}
              </span>
              <span className="text-xs text-slate-500">Event Details</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {selectedEventForModal.name}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {selectedEventForModal.description}
            </p>

            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" /> Date
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedEventForModal.date}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" /> Time
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedEventForModal.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" /> Venue
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedEventForModal.venue}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-500" /> Maximum Capacity
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedEventForModal.currentRegistrations} / {selectedEventForModal.maxCapacity} seats filled
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <a
                href={getGoogleCalendarUrl(selectedEventForModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Calendar</span>
              </a>

              {!registeredEventIds.has(selectedEventForModal.id) && (
                <button
                  onClick={() => handleOpenRegister(selectedEventForModal)}
                  disabled={selectedEventForModal.currentRegistrations >= selectedEventForModal.maxCapacity}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Register Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowRegisterModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {registrationSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Registration Confirmed!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    You have successfully registered for <strong>{registrationSuccess.eventName}</strong>.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Assigned Student ID:</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm">
                      {registrationSuccess.studentId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Registration ID:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {registrationSuccess.registrationId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Status:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Pending Review
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <a
                    href={getGoogleCalendarUrl(showRegisterModal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Add to Google Calendar</span>
                  </a>
                  <button
                    onClick={() => setShowRegisterModal(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {showRegisterModal.id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Register for Event
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {showRegisterModal.name}
                  </p>
                </div>

                {regError && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40 mb-4 flex items-start space-x-2 text-[11px] text-blue-800 dark:text-blue-300">
                  <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>
                    Please answer Name, Email, and Course below. After registration, a unique Student ID will be generated and linked to your profile.
                  </span>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Priyanshi Sharma"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Student Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. priyanshi22278@gmail.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Course / Degree Program *
                    </label>
                    <input
                      type="text"
                      required
                      value={regCourse}
                      onChange={(e) => setRegCourse(e.target.value)}
                      placeholder="e.g. B.Tech Computer Science, Business Analytics"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={registering}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {registering ? 'Submitting...' : 'Confirm & Register'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIGITAL EVENT PASS MODAL */}
      {selectedPassReg && (
        <DigitalEventPassModal
          registration={selectedPassReg}
          event={events.find((e) => e.id === selectedPassReg.eventId)}
          onClose={() => setSelectedPassReg(null)}
        />
      )}

      {/* CERTIFICATE PREVIEW & DOWNLOAD MODAL */}
      {selectedCert && (
        <CertificateModal
          certificate={selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  );
};
