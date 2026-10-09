import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CertificateItem, CertificateType } from '../types';
import { CertificateModal } from './CertificateModal';
import {
  Award,
  Sparkles,
  Users,
  Calendar,
  CheckCircle2,
  FileCheck,
  Search,
  ExternalLink,
} from 'lucide-react';

export const CertificateManager: React.FC = () => {
  const { events, attendance, registrations, certificates, generateCertificates } = useApp();

  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [certType, setCertType] = useState<CertificateType>('Participation');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFeedback, setGenerationFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [previewCert, setPreviewCert] = useState<CertificateItem | null>(null);
  const [certSearch, setCertSearch] = useState('');

  const targetEvent = events.find((e) => e.id === selectedEventId);

  // Attendees marked Present
  const attendees = attendance.filter((a) => a.eventId === selectedEventId && a.status === 'Present');
  const approvedRegistrations = registrations.filter(
    (r) => r.eventId === selectedEventId && r.status === 'Approved'
  );

  // Certificates for this event
  const eventCertificates = certificates.filter((c) => c.eventId === selectedEventId);

  const handleGenerate = async () => {
    if (!selectedEventId) return;
    setIsGenerating(true);
    setGenerationFeedback(null);

    try {
      const res = await generateCertificates(selectedEventId, certType);
      if (res.success) {
        setGenerationFeedback({
          success: true,
          message: `Successfully generated ${res.count} certificates of ${certType} for "${targetEvent?.name}"!`,
        });
      } else {
        setGenerationFeedback({
          success: false,
          message: 'No eligible attendees or approved students found for this event.',
        });
      }
    } catch (err: any) {
      setGenerationFeedback({
        success: false,
        message: err.message || 'Failed to generate certificates.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredCerts = certificates.filter((c) => {
    if (!certSearch) return true;
    const q = certSearch.toLowerCase();
    return (
      c.studentName.toLowerCase().includes(q) ||
      c.eventName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.studentId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Certificate Issuance Console */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Academic Certificate Issuance Center
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate authenticated certificates with unique IDs and verification QR codes for event attendees.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Total Issued:
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              {certificates.length} Certificates
            </span>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Completed / Active Event:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setGenerationFeedback(null);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {events
                .filter((e) => e.status !== 'Deleted')
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.date}) - {e.id}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Certificate Recognition Type:
            </label>
            <select
              value={certType}
              onChange={(e) => setCertType(e.target.value as CertificateType)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Participation">Certificate of Participation</option>
              <option value="Volunteer">Certificate of Volunteer Service</option>
              <option value="Excellence">Certificate of Academic Excellence</option>
              <option value="Coordinator">Certificate of Event Coordination</option>
              <option value="Winner">Certificate of Achievement / Winner</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedEventId}
              className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer h-9"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : `Issue ${certType} Certificates`}</span>
            </button>
          </div>
        </div>

        {/* Event Attendees Eligibility Notice */}
        {targetEvent && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-900 dark:text-white">
              Target Event: {targetEvent.name}
            </span>
            <span>•</span>
            <span>
              Attended Students (Verified Present):{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">{attendees.length}</strong>
            </span>
            <span>•</span>
            <span>
              Approved Registrations:{' '}
              <strong className="text-blue-600 dark:text-blue-400">{approvedRegistrations.length}</strong>
            </span>
            <span>•</span>
            <span>
              Certificates Already Issued for this event:{' '}
              <strong className="text-amber-600 dark:text-amber-400">{eventCertificates.length}</strong>
            </span>
          </div>
        )}

        {/* Feedback message */}
        {generationFeedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              generationFeedback.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}
          >
            {generationFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <FileCheck className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{generationFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Generated Certificates Registry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-850/60">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Issued Certificates Registry ({certificates.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={certSearch}
              onChange={(e) => setCertSearch(e.target.value)}
              placeholder="Search by student, event, or ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Certificate ID</th>
                <th className="px-4 py-3">Recipient Student</th>
                <th className="px-4 py-3">Event Name</th>
                <th className="px-4 py-3">Recognition Type</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No certificates issued yet. Select an event above and click "Issue Certificates".
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {cert.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <div>{cert.studentName}</div>
                      <span className="text-[10px] font-mono text-slate-400">{cert.studentId}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {cert.eventName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        {cert.certificateType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {cert.issueDate}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPreviewCert(cert)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Certificate</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {previewCert && (
        <CertificateModal certificate={previewCert} onClose={() => setPreviewCert(null)} />
      )}
    </div>
  );
};
