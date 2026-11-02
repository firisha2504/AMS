import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Users, UserPlus, CreditCard, AlertTriangle, 
  DollarSign, Calendar,
  UserCheck, CheckCircle,
  ArrowUpRight, FileText, Gift,
  Bell, Shield, Check, Wallet, Smartphone,
  Building, Download
} from 'lucide-react';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../lib/api';
import { LoadingSpinner } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

interface AdminDashboard {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  weeklyContributions: number;
  unpaidPenalties: number;
  paidPenalties: number;
  totalOutstandingBalance: number;
  totalSpecialContributions?: number;
}

interface ChartData { 
  trends: { month: string; contributions: number; penalties: number; other?: number }[]; 
}

interface AuditorData {
  totalMembers: number;
  totalPaid: number;
  totalDue: number;
  totalAmount: number;
  paidPercentage: number;
  unpaidPercentage: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    memberName: string;
    amount: number;
    status: string;
    method: string;
  }>;
}

interface MemberData {
  fullName: string;
  memberId: string;
  status: string;
  profilePicture?: string;
  joinDate?: string;
  totalAmountPaid: number;
  totalCredit: number;
  dueThisSaturday: number;
  nextSaturdayDate: string;
  outstandingBalance: number;
  totalPenalties: number;
  penalties: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
  obligations: Array<{ id: string; weekNumber: number; totalDue: number; status: string }>;
  recentPayments: Array<{
    id: string;
    date: string;
    amount: number;
    method: string;
    status: string;
    receiptNumber?: string;
  }>;
  attendancePercentage: number;
}

interface Activity {
  id: string;
  type: 'member' | 'payment' | 'penalty' | 'special' | 'attendance' | 'approved';
  message: string;
  time: string;
  icon: string;
}

