import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Users,
  Info,
  Eye,
  Filter,
  Check,
  DollarSign,
  AlertCircle,
  HelpCircle,
  History as HistoryIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, LoadingSpinner, Modal } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedMemberRow {
  rowNumber: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  membershipStartDate: string;
  profilePhotoUrl?: string;
  status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'WARNING';
  errors: string[];
  warnings: string[];
  financialAssessment?: {
    backContributionWeeks: number;
    totalBackContributionAmount: number;
    dueDate?: string;
    status: 'PENDING' | 'UP_TO_DATE';
  };
  existingMemberId?: string;
}

interface PreviewResponse {
  filename: string;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  warningRowsCount: number;
  rows: ParsedMemberRow[];
}

interface ImportResultResponse {
  importId: string;
  filename: string;
  totalProcessed: number;
  successfullyImported: number;
  failedCount: number;
  skippedDuplicates: number;
  importedMembers: Array<{
    rowNumber: number;
    memberId: string;
    fullName: string;
    phone: string;
    joinDate: string;
    backContributionWeeks: number;
    totalBackContributionAmount: number;
  }>;
  failedRows: Array<{
    rowNumber: number;
    name: string;
    phone: string;
    reason: string;
  }>;
}

interface BulkImportJob {
  id: string;
  importId: string;
  originalFilename: string;
  fileType: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  duplicateRows: number;
  status: string;
  createdAt: string;
  importedBy?: {
    username: string;
    role: string;
  };
  resultSummary?: any;
}

type Step = 1 | 2 | 3 | 4 | 5;
type ViewMode = 'wizard' | 'history';

