import React, { useState } from 'react';
import { RegistrationItem } from '../types';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Check,
  X,
  Clock,
  ChevronDown,
  Ban,
} from 'lucide-react';

interface ExcelRegistrationGridProps {
  registrations: RegistrationItem[];
}

export const ExcelRegistrationGrid: React.FC<ExcelRegistrationGridProps> = ({ registrations }) => {
  const { updateRegistrationStatus, deleteRegistration } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Rejected' | 'Event Cancelled' | 'Event Deleted'>('All');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>({ row: 1, col: 'A' });
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);

  // Columns definition (Excel format)
  const columns = [
    { letter: 'A', title: 'Registration ID', key: 'id', width: 'w-36' },
    { letter: 'B', title: 'Student ID', key: 'studentId', width: 'w-36' },
    { letter: 'C', title: 'Event ID', key: 'eventId', width: 'w-32' },
    { letter: 'D', title: 'Event Name', key: 'eventName', width: 'w-56' },
    { letter: 'E', title: 'Student Name', key: 'studentName', width: 'w-48' },
    { letter: 'F', title: 'Student Email', key: 'studentEmail', width: 'w-56' },
    { letter: 'G', title: 'Course', key: 'studentCourse', width: 'w-48' },
    { letter: 'H', title: 'Registration Date', key: 'registrationDate', width: 'w-44' },
    { letter: 'I', title: 'Status', key: 'status', width: 'w-32' },
    { letter: 'J', title: 'Actions', key: 'actions', width: 'w-36' },
  ];

  // Filtering
  const filteredRows = registrations.filter((reg) => {
    if (statusFilter !== 'All' && reg.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      reg.id.toLowerCase().includes(q) ||
      reg.studentId.toLowerCase().includes(q) ||
      reg.eventId.toLowerCase().includes(q) ||
      reg.studentName.toLowerCase().includes(q) ||
      reg.eventName.toLowerCase().includes(q) ||
      reg.studentEmail.toLowerCase().includes(q) ||
      reg.studentCourse.toLowerCase().includes(q)
    );
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      'Registration ID',
      'Student ID',
      'Event ID',
      'Event Name',
      'Student Name',
      'Email',
      'Course',
      'Registration Date',
      'Status',
    ];

    const rows = filteredRows.map((r) => [
      `"${r.id}"`,
      `"${r.studentId}"`,
      `"${r.eventId}"`,
      `"${r.eventName.replace(/"/g, '""')}"`,
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.studentEmail}"`,
      `"${r.studentCourse}"`,
      `"${r.registrationDate}"`,
      `"${r.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CampusPulse_Registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'Rejected':
        // Strict constraint: NO RED. Use dark slate / neutral border.
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-700">
            <X className="w-3 h-3 mr-1 text-slate-500" />
            Rejected
          </span>
        );
      case 'Event Cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-slate-700">
            <Ban className="w-3 h-3 mr-1 text-slate-500" />
            Event Cancelled
          </span>
        );
      case 'Event Deleted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-400 dark:border-slate-700">
            <Ban className="w-3 h-3 mr-1 text-slate-500" />
            Event Deleted
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-md overflow-hidden flex flex-col">
      {/* Excel Ribbon / Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-850 border-b border-slate-300 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Registrations_Master_Sheet.xlsx</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono">
            {filteredRows.length} Records
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sheet..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-48"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-0.5 text-xs font-medium">
            <Filter className="w-3 h-3 ml-2 text-slate-400 mr-1" />
            {(['All', 'Approved', 'Pending', 'Rejected', 'Event Cancelled', 'Event Deleted'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            disabled={registrations.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-xs transition-colors"
            title="Download CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Formula Bar (Authentic Excel feel) */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center space-x-2 text-xs font-mono">
        <div className="w-12 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold">
          {selectedCell ? `${selectedCell.col}${selectedCell.row}` : 'A1'}
        </div>
        <div className="text-slate-400 dark:text-slate-500 font-bold">fx</div>
        <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 truncate">
          =DATABASE.REGISTRATIONS(Source="Firestore_Live", Count={filteredRows.length}, Status="{statusFilter}")
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto flex-1 max-h-[560px]">
        <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-700 select-none">
          {/* Excel Column Letters Header */}
          <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono sticky top-0 z-10">
            <tr>
              {/* Row number top-left corner */}
              <th className="w-10 px-2 py-1.5 text-center border border-slate-300 dark:border-slate-700 bg-slate-300 dark:bg-slate-750 font-bold text-slate-500">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.letter}
                  className={`${col.width} px-3 py-1.5 border border-slate-300 dark:border-slate-700 font-semibold tracking-wider`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mr-1">
                      {col.letter}
                    </span>
                    <span className="font-sans font-medium text-slate-800 dark:text-slate-200">
                      {col.title}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900"
                >
                  <FileSpreadsheet className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No registrations match the selected criteria.</p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    When students register for events, they will populate this Excel-style grid automatically in real time.
                  </p>
                </td>
              </tr>
            ) : (
              filteredRows.map((reg, index) => {
                const rowNum = index + 1;
                return (
                  <tr
                    key={reg.id}
                    className="hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-colors bg-white dark:bg-slate-900 group"
                  >
                    {/* Row Index Number */}
                    <td className="w-10 px-2 py-2 text-center font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-850">
                      {rowNum}
                    </td>

                    {/* Col A: Registration ID */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'A' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 font-mono font-medium text-blue-700 dark:text-blue-400 ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'A'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.id}
                    </td>

                    {/* Col B: Student ID */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'B' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-200 font-semibold ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'B'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.studentId}
                    </td>

                    {/* Col C: Event ID */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'C' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300 ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'C'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.eventId}
                    </td>

                    {/* Col D: Event Name */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'D' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'D'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.eventName}
                    </td>

                    {/* Col E: Student Name */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'E' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'E'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.studentName}
                    </td>

                    {/* Col F: Email */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'F' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-[11px] ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'F'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.studentEmail}
                    </td>

                    {/* Col G: Course */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'G' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'G'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.studentCourse}
                    </td>

                    {/* Col H: Registration Date */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'H' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-600 dark:text-slate-400 ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'H'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      {reg.registrationDate?.split('T')[0] || reg.registrationDate}
                    </td>

                    {/* Col I: Status */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'I' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 relative ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'I'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {getStatusBadge(reg.status)}
                        <button
                          onClick={() => setStatusMenuOpen(statusMenuOpen === reg.id ? null : reg.id)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Dropdown status changer */}
                      {statusMenuOpen === reg.id && (
                        <div className="absolute right-2 top-8 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 w-32">
                          <button
                            onClick={() => {
                              updateRegistrationStatus(reg.id, 'Approved');
                              setStatusMenuOpen(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              updateRegistrationStatus(reg.id, 'Pending');
                              setStatusMenuOpen(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400 flex items-center space-x-1.5"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </button>
                          <button
                            onClick={() => {
                              updateRegistrationStatus(reg.id, 'Rejected');
                              setStatusMenuOpen(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center space-x-1.5"
                          >
                            <X className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Col J: Actions */}
                    <td
                      onClick={() => setSelectedCell({ row: rowNum, col: 'J' })}
                      className={`px-3 py-2 border border-slate-300 dark:border-slate-700 ${
                        selectedCell?.row === rowNum && selectedCell?.col === 'J'
                          ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : ''
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        {reg.status === 'Event Deleted' ? (
                          <span className="text-[10px] text-slate-500 font-semibold italic">
                            Event Inactive
                          </span>
                        ) : reg.status === 'Event Cancelled' ? (
                          <span className="text-[10px] text-slate-500 font-semibold italic">
                            Event Cancelled
                          </span>
                        ) : (
                          <>
                            {reg.status !== 'Approved' && (
                              <button
                                onClick={() => updateRegistrationStatus(reg.id, 'Approved')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Approve registration"
                              >
                                Approve
                              </button>
                            )}
                            {reg.status !== 'Rejected' && (
                              <button
                                onClick={() => updateRegistrationStatus(reg.id, 'Rejected')}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Reject registration"
                              >
                                Reject
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => deleteRegistration(reg.id)}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded text-[10px] cursor-pointer"
                          title="Delete registration record"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Sheet Footer Tab */}
      <div className="bg-slate-100 dark:bg-slate-850 border-t border-slate-300 dark:border-slate-750 px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 bg-white dark:bg-slate-900 border-t-2 border-t-blue-600 border-x border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-semibold rounded-t">
            Sheet1 (Registrations)
          </div>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span>Total Records: {registrations.length}</span>
          <span>Approved: {registrations.filter((r) => r.status === 'Approved').length}</span>
          <span>Pending: {registrations.filter((r) => r.status === 'Pending').length}</span>
          <span>Rejected: {registrations.filter((r) => r.status === 'Rejected').length}</span>
          <span>Cancelled: {registrations.filter((r) => r.status === 'Event Cancelled').length}</span>
          <span>Deleted: {registrations.filter((r) => r.status === 'Event Deleted').length}</span>
        </div>
      </div>
    </div>
  );
};