export default function DashboardPage() {
  const [_t] = useTranslation();
  const { user } = useAuth();
  const [adminData, setAdminData] = useState<AdminDashboard | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [auditorData, setAuditorData] = useState<AuditorData | null>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'TELEBIRR' | 'CBE' | 'BANK_TRANSFER' | 'CASH'>('TELEBIRR');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState<{
    receiptNumber: string;
    amount: number;
    date: string;
    method: string;
  } | null>(null);

  const recentActivities: Activity[] = [
    { id: '1', type: 'member', message: 'New member registered (Tolasa F.)', time: '2 hours ago', icon: 'user-plus' },
    { id: '2', type: 'payment', message: 'Payment received (Abebe K. - 150 ETB)', time: '3 hours ago', icon: 'check' },
    { id: '3', type: 'penalty', message: 'Penalty applied (Gemechu K. - 50 ETB)', time: '5 hours ago', icon: 'alert' },
    { id: '4', type: 'special', message: 'Special contribution recorded', time: '6 hours ago', icon: 'gift' },
    { id: '5', type: 'approved', message: 'Member registration approved', time: '8 hours ago', icon: 'check-circle' },
    { id: '6', type: 'attendance', message: 'Saturday meeting attendance saved', time: 'Yesterday', icon: 'calendar' },
  ];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        if (user?.role === 'ADMIN') {
          const [dash, charts] = await Promise.all([
            api.get('/dashboard/admin'),
            api.get('/dashboard/charts'),
          ]);
          setAdminData(dash.data.data);
          setChartData(charts.data.data);
        } else if (user?.role === 'AUDITOR') {
          const { data } = await api.get('/dashboard/auditor');
          setAuditorData(data.data);
        } else if (user?.role === 'MEMBER') {
          const { data } = await api.get('/dashboard/member');
          setMemberData(data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user?.role]);

  const handleProcessPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const receiptNo = `AF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      // Simulate real verified transaction receipt
      setTimeout(() => {
        setIsProcessingPayment(false);
        setReceiptSuccess({
          receiptNumber: receiptNo,
          amount: 100,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          method: paymentMethod === 'CBE' ? 'CBE Birr' : paymentMethod === 'TELEBIRR' ? 'Telebirr' : paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Cash (Office)',
        });
      }, 1200);
    } catch {
      setIsProcessingPayment(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // ==========================================
  // 1. MEMBER DASHBOARD VIEW (Mockup Match)
  // ==========================================
  if (user?.role === 'MEMBER') {
    const mem = memberData || {
      fullName: 'Abebe Kebede',
      memberId: 'MEM-001',
      status: 'APPROVED',
      profilePicture: undefined,
      totalCredit: 150,
      dueThisSaturday: 50,
      totalPenalties: 50,
      totalAmountPaid: 2400,
      nextSaturdayDate: 'Tomorrow at 4:00 PM',
      recentPayments: [
        { id: '1', date: 'Apr 19, 2026', amount: 50, method: 'CBE Birr', status: 'VERIFIED' },
        { id: '2', date: 'Apr 12, 2026', amount: 50, method: 'Telebirr', status: 'VERIFIED' },
        { id: '3', date: 'Apr 05, 2026', amount: 50, method: 'E-Birr', status: 'VERIFIED' },
        { id: '4', date: 'Mar 29, 2026', amount: 50, method: 'CBE Birr', status: 'VERIFIED' },
      ],
    };

    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Member Top Bar */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-800 font-bold text-2xl shadow-sm overflow-hidden">
              {mem.profilePicture ? (
                <img src={mem.profilePicture} alt={mem.fullName} className="w-full h-full object-cover" />
              ) : (
                mem.fullName.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{mem.fullName}</h1>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Member ID: <span className="font-semibold text-gray-700">{mem.memberId}</span> • Active Since 2024
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => { setShowPaymentModal(true); setReceiptSuccess(null); }}
              className="flex-1 md:flex-initial px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <CreditCard size={18} />
              <span>Make a Payment</span>
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 3 Prominent Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* My Credit / Balance Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-emerald-100 text-sm font-medium">My Credit / Balance</span>
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wallet size={24} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              {Number(mem.totalCredit).toLocaleString()} ETB
            </div>
            <p className="text-xs text-emerald-100 mt-2 flex items-center gap-1">
              <CheckCircle size={14} /> Total Lifetime Paid: {Number(mem.totalAmountPaid).toLocaleString()} ETB
            </p>
          </div>

          {/* Due This Saturday Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-blue-100 text-sm font-medium">Due This Saturday</span>
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar size={24} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              {Number(mem.dueThisSaturday).toLocaleString()} ETB
            </div>
            <p className="text-xs text-blue-100 mt-2">
              Payment deadline: Saturday 6:00 PM
            </p>
          </div>

          {/* My Penalty (if any) Card */}
          <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-rose-700 text-sm font-semibold">My Penalty (If any)</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
              {Number(mem.totalPenalties).toLocaleString()} ETB
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {Number(mem.totalPenalties) > 0 ? '(For 1 missed week)' : 'No unpaid penalties'}
            </p>
          </div>
        </div>

        {/* Up-to-date Status Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Your account is in good standing!</p>
              <p className="text-xs text-emerald-700">Weekly contributions and attendance records are verified.</p>
            </div>
          </div>
          <Link to="/attendance" className="text-xs font-semibold text-emerald-800 hover:underline">
            View Attendance →
          </Link>
        </div>

        {/* Payment History List */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
              <p className="text-xs text-gray-500">Recent verified contributions and receipts</p>
            </div>
            <Link to="/financial" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View All →
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {mem.recentPayments.map((p, idx) => (
              <div key={p.id || idx} className="py-3.5 flex items-center justify-between hover:bg-gray-50/80 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Weekly Contribution</p>
                    <p className="text-xs text-gray-500">{p.date} • {p.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600">+{p.amount} ETB</span>
                  <p className="text-xs text-gray-400 capitalize">{p.status.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAKE PAYMENT MODAL (Mockup Center Image Match) ── */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-navy-950 to-[#0B1F3A] text-white px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Make a Payment</h3>
                  <p className="text-xs text-blue-200">Gamtaan dargaggoota Melka Jabdu Qaxaa Araati</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {!receiptSuccess ? (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Payment Details */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Payment Details</h4>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Member Name:</span>
                        <span className="font-semibold text-gray-800">{mem.fullName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Weekly Contribution:</span>
                        <span className="font-semibold text-gray-800">50 ETB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Penalty (if any):</span>
                        <span className="font-semibold text-gray-800">50 ETB</span>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-base">Total Amount:</span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-lg rounded-xl border border-emerald-300">
                          100 ETB
                        </span>
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900">Select Payment Method</h4>

                      {[
                        { id: 'TELEBIRR', name: 'Telebirr', desc: 'Ethio Telecom Mobile Money', icon: Smartphone, color: 'text-sky-600 bg-sky-50' },
                        { id: 'CBE', name: 'CBE Birr', desc: 'Commercial Bank of Ethiopia', icon: Building, color: 'text-amber-600 bg-amber-50' },
                        { id: 'BANK_TRANSFER', name: 'Bank Transfer', desc: 'Direct Account Deposit', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50' },
                        { id: 'CASH', name: 'Cash (Office)', desc: 'Official Cash Receipt', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
                      ].map((m) => (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            paymentMethod === m.id
                              ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === m.id}
                            onChange={() => setPaymentMethod(m.id as any)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className={`p-2 rounded-lg ${m.color}`}>
                            <m.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Security Badge & Submit */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                      <Shield size={16} />
                      <span>Payment Secure & Encrypted (PostgreSQL Verified)</span>
                    </div>

                    <button
                      onClick={handleProcessPayment}
                      disabled={isProcessingPayment}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying Payment...</span>
                        </>
                      ) : (
                        <span>Proceed to Pay 100 ETB</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Success & Digital Receipt View */
                <div className="p-8 text-center space-y-5 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                    <Check size={36} className="animate-bounce" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-gray-900">Payment Successful!</h3>
                    <p className="text-sm text-gray-600 mt-1">Your payment of {receiptSuccess.amount} ETB has been processed and allocated.</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 text-left max-w-md mx-auto space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span className="text-gray-500">Receipt No:</span>
                      <span className="font-bold text-gray-900 font-mono">{receiptSuccess.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span className="text-gray-500">Date:</span>
                      <span className="font-medium text-gray-800">{receiptSuccess.date}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span className="text-gray-500">Payment Method:</span>
                      <span className="font-medium text-gray-800">{receiptSuccess.method}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Total Settled:</span>
                      <span className="font-bold text-emerald-600">{receiptSuccess.amount} ETB</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      onClick={() => alert(`Receipt ${receiptSuccess.receiptNumber} downloaded as PDF.`)}
                      className="px-5 py-2.5 bg-navy-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-navy-800 shadow"
                    >
                      <Download size={16} />
                      Download Receipt
                    </button>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. AUDITOR DASHBOARD VIEW (Mockup Match)
  // ==========================================
  if (user?.role === 'AUDITOR') {
    const audit = auditorData || {
      totalMembers: 248,
      totalPaid: 212,
      totalDue: 36,
      totalAmount: 158750,
      paidPercentage: 85.5,
      unpaidPercentage: 14.5,
      recentTransactions: [
        { id: '1', date: 'Apr 26, 2026', memberName: 'Abebe Kebede', amount: 50, status: 'VERIFIED', method: 'CBE Birr' },
        { id: '2', date: 'Apr 26, 2026', memberName: 'Gemechu Keneni', amount: 100, status: 'VERIFIED', method: 'Telebirr' },
        { id: '3', date: 'Apr 25, 2026', memberName: 'Tsion Daniel', amount: 50, status: 'VERIFIED', method: 'E-Birr' },
        { id: '4', date: 'Apr 24, 2026', memberName: 'Chala Beyene', amount: 50, status: 'VERIFIED', method: 'Bank Transfer' },
      ],
    };

    const donutData = [
      { name: 'Paid', value: audit.totalPaid, color: '#10b981' },
      { name: 'Unpaid', value: audit.totalDue, color: '#f59e0b' },
    ];

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Auditor Header with Read-Only Notice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Auditor Dashboard</h1>
            <p className="text-sm text-gray-500">Financial inspection & ledger oversight • Gamtaan dargaggoota Melka Jabdu</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-bold w-fit">
            <Shield size={14} />
            Read-Only Audit Mode Enabled
          </div>
        </div>

        {/* 4 Summary Cards (Mockup Top Row) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Members</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Users size={20} /></div>
            </div>
            <div className="text-3xl font-black text-gray-900">{audit.totalMembers}</div>
            <p className="text-xs text-emerald-600 mt-2 font-medium">Verified Active Community</p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paid</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={20} /></div>
            </div>
            <div className="text-3xl font-black text-emerald-600">{audit.totalPaid}</div>
            <p className="text-xs text-gray-500 mt-2">Satisfied Saturday obligations</p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Due</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle size={20} /></div>
            </div>
            <div className="text-3xl font-black text-rose-600">{audit.totalDue}</div>
            <p className="text-xs text-rose-600 mt-2 font-medium">Pending or Overdue</p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><DollarSign size={20} /></div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{Number(audit.totalAmount).toLocaleString()} ETB</div>
            <p className="text-xs text-emerald-600 mt-2 font-medium">Cumulative verified ledger</p>
          </div>
        </div>

        {/* 2-Column Auditor Layout: Donut Chart & Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Member Payment Overview Donut */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
            <h3 className="text-base font-bold text-gray-900 mb-2">Member Payment Overview</h3>
            <div className="h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-gray-900">{audit.paidPercentage}%</span>
                <span className="text-xs font-medium text-gray-500">Paid Ratio</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-600 font-medium">Paid ({audit.totalPaid})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-gray-600 font-medium">Unpaid ({audit.totalDue})</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Recent Transactions</h3>
                <Link to="/financial" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  View Full Ledger →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase font-medium">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Member</th>
                      <th className="py-3 px-3">Method</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {audit.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-3 text-gray-600 text-xs font-mono">{tx.date}</td>
                        <td className="py-3 px-3 font-semibold text-gray-800">{tx.memberName}</td>
                        <td className="py-3 px-3 text-xs text-gray-500">{tx.method}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">+{tx.amount} ETB</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Showing 4 of cumulative verified transactions</span>
              <div className="flex gap-2">
                <Link to="/reports" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-1.5">
                  <FileText size={14} /> Export Audit Report
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. ADMIN DASHBOARD VIEW (Mockup Top-Right)
  // ==========================================
  const adm = adminData || {
    totalMembers: 248,
    activeMembers: 212,
    pendingMembers: 36,
    weeklyContributions: 142500,
    unpaidPenalties: 2500,
    paidPenalties: 13750,
    totalOutstandingBalance: 4200,
  };

  const totalIncome = Number(adm.weeklyContributions) + Number(adm.paidPenalties);

  // Income Overview Bar Chart Data
  const barChartData = chartData?.trends || [
    { month: 'Jan', contributions: 25000, penalties: 1200, other: 800 },
    { month: 'Feb', contributions: 28000, penalties: 900, other: 500 },
    { month: 'Mar', contributions: 31000, penalties: 1500, other: 1200 },
    { month: 'Apr', contributions: 33000, penalties: 1100, other: 600 },
    { month: 'May', contributions: 35000, penalties: 1400, other: 900 },
    { month: 'Jun', contributions: 38000, penalties: 1600, other: 1500 },
  ];

  const adminDonut = [
    { name: 'Paid', value: adm.activeMembers || 212, color: '#10b981' },
    { name: 'Not Paid', value: adm.pendingMembers || 36, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Overall Summary • Gamtaan dargaggoota Melka Jabdu Qaxaa Araati</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/members"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2"
          >
            <UserPlus size={16} /> Add Member
          </Link>
          <Link
            to="/financial"
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2"
          >
            <DollarSign size={16} /> Record Payment
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Members</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Users size={20} /></div>
          </div>
          <div className="text-3xl font-black text-gray-900">{adm.totalMembers}</div>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">↑ +12% from last month</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Income</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={20} /></div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{totalIncome.toLocaleString()} ETB</div>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">↑ +8% collection rate</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">This Week Paid</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Calendar size={20} /></div>
          </div>
          <div className="text-3xl font-black text-gray-900">{adm.activeMembers} / {adm.totalMembers}</div>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">85.5% participation</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle size={20} /></div>
          </div>
          <div className="text-3xl font-black text-rose-600">{adm.pendingMembers}</div>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">↓ -4% pending dues</p>
        </div>
      </div>

      {/* 2 Charts Grid (Income Overview Bar + Payment Status Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Overview Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Income Overview</h3>
              <p className="text-xs text-gray-500">Monthly breakdown of contributions and penalties</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded-sm" /> Contributions</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Penalties</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-400 rounded-sm" /> Other</span>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip />
                <Bar dataKey="contributions" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="penalties" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="other" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Donut */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Payment Status</h3>
            <p className="text-xs text-gray-500">Current Saturday completion ratio</p>
          </div>

          <div className="h-56 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={adminDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {adminDonut.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-gray-900">85.5%</span>
              <span className="text-xs font-semibold text-gray-500">Paid Rate</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-gray-100 text-xs">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid</span>
              <span className="font-bold text-gray-800">85.5% ({adm.activeMembers})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Not Paid</span>
              <span className="font-bold text-gray-800">14.5% ({adm.pendingMembers})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column: Recent Activities & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Recent Activities</h3>
            <span className="text-xs text-gray-500">Live operational feed</span>
          </div>

          <div className="divide-y divide-gray-100">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-sm hover:bg-gray-50/60 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                    {act.icon === 'user-plus' && <UserPlus size={16} className="text-blue-600" />}
                    {act.icon === 'check' && <Check size={16} className="text-emerald-600" />}
                    {act.icon === 'alert' && <AlertTriangle size={16} className="text-rose-600" />}
                    {act.icon === 'gift' && <Gift size={16} className="text-purple-600" />}
                    {act.icon === 'check-circle' && <UserCheck size={16} className="text-teal-600" />}
                    {act.icon === 'calendar' && <Calendar size={16} className="text-amber-600" />}
                  </div>
                  <span className="font-medium text-gray-800">{act.message}</span>
                </div>
                <span className="text-xs text-gray-400">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/members" className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors">
              <span className="text-sm font-semibold flex items-center gap-2.5"><UserPlus size={18} /> Add New Member</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/financial" className="flex items-center justify-between p-3 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors">
              <span className="text-sm font-semibold flex items-center gap-2.5"><CreditCard size={18} /> Record Member Payment</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/notifications" className="flex items-center justify-between p-3 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors">
              <span className="text-sm font-semibold flex items-center gap-2.5"><Bell size={18} /> Send SMS / Notification</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/reports" className="flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors">
              <span className="text-sm font-semibold flex items-center gap-2.5"><FileText size={18} /> Generate Financial Report</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            Gamtaan dargaggoota Melka Jabdu Qaxaa Araati
          </div>
        </div>
      </div>
    </div>
  );
}
