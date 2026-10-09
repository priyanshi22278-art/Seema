import React, { useEffect, useState } from 'react';
import { RegistrationItem, EventItem } from '../types';
import { generateQrDataUrl } from '../utils/qrcode';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Printer,
} from 'lucide-react';

interface DigitalEventPassModalProps {
  registration: RegistrationItem;
  event?: EventItem;
  onClose: () => void;
}

export const DigitalEventPassModal: React.FC<DigitalEventPassModalProps> = ({
  registration,
  event,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Encodes the registration info for staff verification
    const passPayload = `CAMPUSPULSE-PASS|REG:${registration.id}|EVT:${registration.eventId}|STU:${registration.studentId}|NAME:${registration.studentName}`;
    generateQrDataUrl(passPayload, { width: 280, margin: 2 }).then((url) => {
      setQrDataUrl(url);
    });
  }, [registration]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col">
        {/* Pass Header */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-6 pb-8 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-black tracking-wider uppercase text-blue-100">
                Official CampusPulse Pass
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 relative z-10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 mb-2">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified & Approved Entry
            </span>
            <h2 className="text-xl font-black text-white leading-tight">
              {registration.eventName || event?.name}
            </h2>
            <p className="text-xs text-blue-200 font-mono mt-1">
              Pass ID: {registration.id}
            </p>
          </div>
        </div>

        {/* Pass Body with Ticket Notch Effect */}
        <div className="relative p-6 bg-white dark:bg-slate-900 space-y-5">
          {/* Decorative notches */}
          <div className="absolute -top-3 left-0 w-6 h-6 rounded-r-full bg-slate-950 dark:bg-slate-950 -ml-3" />
          <div className="absolute -top-3 right-0 w-6 h-6 rounded-l-full bg-slate-950 dark:bg-slate-950 -mr-3" />

          {/* Student Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Student Name
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">
                {registration.studentName}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Student ID
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                {registration.studentId}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Course / Dept
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                {registration.studentCourse || 'Undergraduate'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Registered Email
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-400 truncate block text-[11px]">
                {registration.studentEmail}
              </span>
            </div>
          </div>

          {/* Event Logistics */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Date:</strong> {event?.date || 'Scheduled Event Date'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Time:</strong> {event?.time || 'Check schedule'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                <strong>Venue:</strong> {event?.venue || 'Campus Auditorium'}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 text-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Digital Event Pass QR Code"
                className="w-48 h-48 rounded-lg shadow-xs"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse text-xs text-slate-400">
                Generating QR Pass...
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-2">
              Scan this QR code at event entrance for attendance check-in
            </p>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              Unique Pass ID: {registration.id}
            </p>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Authorized Pass</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`${registration.id}-${registration.eventName.replace(/[^a-zA-Z0-9]/g, '_')}-Pass.png`}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Pass</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
