import React, { useEffect, useState } from 'react';
import { CertificateItem } from '../types';
import { generateQrDataUrl } from '../utils/qrcode';
import { Award, Download, Printer, X, ShieldCheck } from 'lucide-react';

interface CertificateModalProps {
  certificate: CertificateItem;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    const payload = `VERIFY-CERT|ID:${certificate.id}|EVENT:${certificate.eventName}|STUDENT:${certificate.studentName}|TYPE:${certificate.certificateType}`;
    generateQrDataUrl(payload, { width: 160, margin: 1 }).then((url) => setQrUrl(url));
  }, [certificate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col">
        {/* Modal Controls Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Official Academic Certificate
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas Area */}
        <div className="p-6 sm:p-8 bg-amber-50/30 dark:bg-slate-950 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Ornate Certificate Border Frame */}
          <div className="w-full border-4 border-double border-amber-600/60 dark:border-amber-500/40 rounded-2xl p-6 sm:p-10 bg-white dark:bg-slate-900/90 relative shadow-lg">
            {/* Watermark Crest */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 dark:opacity-10">
              <Award className="w-72 h-72 text-amber-600" />
            </div>

            {/* Header / College Name */}
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 dark:text-amber-400">
                CAMPUSPULSE INSTITUTE OF HIGHER EDUCATION
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-slate-900 dark:text-white">
                Certificate of {certificate.certificateType}
              </h1>
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-2" />
            </div>

            {/* Recipient Notice */}
            <div className="my-6 space-y-2 relative z-10">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-serif italic">
                This certifies that
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-blue-900 dark:text-blue-300 tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 inline-block px-8">
                {certificate.studentName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Student ID: {certificate.studentId}
              </p>
            </div>

            {/* Body Description */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-lg mx-auto leading-relaxed relative z-10">
              has successfully participated in and attended the college session{' '}
              <strong className="text-slate-900 dark:text-white">"{certificate.eventName}"</strong> held on{' '}
              <span className="underline decoration-amber-500 font-semibold">{certificate.eventDate}</span>.
            </p>

            {/* Footer with Signatures & QR Seal */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 items-end gap-4 relative z-10">
              {/* Issued Date */}
              <div className="text-left text-[11px] text-slate-500">
                <span className="block font-semibold text-slate-700 dark:text-slate-300">
                  Date of Issue:
                </span>
                <span className="font-mono">{certificate.issueDate}</span>
                <span className="block text-[9px] font-mono text-slate-400 mt-1">
                  ID: {certificate.id}
                </span>
              </div>

              {/* QR Verification Seal */}
              <div className="flex flex-col items-center">
                {qrUrl && (
                  <img
                    src={qrUrl}
                    alt="Certificate QR Verification"
                    className="w-16 h-16 rounded border border-amber-300 dark:border-amber-700 shadow-xs"
                  />
                )}
                <span className="text-[8px] font-mono uppercase text-slate-400 mt-1">
                  Tamper-proof Seal
                </span>
              </div>

              {/* Authorized Signatory */}
              <div className="text-right text-[11px] text-slate-500">
                <div className="font-serif italic font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {certificate.issuedBy}
                </div>
                <div className="w-24 h-0.5 bg-slate-300 dark:bg-slate-700 ml-auto my-1" />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
