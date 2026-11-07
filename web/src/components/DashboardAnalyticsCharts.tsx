import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Calendar, Users, DollarSign, Activity, FileText, Download, Filter
} from 'lucide-react';

interface AnalyticsProps {
  attendanceData?: any;
  financialData?: any;
  memberData?: any;
  meetingData?: any;
  onAttendanceFilterChange?: (range: string) => void;
  isAuditor?: boolean;
}

export default function DashboardAnalyticsCharts({
  attendanceData,
  financialData,
  memberData,
  meetingData,
  onAttendanceFilterChange,
  isAuditor: _isAuditor = false,
}: AnalyticsProps) {
  const { i18n } = useTranslation();
  const isOm = i18n.language === 'om';
  const [activeTab, setActiveTab] = useState<'financial' | 'attendance' | 'members' | 'meetings'>('financial');
  const [attendanceRange, setAttendanceRange] = useState('month');

  const handleRangeChange = (r: string) => {
    setAttendanceRange(r);
    if (onAttendanceFilterChange) onAttendanceFilterChange(r);
  };

  const attendanceOverviewData = [
    { name: isOm ? 'Argamanii' : 'Present', value: attendanceData?.overview?.present || 0, color: '#10B981' },
    { name: isOm ? 'Hafanii' : 'Absent', value: attendanceData?.overview?.absent || 0, color: '#EF4444' },
    { name: isOm ? 'Hayyamaman' : 'Excused', value: attendanceData?.overview?.excused || 0, color: '#3B82F6' },
    { name: isOm ? 'Bariifatan' : 'Late', value: attendanceData?.overview?.late || 0, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  const categoryDistribution = (financialData?.categoryMetrics
    ? Object.values(financialData.categoryMetrics)
    : []
  ).map((c: any) => ({
    name: isOm && c.categoryNameOm ? c.categoryNameOm : c.categoryName,
    value: c.totalPaid || 0,
    color: c.color || '#10B981',
  })).filter((c: any) => c.value > 0);

  const paymentStatusData = (financialData?.paymentStatusDistribution || []).filter((d: any) => d.value > 0);

  // Export utility for PDF/Excel CSV
  const handleExportCSV = (type: string) => {
    let rows: any[] = [];
    let filename = `afosha-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'financial' && financialData?.monthlyTrends) {
      rows = financialData.monthlyTrends.map((t: any) => ({
        Month: t.month,
        WeeklyContributions: t.weeklyContributions,
        Penalties: t.penalties,
        SpecialContributions: t.specialContributions,
        EmergencyContributions: t.emergencyContributions,
        Expenses: t.expenses,
        NetCash: t.netCash,
      }));
    } else if (type === 'attendance' && attendanceData?.meetingComparison) {
      rows = attendanceData.meetingComparison.map((m: any) => ({
        Meeting: m.title,
        Date: m.date,
        Present: m.present,
        Absent: m.absent,
        Excused: m.excused,
        AttendanceRate: `${m.attendanceRate}%`,
      }));
    }

    if (rows.length === 0) {
      alert(isOm ? 'Ragaan baasuuf jiru hin jiru' : 'No records available to export');
      return;
    }

    const headers = Object.keys(rows[0]).join(',');
    const values = rows.map((r: any) => Object.values(r).join(',')).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + headers + '\n' + values;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'financial', label: isOm ? 'Xiinxala Faayinaansii' : 'Financial Analytics', icon: DollarSign },
            { id: 'attendance', label: isOm ? 'Xiinxala Hirmaannaa' : 'Attendance Analytics', icon: Calendar },
            { id: 'members', label: isOm ? 'Xiinxala Miseensotaa' : 'Member Analytics', icon: Users },
            { id: 'meetings', label: isOm ? 'Xiinxala Walga\'ii' : 'Meetings Analytics', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                  active
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportCSV(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
          >
            <Download size={14} />
            <span>{isOm ? 'Gabaasa Baasi' : 'Export Data (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. FINANCIAL ANALYTICS TAB                                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Monthly Income and Expenses Grouped Bar Chart */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {isOm ? 'Galii fi Baasii Ji\'ootaa' : 'Monthly Income and Expenses'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isOm
                    ? 'Waliigala kaffaltii mirkanaa\'eefi baasii baafame'
                    : 'Confirmed verified collections vs approved organizational expenses'}
                </p>
              </div>
            </div>

            {financialData?.monthlyTrends && financialData.monthlyTrends.length > 0 ? (
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={financialData.monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, '']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="weeklyContributions" name={isOm ? 'Kaffaltii Torbanii' : 'Weekly'} fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="penalties" name={isOm ? 'Adabbii' : 'Penalties'} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="specialContributions" name={isOm ? 'Gumaacha Addaa' : 'Special'} fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name={isOm ? 'Baasii' : 'Expenses'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-xs">
                <FileText size={32} className="mb-2 text-gray-300" />
                <p>{isOm ? 'Ragaan galii fi baasii hin jiru' : 'No income or expense records found'}</p>
              </div>
            )}
          </div>

          {/* 2-Column: Category Distribution & Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Doughnut */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {isOm ? 'Raabsa Gosoota Kaffaltii 7' : 'Payment Category Distribution (7 Categories)'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isOm ? 'Hanga kaffalame gosootaan' : 'Collected amount distribution by payment category'}
                </p>
              </div>

              {categoryDistribution.length > 0 ? (
                <div className="h-64 w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry: any, idx: number) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, '']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                  <p>{isOm ? 'Kaffaltiin hin galmoofne' : 'No categorized payments collected yet'}</p>
                </div>
              )}
            </div>

            {/* Payment Status Doughnut */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {isOm ? 'Haala Kaffaltii Waliigalaa' : 'Payment Status Distribution'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isOm ? 'Mirkanaa\'e, Eegaa, Hafe' : 'Breakdown of obligations by payment status'}
                </p>
              </div>

              {paymentStatusData.length > 0 ? (
                <div className="h-64 w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry: any, idx: number) => (
                          <Cell key={`cell-status-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} obligations`, '']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                  <p>{isOm ? 'Galmeen hin jiru' : 'No obligation records found'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Receivables Bar Chart */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm w-full min-w-0">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {isOm ? 'Qorannoo Hafe Kaffalamuu' : 'Outstanding Receivables by Category'}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              {isOm ? 'Hanga hafe kaffalamuu fi kaffalame wal-bira qabuun' : 'Collected cash vs remaining receivables per category'}
            </p>

            {financialData?.outstandingBalanceAnalysis && financialData.outstandingBalanceAnalysis.length > 0 ? (
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={financialData.outstandingBalanceAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, '']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="collected" name={isOm ? 'Kaffalame' : 'Collected'} fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outstanding" name={isOm ? 'Hafe' : 'Outstanding'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
                <p>{isOm ? 'Ragaan hin jiru' : 'No outstanding balances'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. ATTENDANCE ANALYTICS TAB                                            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {isOm ? 'Yeroo Filtari:' : 'Time Filter:'}
              </span>
              <div className="flex gap-1.5">
                {[
                  { id: 'today', label: isOm ? 'Har\'a' : 'Today' },
                  { id: 'week', label: isOm ? 'Torban Kana' : 'This Week' },
                  { id: 'month', label: isOm ? 'Ji\'a Kana' : 'This Month' },
                  { id: 'year', label: isOm ? 'Waggaa Kana' : 'This Year' },
                  { id: 'all', label: isOm ? 'Hunda' : 'All Time' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleRangeChange(f.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      attendanceRange === f.id
                        ? 'bg-emerald-700 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{isOm ? 'Kaffaltii Hirmaannaa:' : 'Attendance Rate:'}</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {attendanceData?.overview?.attendanceRate || 0}%
              </span>
            </div>
          </div>

          {/* 2-Column: Attendance Doughnut & Meeting Trends Line Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overview Doughnut */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {isOm ? 'Haala Hirmaannaa Waliigalaa' : 'Attendance Overview'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isOm ? 'Argamanii, Hafanii, Hayyamaman, Bariifatan' : 'Breakdown by attendance status'}
                </p>
              </div>

              {attendanceOverviewData.length > 0 ? (
                <div className="h-64 w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={attendanceOverviewData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {attendanceOverviewData.map((entry: any, idx: number) => (
                          <Cell key={`att-cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} records`, '']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                  <p>{isOm ? 'Galmeen hirmaannaa hin jiru' : 'No attendance records recorded'}</p>
                </div>
              )}
            </div>

            {/* Attendance Trends Line Chart */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {isOm ? 'Tarkaanfii Hirmaannaa Yeroo' : 'Attendance Rate Trends'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isOm ? 'Dhibbeentaa hirmaannaa walga\'iiwwan darban' : 'Attendance percentage across conducted meetings'}
                </p>
              </div>

              {attendanceData?.trends && attendanceData.trends.length > 0 ? (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <LineChart data={attendanceData.trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <Tooltip formatter={(val: any) => [`${val}%`, 'Attendance Rate']} />
                      <Line type="monotone" dataKey="attendanceRate" name={isOm ? 'Dhibbeentaa' : 'Rate %'} stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                  <p>{isOm ? 'Walga\'iin hin geggeeffamne' : 'No meeting attendance trend data available'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Meeting Attendance Comparison Bar Chart */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm w-full min-w-0">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {isOm ? 'Wal-bira Qabiyyaa Walga\'iiwwanii' : 'Meeting Attendance Comparison'}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              {isOm ? 'Baay\'ina miseensota argamaniifi hafanii' : 'Present vs absent member counts per meeting'}
            </p>

            {attendanceData?.meetingComparison && attendanceData.meetingComparison.length > 0 ? (
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={attendanceData.meetingComparison}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="title" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="present" name={isOm ? 'Argamanii' : 'Present'} fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name={isOm ? 'Hafanii' : 'Absent'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="excused" name={isOm ? 'Hayyamaman' : 'Excused'} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
                <p>{isOm ? 'Walga\'iin hin jiru' : 'No meeting records found'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 3. MEMBER ANALYTICS TAB                                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Member Growth Curve */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {isOm ? 'Guddina Miseensotaa' : 'Member Registration Growth'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isOm ? 'Baay\'ina miseensota haaraa galmaa\'an' : 'Cumulative active community membership over time'}
                </p>
              </div>

              {memberData?.growthTrends && memberData.growthTrends.length > 0 ? (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <AreaChart data={memberData.growthTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="totalMembers" name={isOm ? 'Waliigala' : 'Total Members'} stroke="#10B981" fill="#D1FAE5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                  <p>{isOm ? 'Ragaan galmee hin jiru' : 'No registration trends yet'}</p>
                </div>
              )}
            </div>

            {/* Membership Status Doughnut */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between w-full min-w-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {isOm ? 'Haala Miseensummaa' : 'Membership Status Distribution'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isOm ? 'Mirkanaa\'e, Eegaa, Dhaabbate' : 'Active, pending, inactive, suspended members'}
                </p>
              </div>

              {memberData?.statusDistribution && memberData.statusDistribution.length > 0 ? (
                <div className="h-64 w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={memberData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {memberData.statusDistribution.map((entry: any, idx: number) => (
                          <Cell key={`status-cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                  <p>{isOm ? 'Miseensi hin jiru' : 'No members registered'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 4. MEETINGS ANALYTICS TAB                                              */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">{isOm ? 'Walga\'ii Geggeeffame' : 'Conducted Meetings'}</span>
              <div className="text-3xl font-black text-emerald-600 mt-2">{meetingData?.conductedMeetings || 0}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">{isOm ? 'Walga\'ii Saganteeffame' : 'Scheduled Meetings'}</span>
              <div className="text-3xl font-black text-blue-600 mt-2">{meetingData?.scheduledMeetings || 0}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">{isOm ? 'Walga\'ii Haqame' : 'Cancelled Meetings'}</span>
              <div className="text-3xl font-black text-gray-400 mt-2">{meetingData?.cancelledMeetings || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