export default function BulkMemberRegistrationPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'om';
  const isOm = lang === 'om';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('wizard');
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview & Validation State
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Import Execution State
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResultResponse | null>(null);

  // History State
  const [historyJobs, setHistoryJobs] = useState<BulkImportJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BulkImportJob | null>(null);

  // Check authorization
  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-100 shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">
          {isOm ? 'Eeyyama Hin Qabdan' : 'Access Restricted'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isOm
            ? 'Fuula kana daawwachuuf mirga Bulchaa (Admin) qabaachuun dirqama.'
            : 'Only authorized Admins with member-management permissions can access bulk registration.'}
        </p>
        <button
          onClick={() => navigate('/members')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          {isOm ? 'Gara Miseensotaatti Deebi\'i' : 'Back to Members'}
        </button>
      </div>
    );
  }

  // Load History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/members/bulk-import/history');
      setHistoryJobs(data.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'history') {
      fetchHistory();
    }
  }, [viewMode]);

  // Download Templates
  const handleDownloadExcelTemplate = async () => {
    try {
      const response = await api.get('/members/bulk-import/template/excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'AMS_Bulk_Member_Registration_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download Excel template:', error);
    }
  };

  const handleDownloadCsvTemplate = async () => {
    try {
      const response = await api.get('/members/bulk-import/template/csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'AMS_Bulk_Member_Registration_Template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download CSV template:', error);
    }
  };

  // Handle File Selection
  const validateAndSetFile = (selectedFile: File) => {
    setUploadError(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = selectedFile.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setUploadError(
        isOm
          ? 'Faayiliin kun hin eeyyamamne. Maaloo faayilii Excel (.xlsx) ykn CSV (.csv) filadhaa.'
          : 'Invalid file format. Please upload an Excel (.xlsx) or CSV (.csv) file.'
      );
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError(
        isOm
          ? 'Hammi faayilii 10MB ol ta\'uu hin danda\'u.'
          : 'File size exceeds the 10MB limit.'
      );
      return;
    }

    setFile(selectedFile);
  };

  // Upload and parse preview
  const handleUploadAndPreview = async () => {
    if (!file) return;
    setParsing(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/members/bulk-import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(data.data);
      setCurrentStep(3);
    } catch (error: any) {
      console.error('Preview error:', error);
      const msg = error.response?.data?.message;
      setUploadError(msg || (isOm ? 'Faayilii dubbisuun hin danda\'amne.' : 'Failed to parse uploaded file.'));
    } finally {
      setParsing(false);
    }
  };

  // Download Error Report
  const handleDownloadErrorReport = async () => {
    if (!previewData?.rows) return;
    try {
      const response = await api.post(
        '/members/bulk-import/error-report',
        { rows: previewData.rows },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bulk_Import_Errors_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download error report:', err);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!previewData?.rows) return;
    const validRowsToImport = previewData.rows.filter(
      (r) => r.status === 'VALID' || r.status === 'WARNING'
    );
    if (validRowsToImport.length === 0) return;

    setImporting(true);
    try {
      const { data } = await api.post('/members/bulk-import/execute', {
        rows: validRowsToImport,
        filename: previewData.filename,
      });
      setImportResult(data.data);
      setCurrentStep(5);
    } catch (err: any) {
      console.error('Import execution error:', err);
      alert(err.response?.data?.message || 'Failed to complete bulk import.');
    } finally {
      setImporting(false);
    }
  };

  // Download Import Result Report
  const handleDownloadResultReport = () => {
    if (!importResult) return;
    const headers = [
      'Row Number',
      'Member ID',
      'Full Name',
      'Phone Number',
      'Join Date',
      'Back Contribution Weeks',
      'Total Back Contribution Amount',
      'Status',
    ];
    const successLines = importResult.importedMembers.map((m) =>
      [
        m.rowNumber,
        m.memberId,
        `"${m.fullName}"`,
        `"${m.phone}"`,
        m.joinDate,
        m.backContributionWeeks,
        m.totalBackContributionAmount,
        'SUCCESS',
      ].join(',')
    );
    const failLines = importResult.failedRows.map((f) =>
      [
        f.rowNumber,
        'N/A',
        `"${f.name}"`,
        `"${f.phone}"`,
        'N/A',
        0,
        0,
        `"FAILED: ${f.reason}"`,
      ].join(',')
    );

    const csv = [headers.join(','), ...successLines, ...failLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Import_Results_${importResult.importId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Filtered preview rows
  const filteredRows = (previewData?.rows || []).filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title={isOm ? "Galmee Miseensotaa Baay'ee (Bulk Import)" : 'Bulk Member Registration'}
        subtitle={
          isOm
            ? 'Faayilii Excel (.xlsx) ykn CSV (.csv) fayyadamuun miseensota baay\'ee al-tokkotti galmeessaa.'
            : 'Register multiple Afosha members at once by uploading an Excel (.xlsx) or CSV (.csv) file.'
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'wizard' ? 'history' : 'wizard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <HistoryIcon size={16} />
              {viewMode === 'wizard'
                ? isOm
                  ? 'Seenaa Galmee Ilaali'
                  : 'View Import History'
                : isOm
                ? 'Gara Galmee Baay\'eetti'
                : 'Back to Bulk Wizard'}
            </button>
            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
            >
              <Users size={16} />
              {isOm ? 'Tarree Miseensotaa' : 'Members Directory'}
            </Link>
          </div>
        }
      />

      {/* Navigation Tabs for Views */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode('wizard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            viewMode === 'wizard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UploadCloud size={16} />
          {isOm ? 'Wizaardii Galmee (5-Step Wizard)' : 'Registration Wizard'}
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            viewMode === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HistoryIcon size={16} />
          {isOm ? 'Seenaa Galmee Baay\'ee' : 'Import Job History'}
          {historyJobs.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
              {historyJobs.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW MODE: HISTORY                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {isOm ? 'Seenaa Galmee Baay\'ee' : 'Bulk Import Jobs History'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isOm
                  ? 'Galmeewwan duraan raawwataman, ragaa baay\'inaa fi bu\'aalee isaanii'
                  : 'All previous bulk registration jobs, their admin, counts, and statuses.'}
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <RotateCcw size={15} />
              {isOm ? 'Haaromsi' : 'Refresh'}
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          ) : historyJobs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {isOm ? 'Hanga ammaatti galmeen baay\'ee hin raawwatamne.' : 'No bulk import jobs found.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">{isOm ? 'Lakk. Galmee' : 'Import ID'}</th>
                    <th className="px-5 py-3">{isOm ? 'Maqaa Faayilii' : 'Original Filename'}</th>
                    <th className="px-5 py-3">{isOm ? 'Bulchaa' : 'Imported By'}</th>
                    <th className="px-5 py-3">{isOm ? 'Guyyaa' : 'Date'}</th>
                    <th className="px-5 py-3 text-center">{isOm ? 'Sararoota' : 'Total'}</th>
                    <th className="px-5 py-3 text-center text-emerald-600">
                      {isOm ? 'Milkaa\'an' : 'Success'}
                    </th>
                    <th className="px-5 py-3 text-center text-red-600">{isOm ? 'Kufan' : 'Failed'}</th>
                    <th className="px-5 py-3 text-center text-amber-600">{isOm ? 'Lammata' : 'Dup'}</th>
                    <th className="px-5 py-3 text-center">{isOm ? 'Haala' : 'Status'}</th>
                    <th className="px-5 py-3 text-right">{isOm ? 'Gocha' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {historyJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-blue-600">
                        {job.importId}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {job.originalFilename}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {job.importedBy?.username || 'Admin'}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-center font-bold">{job.totalRows}</td>
                      <td className="px-5 py-3 text-center font-bold text-emerald-600">
                        {job.successfulRows}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-red-600">
                        {job.failedRows}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-amber-600">
                        {job.duplicateRows}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : job.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <Eye size={13} />
                          {isOm ? 'Ilaali' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Job Details Modal */}
          {selectedJob && (
            <Modal
              open={!!selectedJob}
              onClose={() => setSelectedJob(null)}
              title={
                isOm
                  ? `Bal'ina Galmee: ${selectedJob.importId}`
                  : `Import Job Details: ${selectedJob.importId}`
              }
            >
              <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block">{isOm ? 'Faayilii' : 'Filename'}</span>
                    <span className="text-sm font-semibold text-slate-800 break-all">
                      {selectedJob.originalFilename}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">{isOm ? 'Milkaa\'an' : 'Successful'}</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {selectedJob.successfulRows}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">{isOm ? 'Kufan' : 'Failed'}</span>
                    <span className="text-sm font-bold text-red-600">{selectedJob.failedRows}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">{isOm ? 'Haala' : 'Status'}</span>
                    <span className="text-sm font-bold text-slate-800">{selectedJob.status}</span>
                  </div>
                </div>

                {/* Imported Members List */}
                {selectedJob.resultSummary?.importedMembers &&
                  selectedJob.resultSummary.importedMembers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {isOm ? 'Miseensota Galmaa\'an' : 'Registered Members'} (
                        {selectedJob.resultSummary.importedMembers.length})
                      </h4>
                      <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y">
                        {selectedJob.resultSummary.importedMembers.map((m: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 text-xs flex items-center justify-between hover:bg-slate-50"
                          >
                            <div>
                              <span className="font-bold text-slate-800 mr-2">{m.fullName}</span>
                              <span className="text-slate-400">{m.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                                {m.memberId}
                              </span>
                              {m.totalBackContributionAmount > 0 && (
                                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                                  {m.totalBackContributionAmount} ETB
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Failed Rows List */}
                {selectedJob.resultSummary?.failedRows &&
                  selectedJob.resultSummary.failedRows.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">
                        {isOm ? 'Sararoota Kufan' : 'Failed Rows'} (
                        {selectedJob.resultSummary.failedRows.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto border border-red-100 rounded-xl divide-y">
                        {selectedJob.resultSummary.failedRows.map((f: any, i: number) => (
                          <div key={i} className="p-3 text-xs bg-red-50/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800">
                                Row {f.rowNumber}: {f.name || 'Unnamed'} ({f.phone || 'No phone'})
                              </span>
                            </div>
                            <p className="text-red-600">{f.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW MODE: 5-STEP WIZARD                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'wizard' && (
        <div className="space-y-6">
          {/* Wizard Stepper Progress Bar */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-5 gap-2 sm:gap-4 text-center">
              {[
                { step: 1, labelEn: '1. Templates', labelOm: '1. Teempileetii' },
                { step: 2, labelEn: '2. Upload', labelOm: '2. Olkaa\'i' },
                { step: 3, labelEn: '3. Preview', labelOm: '3. Dursii Ilaali' },
                { step: 4, labelEn: '4. Confirm', labelOm: '4. Mirkaneessi' },
                { step: 5, labelEn: '5. Results', labelOm: '5. Bu\'aa' },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isPassed = currentStep > s.step;
                return (
                  <div key={s.step} className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPassed ? <Check size={16} /> : s.step}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium truncate max-w-full ${
                        isActive
                          ? 'text-blue-600 font-bold'
                          : isPassed
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {isOm ? s.labelOm : s.labelEn}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: DOWNLOAD TEMPLATE & INSTRUCTIONS                            */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Template Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Excel Template Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
                      <FileSpreadsheet size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {isOm ? 'Teempileetii Excel (.xlsx)' : 'Download Excel Template'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {isOm
                        ? 'Faayilii Excel qindaa\'e kan tarreeffama columns hundaa fi qajeelfama of keessaa qabu buufadhaa.'
                        : 'Pre-formatted Excel sheet with pre-defined headers, data validation rules, and sample entries.'}
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadExcelTemplate}
                    className="mt-6 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Download size={18} />
                    {isOm ? 'Teempileetii Excel (.xlsx) Buusi' : 'Download Excel (.xlsx)'}
                  </button>
                </div>

                {/* CSV Template Card */}
                <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
                      <FileText size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {isOm ? 'Teempileetii CSV (.csv)' : 'Download CSV Template'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {isOm
                        ? 'Faayilii CSV salphaa kan softiweerii kamiyyuu irratti banamu buufadhaa.'
                        : 'Standard comma-separated format compatible with any spreadsheet program or custom export.'}
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCsvTemplate}
                    className="mt-6 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Download size={18} />
                    {isOm ? 'Teempileetii CSV (.csv) Buusi' : 'Download CSV (.csv)'}
                  </button>
                </div>
              </div>

              {/* Data Dictionary & Rules */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <HelpCircle className="text-blue-600" size={20} />
                  <h4 className="text-base font-bold">
                    {isOm ? 'Qajeelfama Guutuu Columns 12' : 'Template Column Specifications'}
                  </h4>
                </div>
                <div className="table-responsive">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">{isOm ? 'Maqaa Column' : 'Column Name'}</th>
                        <th className="p-3">{isOm ? 'Dirqamaa?' : 'Requirement'}</th>
                        <th className="p-3">{isOm ? 'Gosa Ragaa' : 'Format / Example'}</th>
                        <th className="p-3">{isOm ? 'Ibsa' : 'Description'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-3 font-mono">1</td>
                        <td className="p-3 font-semibold text-slate-900">First Name</td>
                        <td className="p-3 text-red-600 font-bold">{isOm ? 'Dirqama' : 'Required'}</td>
                        <td className="p-3 font-mono text-slate-600">Tolasa</td>
                        <td className="p-3">{isOm ? 'Maqaa miseensaa' : 'Given first name'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">2</td>
                        <td className="p-3 font-semibold text-slate-900">Middle Name</td>
                        <td className="p-3 text-slate-400">{isOm ? 'Filannoo' : 'Optional'}</td>
                        <td className="p-3 font-mono text-slate-600">Girma</td>
                        <td className="p-3">{isOm ? 'Maqaa abbaa' : "Father's name"}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">3</td>
                        <td className="p-3 font-semibold text-slate-900">Last Name</td>
                        <td className="p-3 text-red-600 font-bold">{isOm ? 'Dirqama' : 'Required'}</td>
                        <td className="p-3 font-mono text-slate-600">Bulto</td>
                        <td className="p-3">{isOm ? 'Maqaa akaakayyuu' : "Grandfather's name"}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">4</td>
                        <td className="p-3 font-semibold text-slate-900">Gender</td>
                        <td className="p-3 text-red-600 font-bold">{isOm ? 'Dirqama' : 'Required'}</td>
                        <td className="p-3 font-mono text-slate-600">MALE / FEMALE / OTHER</td>
                        <td className="p-3">{isOm ? 'Saala miseensaa' : 'Gender identifier'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">5</td>
                        <td className="p-3 font-semibold text-slate-900">Date of Birth</td>
                        <td className="p-3 text-slate-400">{isOm ? 'Filannoo' : 'Optional'}</td>
                        <td className="p-3 font-mono text-slate-600">YYYY-MM-DD (1995-05-12)</td>
                        <td className="p-3">{isOm ? 'Guyyaa dhalootaa' : 'Birth date'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">6</td>
                        <td className="p-3 font-semibold text-slate-900">Phone Number</td>
                        <td className="p-3 text-red-600 font-bold">{isOm ? 'Dirqama' : 'Required'}</td>
                        <td className="p-3 font-mono text-slate-600">0911234567 / +251911234567</td>
                        <td className="p-3">{isOm ? 'Lakk bilbilaa Itoophiyaa addaa' : 'Unique phone number for login & OTP'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">7</td>
                        <td className="p-3 font-semibold text-slate-900">Email</td>
                        <td className="p-3 text-slate-400">{isOm ? 'Filannoo' : 'Optional'}</td>
                        <td className="p-3 font-mono text-slate-600">tolasa@example.com</td>
                        <td className="p-3">{isOm ? 'Imeelii qulqulluu' : 'Optional valid email'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">8</td>
                        <td className="p-3 font-semibold text-slate-900">Address</td>
                        <td className="p-3 text-slate-400">{isOm ? 'Filannoo' : 'Optional'}</td>
                        <td className="p-3 font-mono text-slate-600">Bole, Addis Ababa</td>
                        <td className="p-3">{isOm ? 'Teessoo ykn iddoo jireenyaa' : 'Living address / zone'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">9</td>
                        <td className="p-3 font-semibold text-slate-900">Emergency Contact Name</td>
                        <td className="p-3 text-slate-400">{isOm ? 'Filannoo' : 'Optional'}</td>
                        <td className="p-3 font-mono text-slate-600">Almaz Girma</td>
                        <td className="p-3">{isOm ? 'Maqaa fira yeroo balaa' : 'Emergency family contact'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">10</td>
                        <td className="p-3 font-semibold text-slate-900">Emergency Contact Phone</td>
                        <td className="p-3 text-slate-400">{isOm ? 'Filannoo' : 'Optional'}</td>
                        <td className="p-3 font-mono text-slate-600">0922334455</td>
                        <td className="p-3">{isOm ? 'Bilbila fira yeroo balaa' : 'Emergency contact phone'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">11</td>
                        <td className="p-3 font-semibold text-slate-900">Membership Start Date</td>
                        <td className="p-3 text-red-600 font-bold">{isOm ? 'Dirqama' : 'Required'}</td>
                        <td className="p-3 font-mono text-slate-600">YYYY-MM-DD (2024-09-11)</td>
                        <td className="p-3">
                          {isOm
                            ? 'Guyyaa ragaan hirmaannaa itti eegale (karoora faayinaansii dhuunfaa murteessa)'
                            : 'Official join date for computing historical back-contributions'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono">12</td>
                        <td className="p-3 font-semibold text-slate-900">Profile Photo URL</td>
                        <td className="p-3 text-slate-400">{isOm ? 'Filannoo' : 'Optional'}</td>
                        <td className="p-3 font-mono text-slate-600">https://...</td>
                        <td className="p-3">{isOm ? 'Suuraa qofa (dirqama miti)' : 'Optional photo URL'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                  >
                    {isOm ? 'Gara Tarkaanfii 2ffaa (Olkaa\'uu)' : 'Next: Upload File'}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 2: UPLOAD FILE                                                 */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {isOm ? 'Faayilii Excel ykn CSV Olkaa\'aa' : 'Upload Completed Spreadsheet'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {isOm
                    ? 'Faayilii guuttan asitti harkisaa ykn filachuun olkaa\'aa.'
                    : 'Select or drag your filled file. We will parse and validate each row before importing.'}
                </p>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    validateAndSetFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      validateAndSetFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                  <UploadCloud size={32} />
                </div>

                <h4 className="text-base font-bold text-slate-800">
                  {file ? file.name : isOm ? 'Faayilii asitti harkisaa ykn filadhaa' : 'Click to browse or drag and drop'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : isOm
                    ? 'Gosti eeyyamame: .xlsx, .csv (Hanga 10MB)'
                    : 'Supported formats: .xlsx, .csv (Max 10MB)'}
                </p>

                {file && (
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                    <CheckCircle2 size={14} />
                    {isOm ? 'Faayiliin qophaa\'eera' : 'File selected successfully'}
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <strong className="font-semibold">{isOm ? 'Dogoggora:' : 'Error:'}</strong>{' '}
                    {uploadError}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold transition"
                >
                  <ArrowLeft size={16} />
                  {isOm ? 'Duubatti' : 'Back to Templates'}
                </button>

                <button
                  disabled={!file || parsing}
                  onClick={handleUploadAndPreview}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  {parsing ? (
                    <>
                      <RotateCcw className="animate-spin" size={16} />
                      {isOm ? 'Qorachaa jira...' : 'Validating Rows...'}
                    </>
                  ) : (
                    <>
                      {isOm ? 'Dursii Ilaali & Qoradhu' : 'Preview & Validate'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 3: PREVIEW & VALIDATION                                        */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {currentStep === 3 && previewData && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div
                  onClick={() => setFilterStatus('ALL')}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    filterStatus === 'ALL'
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs text-slate-400 block">{isOm ? 'Ida\'ama' : 'Total Rows'}</span>
                  <span className="text-2xl font-black text-slate-800">{previewData.totalRows}</span>
                </div>
                <div
                  onClick={() => setFilterStatus('VALID')}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    filterStatus === 'VALID'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs text-emerald-600 block font-semibold">
                    {isOm ? 'Sirrii' : 'Valid'}
                  </span>
                  <span className="text-2xl font-black text-emerald-600">
                    {previewData.validRowsCount}
                  </span>
                </div>
                <div
                  onClick={() => setFilterStatus('INVALID')}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    filterStatus === 'INVALID'
                      ? 'border-red-500 bg-red-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs text-red-600 block font-semibold">
                    {isOm ? 'Dogoggora' : 'Invalid'}
                  </span>
                  <span className="text-2xl font-black text-red-600">
                    {previewData.invalidRowsCount}
                  </span>
                </div>
                <div
                  onClick={() => setFilterStatus('DUPLICATE')}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    filterStatus === 'DUPLICATE'
                      ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs text-amber-600 block font-semibold">
                    {isOm ? 'Lammata' : 'Duplicate'}
                  </span>
                  <span className="text-2xl font-black text-amber-600">
                    {previewData.duplicateRowsCount}
                  </span>
                </div>
                <div
                  onClick={() => setFilterStatus('WARNING')}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    filterStatus === 'WARNING'
                      ? 'border-yellow-500 bg-yellow-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs text-yellow-600 block font-semibold">
                    {isOm ? 'Akeekkachiisa' : 'Warnings'}
                  </span>
                  <span className="text-2xl font-black text-yellow-600">
                    {previewData.warningRowsCount}
                  </span>
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">
                    {isOm ? 'Filtara:' : 'Filter:'}
                  </span>
                  {['ALL', 'VALID', 'INVALID', 'DUPLICATE', 'WARNING'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        filterStatus === status
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {(previewData.invalidRowsCount > 0 || previewData.duplicateRowsCount > 0) && (
                    <button
                      onClick={handleDownloadErrorReport}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold transition"
                    >
                      <Download size={14} />
                      {isOm ? 'Gabaasa Dogoggoraa (CSV)' : 'Download Error Report (CSV)'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFile(null);
                      setCurrentStep(2);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    <RotateCcw size={14} />
                    {isOm ? 'Faayilii Jijjiiri' : 'Change File'}
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="table-responsive max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">{isOm ? 'Haala' : 'Status'}</th>
                        <th className="px-4 py-3">{isOm ? 'Maqaa Guutuu' : 'Full Name'}</th>
                        <th className="px-4 py-3">{isOm ? 'Bilbila' : 'Phone'}</th>
                        <th className="px-4 py-3">{isOm ? 'Saala' : 'Gender'}</th>
                        <th className="px-4 py-3">{isOm ? 'Hirmaannaa' : 'Join Date'}</th>
                        <th className="px-4 py-3">{isOm ? 'Faayinaansii Seenaa' : 'Back Obligation'}</th>
                        <th className="px-4 py-3">{isOm ? 'Dogoggora / Akeekkachiisa' : 'Validation Issues'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            {isOm ? 'Ragaan hin jiru.' : 'No rows match the selected filter.'}
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((r) => {
                          const isInvalid = r.status === 'INVALID';
                          const isDup = r.status === 'DUPLICATE';
                          const isWarn = r.status === 'WARNING';
                          return (
                            <tr
                              key={r.rowNumber}
                              className={`hover:bg-slate-50 transition ${
                                isInvalid
                                  ? 'bg-red-50/30'
                                  : isDup
                                  ? 'bg-amber-50/30'
                                  : isWarn
                                  ? 'bg-yellow-50/20'
                                  : ''
                              }`}
                            >
                              <td className="px-4 py-3 font-mono font-semibold text-slate-500">
                                {r.rowNumber}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    r.status === 'VALID'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : r.status === 'INVALID'
                                      ? 'bg-red-100 text-red-700'
                                      : r.status === 'DUPLICATE'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {r.fullName || '—'}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-600">
                                {r.normalizedPhone || r.phone || '—'}
                              </td>
                              <td className="px-4 py-3">{r.gender}</td>
                              <td className="px-4 py-3 font-mono text-slate-500">
                                {r.membershipStartDate}
                              </td>
                              <td className="px-4 py-3">
                                {r.financialAssessment &&
                                r.financialAssessment.totalBackContributionAmount > 0 ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <DollarSign size={12} />
                                    {r.financialAssessment.totalBackContributionAmount} ETB (
                                    {r.financialAssessment.backContributionWeeks}w)
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-medium">
                                    {isOm ? 'Qulqulluu' : 'Up to date'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                {r.errors.length > 0 && (
                                  <div className="text-red-600 font-medium space-y-0.5">
                                    {r.errors.map((err, i) => (
                                      <div key={i} className="flex items-start gap-1">
                                        <XCircle size={12} className="shrink-0 mt-0.5" />
                                        <span>{err}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {r.warnings.length > 0 && (
                                  <div className="text-amber-600 space-y-0.5 mt-1">
                                    {r.warnings.map((warn, i) => (
                                      <div key={i} className="flex items-start gap-1">
                                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                        <span>{warn}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {r.errors.length === 0 && r.warnings.length === 0 && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold transition"
                >
                  <ArrowLeft size={16} />
                  {isOm ? 'Gara Olkaa\'uutti' : 'Back to Upload'}
                </button>

                <button
                  disabled={previewData.validRowsCount === 0}
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  {isOm ? 'Gara Mirkaneessaa (Import Confirmation)' : 'Proceed to Confirmation'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 4: IMPORT CONFIRMATION                                         */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {currentStep === 4 && previewData && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {isOm ? 'Mirkaneessa Galmee Miseensotaa' : 'Confirm Bulk Member Import'}
                </h3>
                <p className="text-sm text-slate-500">
                  {isOm
                    ? 'Odeeffannoo armaan gadii mirkaneessaa. Sararootni sirrii qofti gara bu\'uura ragaatti galmaa\'u.'
                    : 'Review the import summary below. Only verified valid rows will be committed to the database.'}
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div>
                  <span className="text-xs text-slate-400 block">{isOm ? 'Ida\'ama' : 'Total Rows'}</span>
                  <span className="text-xl font-black text-slate-800">{previewData.totalRows}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 block font-semibold">
                    {isOm ? 'Qophii' : 'Ready to Import'}
                  </span>
                  <span className="text-xl font-black text-emerald-600">
                    {previewData.validRowsCount}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-red-500 block font-semibold">
                    {isOm ? 'Kufan' : 'Invalid Rows'}
                  </span>
                  <span className="text-xl font-black text-red-600">
                    {previewData.invalidRowsCount}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-amber-600 block font-semibold">
                    {isOm ? 'Lammata' : 'Duplicates'}
                  </span>
                  <span className="text-xl font-black text-amber-600">
                    {previewData.duplicateRowsCount}
                  </span>
                </div>
              </div>

              {/* Informational Alerts */}
              <div className="space-y-3">
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-900">
                    <Info size={14} />
                    {isOm ? 'Ulaagaalee Nageenyaa fi Seeraa:' : 'Security & Policy Compliance:'}
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-700 pl-1">
                    <li>
                      {isOm
                        ? 'Miseensotni galmaa\'an gahee MEMBER argatu; eeyyama Admin ykn Auditor hin argatan.'
                        : 'Imported members will strictly receive the MEMBER role (never Admin or Auditor).'}
                    </li>
                    <li>
                      {isOm
                        ? 'Kaffaltiiwwan seenaa (back-contributions) akkuma guyyaa hirmaannaatti herreegamu.'
                        : 'Historical back-contributions are calculated from each member\'s official start date.'}
                    </li>
                    <li>
                      {isOm
                        ? 'Ragaan galmee hundi seenaa (Audit Log) keessatti ni qabama.'
                        : 'Every import is logged with timestamp, admin ID, and row outcomes in the Audit Log.'}
                    </li>
                  </ul>
                </div>

                {previewData.invalidRowsCount > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>{previewData.invalidRowsCount}</strong>{' '}
                      {isOm
                        ? 'sararootni dogoggora qaban hin galmaa\'an. Gabaasa dogoggoraa buufachuun erga sirreessitanii booda olkaa\'uu dandeessu.'
                        : 'invalid rows will not be imported. You can download the error report to correct and re-upload them.'}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold transition"
                >
                  {isOm ? 'Gara Dursii Ilaaluutti' : 'Back to Preview'}
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewData(null);
                      setCurrentStep(1);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition"
                  >
                    {isOm ? 'Dhiisi' : 'Cancel'}
                  </button>
                  <button
                    disabled={importing || previewData.validRowsCount === 0}
                    onClick={handleExecuteImport}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <RotateCcw className="animate-spin" size={16} />
                        {isOm ? 'Galmeessaa jira...' : 'Importing Members...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        {isOm
                          ? `Sararoota ${previewData.validRowsCount} Galmeessi`
                          : `Import ${previewData.validRowsCount} Valid Members`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 5: IMPORT RESULTS                                              */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {currentStep === 5 && importResult && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Result Banner */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 sm:p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left">
                  <span className="px-3 py-1 bg-white/20 text-white text-xs font-mono font-bold rounded-full">
                    {importResult.importId}
                  </span>
                  <h3 className="text-2xl font-black">
                    {isOm ? 'Galmeen Milkaa\'inaan Xumurameera!' : 'Bulk Import Successfully Completed!'}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {isOm
                      ? `Miseensotni ${importResult.successfullyImported} bu'uura ragaatti galmaa'aniiru.`
                      : `Successfully registered ${importResult.successfullyImported} members into Afosha Management System.`}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleDownloadResultReport}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Download size={16} />
                    {isOm ? 'Gabaasa Buusi (CSV)' : 'Download Result Report'}
                  </button>
                  <Link
                    to="/members"
                    className="w-full sm:w-auto px-4 py-2.5 bg-black/30 hover:bg-black/40 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Users size={16} />
                    {isOm ? 'Tarree Miseensotaa' : 'Go to Members'}
                  </Link>
                </div>
              </div>

              {/* Outcome Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <span className="text-xs text-slate-400 block font-medium">
                    {isOm ? 'Milkaa\'inaan Galmaa\'an' : 'Successfully Registered'}
                  </span>
                  <span className="text-3xl font-black text-emerald-600">
                    {importResult.successfullyImported}
                  </span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <span className="text-xs text-slate-400 block font-medium">
                    {isOm ? 'Kufan' : 'Failed Rows'}
                  </span>
                  <span className="text-3xl font-black text-red-600">
                    {importResult.failedCount}
                  </span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <span className="text-xs text-slate-400 block font-medium">
                    {isOm ? 'Lammata Kan Darbaman' : 'Skipped Duplicates'}
                  </span>
                  <span className="text-3xl font-black text-amber-600">
                    {importResult.skippedDuplicates}
                  </span>
                </div>
              </div>

              {/* Registered Members Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">
                    {isOm ? 'Miseensota Haaraa Galmaa\'an' : 'Newly Registered Members'}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {importResult.importedMembers.length} records
                  </span>
                </div>
                <div className="table-responsive max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">{isOm ? 'Lakk. Miseensaa' : 'Member ID'}</th>
                        <th className="px-4 py-3">{isOm ? 'Maqaa Guutuu' : 'Full Name'}</th>
                        <th className="px-4 py-3">{isOm ? 'Bilbila' : 'Phone'}</th>
                        <th className="px-4 py-3">{isOm ? 'Guyyaa Hirmaannaa' : 'Start Date'}</th>
                        <th className="px-4 py-3">{isOm ? 'Kaffaltii Seenaa' : 'Back Obligations'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {importResult.importedMembers.map((m) => (
                        <tr key={m.memberId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{m.memberId}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{m.fullName}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{m.phone}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{m.joinDate}</td>
                          <td className="px-4 py-3">
                            {m.totalBackContributionAmount > 0 ? (
                              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {m.totalBackContributionAmount} ETB ({m.backContributionWeeks}w)
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-medium">0 ETB</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Start Another Import Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewData(null);
                    setImportResult(null);
                    setCurrentStep(1);
                  }}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  {isOm ? 'Galmee Haaraa Jalqabi' : 'Start Another Bulk Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
