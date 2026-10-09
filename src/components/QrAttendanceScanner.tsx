import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EventItem, AttendanceItem } from '../types';
import {
  QrCode,
  Scan,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Search,
  Users,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const QrAttendanceScanner: React.FC = () => {
  const { events, registrations, attendance, recordAttendance } = useApp();

  // Active event selection
  const activeEvents = events.filter((e) => e.status !== 'Deleted');
  const [selectedEventId, setSelectedEventId] = useState<string>(activeEvents[0]?.id || '');

  // Scanner input state
  const [scannedInput, setScannedInput] = useState<string>('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    record?: AttendanceItem;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchAttendee, setSearchAttendee] = useState('');

  const currentEvent = events.find((e) => e.id === selectedEventId);

  // Registrations for this event
  const eventRegistrations = registrations.filter(
    (r) => r.eventId === selectedEventId && r.status !== 'Event Deleted'
  );

  // Attendance records for this event
  const eventAttendance = attendance.filter((a) => a.eventId === selectedEventId);

  // Present count
  const presentCount = eventAttendance.filter((a) => a.status === 'Present').length;
  const approvedCount = eventRegistrations.filter((r) => r.status === 'Approved').length;
  const attendanceRate = approvedCount > 0 ? Math.round((presentCount / approvedCount) * 100) : 0;

  // Process a scanned or entered pass code
  const handleProcessScan = async (rawCode: string) => {
    if (!rawCode.trim() || !selectedEventId) return;
    setIsProcessing(true);
    setScanResult(null);

    // Parse code if formatted as CAMPUSPULSE-PASS|REG:...|EVT:...
    let regId = rawCode.trim();
    if (regId.includes('REG:')) {
      const match = regId.match(/REG:([A-Za-z0-9_-]+)/);
      if (match) {
        regId = match[1];
      }
    } else if (regId.includes('|')) {
      const parts = regId.split('|');
      regId = parts[0];
    }

    try {
      const result = await recordAttendance({
        eventId: selectedEventId,
        registrationId: regId,
        status: 'Present',
      });

      setScanResult(result);
      if (result.success) {
        setScannedInput('');
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'An error occurred validating attendance.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAttendance = async (registrationId: string, currentStatus?: 'Present' | 'Absent') => {
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    const result = await recordAttendance({
      eventId: selectedEventId,
      registrationId,
      status: newStatus,
    });
    setScanResult(result);
  };

  const filteredRegistrations = eventRegistrations.filter((reg) => {
    if (!searchAttendee) return true;
    const q = searchAttendee.toLowerCase();
    return (
      reg.studentName.toLowerCase().includes(q) ||
      reg.id.toLowerCase().includes(q) ||
      reg.studentId.toLowerCase().includes(q) ||
      reg.studentEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Event Selector & Stats Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Event Attendance & QR Check-in Terminal
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Scan student pass QR code or enter Registration ID to mark verified attendance with duplicate prevention.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Select Event:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setScanResult(null);
              }}
              className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {activeEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.id} - {evt.name} ({evt.date})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Attendance Metric Cards */}
        {currentEvent && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Registered</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {eventRegistrations.length}
              </p>
              <span className="text-[10px] text-slate-500">{approvedCount} approved seats</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                Present (Checked In)
              </span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {presentCount}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Verified attendees
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                Absent / Pending
              </span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {Math.max(0, approvedCount - presentCount)}
              </p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                Awaiting check-in
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">
                Attendance Rate
              </span>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {attendanceRate}%
              </p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Turnout ratio</span>
            </div>
          </div>
        )}
      </div>

      {/* QR Input & Verification Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scanner Terminal */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Scan className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Scan Pass / Enter ID
            </h4>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessScan(scannedInput);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Scan QR Code or Type Registration ID:
              </label>
              <input
                type="text"
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                placeholder="e.g. REG-54321 or scan barcode"
                autoFocus
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing || !scannedInput.trim()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isProcessing ? 'Verifying...' : 'Validate & Mark Present'}</span>
            </button>
          </form>

          {/* Quick instructions */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              Automated Validation Rules:
            </span>
            <p>• Only registrations with status <strong>Approved</strong> are permitted entry.</p>
            <p>• Duplicate check-ins are automatically rejected with prior timestamp.</p>
            <p>• Changes synchronize instantly to central Firestore database.</p>
          </div>

          {/* Verification Result Feedback Card */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border animate-in fade-in duration-200 ${
                scanResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                {scanResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold block">
                    {scanResult.success ? 'Attendance Verified' : 'Check-in Notice'}
                  </span>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{scanResult.message}</p>
                  {scanResult.record?.checkInTime && (
                    <span className="text-[10px] opacity-80 block mt-1 font-mono">
                      Time: {new Date(scanResult.record.checkInTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Student Attendance Roster for Event */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
          {/* Table Header & Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-850/60">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Event Attendance Roster
              </h4>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchAttendee}
                onChange={(e) => setSearchAttendee(e.target.value)}
                placeholder="Search attendee..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Registration ID</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Approval Status</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No registrations found for this event.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const attRecord = attendance.find(
                      (a) => a.eventId === selectedEventId && a.registrationId === reg.id
                    );
                    const isPresent = attRecord?.status === 'Present';

                    return (
                      <tr
                        key={reg.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors ${
                          isPresent ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <div>{reg.studentName}</div>
                          <span className="text-[10px] font-mono text-slate-400">{reg.studentEmail}</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                          {reg.id}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {reg.studentCourse}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              reg.status === 'Approved'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isPresent ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Present</span>
                              {attRecord?.checkInTime && (
                                <span className="text-[9px] font-mono opacity-75 ml-1">
                                  ({new Date(attRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Absent</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleAttendance(reg.id, attRecord?.status)}
                            disabled={reg.status !== 'Approved'}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isPresent
                                ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                            title={reg.status !== 'Approved' ? 'Must be approved to mark attendance' : 'Toggle attendance'}
                          >
                            {isPresent ? 'Mark Absent' : 'Mark Present'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
