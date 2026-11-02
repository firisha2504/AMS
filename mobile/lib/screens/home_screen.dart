import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';
import 'profile_screen.dart';
import 'contributions_screen.dart';
import 'payment_screen.dart';
import 'notifications_screen.dart';
import 'more_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int currentIndex = 0;
  Map<String, dynamic>? _dashboard;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _loading = true);
    try {
      final response = await ApiService.get('/dashboard/member');
      if (mounted) setState(() => _dashboard = response['data']);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final isOm = locale.locale.languageCode == 'om';

    final screens = [
      _DashboardTab(
          dashboard: _dashboard,
          isOm: isOm,
          loading: _loading,
          onRefresh: _loadDashboard),
      const PaymentScreen(),
      const NotificationsScreen(),
      const MoreScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: screens[currentIndex],
      bottomNavigationBar: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          final isDark = themeProvider.isDarkMode;
          return NavigationBar(
            selectedIndex: currentIndex,
            onDestinationSelected: (i) => setState(() => currentIndex = i),
            backgroundColor: isDark ? const Color(0xFF1A1F2E) : Colors.white,
            elevation: 8,
            shadowColor: Colors.black.withOpacity(isDark ? 0.3 : 0.12),
            destinations: [
              NavigationDestination(
                  icon: const Icon(Icons.home_outlined),
                  selectedIcon: const Icon(Icons.home),
                  label: isOm ? 'Mana' : 'Home'),
              NavigationDestination(
                  icon: const Icon(Icons.payment_outlined),
                  selectedIcon: const Icon(Icons.payment),
                  label: isOm ? 'Kaffaltii' : 'Payments'),
              NavigationDestination(
                  icon: const Icon(Icons.notifications_outlined),
                  selectedIcon: const Icon(Icons.notifications),
                  label: isOm ? 'Akeekkachiisa' : 'Alerts'),
              NavigationDestination(
                  icon: const Icon(Icons.more_horiz),
                  selectedIcon: const Icon(Icons.more_horiz),
                  label: isOm ? 'Biroo' : 'More'),
              NavigationDestination(
                  icon: const Icon(Icons.person_outlined),
                  selectedIcon: const Icon(Icons.person),
                  label: isOm ? 'Profaayil' : 'Profile'),
            ],
          );
        },
      ),
    );
  }
}

// -- Dashboard Tab ──────────────────────────────────────────────────────────────
class _DashboardTab extends StatefulWidget {
  final Map<String, dynamic>? dashboard;
  final bool isOm;
  final bool loading;
  final Future<void> Function() onRefresh;

  const _DashboardTab({
    this.dashboard,
    required this.isOm,
    required this.loading,
    required this.onRefresh,
  });

  @override
  State<_DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<_DashboardTab> {
  List<dynamic> _notifications = [];
  bool _notificationsLoading = false;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _notificationsLoading = true);
    try {
      final response = await ApiService.get('/settings/notifications');
      if (mounted) {
        setState(() => _notifications = response['data'] ?? []);
      }
    } catch (_) {}
    if (mounted) setState(() => _notificationsLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final locale = context.watch<LocaleProvider>();
    final isOm = locale.locale.languageCode == 'om';
    final primary = const Color(0xFF166534);
    final gold = const Color(0xFFD97706);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await widget.onRefresh();
          await _loadNotifications();
        },
        color: primary,
        child: Consumer<ThemeProvider>(
          builder: (context, themeProvider, _) {
            final isDark = themeProvider.isDarkMode;
            return CustomScrollView(
          slivers: [
            // -- App Bar ──
            SliverAppBar(
              expandedHeight: 160,
              pinned: true,
              backgroundColor: isDark ? const Color(0xFF0F1419) : primary,
              actions: [
                // Theme toggle
                Consumer<ThemeProvider>(
                  builder: (context, themeProvider, _) {
                    return IconButton(
                      icon: Icon(
                        themeProvider.isDarkMode 
                          ? Icons.light_mode 
                          : Icons.dark_mode,
                        color: Colors.white,
                      ),
                      onPressed: () => themeProvider.toggleTheme(),
                      tooltip: themeProvider.isDarkMode ? 'Light Mode' : 'Dark Mode',
                    );
                  },
                ),
                // Language toggle
                IconButton(
                  icon: const Icon(Icons.language, color: Colors.white),
                  onPressed: () => locale.toggleLocale(),
                  tooltip: 'Toggle Language',
                ),
                const SizedBox(width: 4),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        const Color(0xFF14532D),
                        const Color(0xFF166634),
                        const Color(0xFF15803D),
                      ],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Row(
                            children: [
                              // Avatar
                              Builder(
                                builder: (context) {
                                  final pic = widget.dashboard?['profilePicture'] as String?;
                                  final picUrl = pic != null && pic.isNotEmpty
                                      ? '${ApiConfig.baseUrl.replaceAll('/api', '')}$pic'
                                      : null;
                                  final initial = (widget.dashboard?['fullName'] as String? ??
                                          user?.phone ?? 'U')
                                      .substring(0, 1)
                                      .toUpperCase();
                                  return Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                          color: Colors.white.withOpacity(0.3),
                                          width: 2),
                                    ),
                                    child: ClipOval(
                                      child: picUrl != null
                                          ? Image.network(
                                              picUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) => Container(
                                                decoration: BoxDecoration(
                                                  gradient: LinearGradient(
                                                      colors: [gold, const Color(0xFFF59E0B)]),
                                                ),
                                                child: Center(
                                                  child: Text(initial,
                                                      style: const TextStyle(
                                                          color: Color(0xFF14532D),
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 18)),
                                                ),
                                              ),
                                            )
                                          : Container(
                                              decoration: BoxDecoration(
                                                gradient: LinearGradient(
                                                    colors: [gold, const Color(0xFFF59E0B)]),
                                              ),
                                              child: Center(
                                                child: Text(initial,
                                                    style: const TextStyle(
                                                        color: Color(0xFF14532D),
                                                        fontWeight: FontWeight.bold,
                                                        fontSize: 18)),
                                              ),
                                            ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      widget.isOm ? 'Nagaan Dhufta!' : 'Welcome back!',
                                      style: TextStyle(
                                          color: Colors.white.withOpacity(0.8),
                                          fontSize: 12),
                                    ),
                                    Text(
                                      widget.dashboard?['fullName'] ??
                                          user?.phone ??
                                          '',
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            if (widget.loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([

                    // -- NEW: Unread Notifications Banner ──
                    if (_notifications.isNotEmpty) ...[
                      _NotificationBanner(
                        notifications: _notifications,
                        isOm: widget.isOm,
                        primary: primary,
                      ),
                      const SizedBox(height: 16),
                    ],

                    // -- Quick Stats Row ──
                    _QuickStatsRow(dashboard: widget.dashboard, isOm: widget.isOm, primary: primary, gold: gold),
                    const SizedBox(height: 20),

                    // -- Financial Overview Cards ──
                    _SectionTitle(title: widget.isOm ? 'Haala Maallaqaa' : 'Financial Overview'),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: _FinanceCard(
                        title: widget.isOm ? 'Kaffaltii Waliigalaa' : 'Total Contributions',
                        value: '${_fmt(widget.dashboard?['totalContributions'])} ETB',
                        icon: Icons.payments_outlined,
                        color: primary,
                        onTap: () {
                          // Navigate to contributions tab
                          final state = context.findAncestorStateOfType<_HomeScreenState>();
                          if (state != null) {
                            state.setState(() {
                              state.currentIndex = 1;
                            });
                          }
                        },
                      )),
                    ]),
                    Row(children: [
                      Expanded(child: _FinanceCard(
                        title: widget.isOm ? 'Hanga Hafe' : 'Outstanding Balance',
                        value: '${_fmt(widget.dashboard?['outstandingBalance'])} ETB',
                        icon: Icons.account_balance_wallet_outlined,
                        color: const Color(0xFFEA580C),
                      )),
                      const SizedBox(width: 10),
                      Expanded(child: _FinanceCard(
                        title: widget.isOm ? 'Adabbii' : 'Total Penalties',
                        value: '${_fmt(widget.dashboard?['totalPenalties'])} ETB',
                        icon: Icons.warning_amber_outlined,
                        color: const Color(0xFFDC2626),
                      )),
                    ]),
                    const SizedBox(height: 20),

                    // -- Payment Summary Card ──
                    _PaymentSummaryCard(
                      totalAmountPaid: _fmt(widget.dashboard?['totalAmountPaid']),
                      totalPenalties: _fmt(widget.dashboard?['totalPenalties']),
                      outstandingBalance: _fmt(widget.dashboard?['outstandingBalance']),
                      isOm: widget.isOm,
                    ),
                    const SizedBox(height: 20),

                    // -- Attendance ──
                    _SectionTitle(title: widget.isOm ? 'Haala Argamaa' : 'Attendance'),
                    const SizedBox(height: 10),
                    _AttendanceCard(
                      percentage: (widget.dashboard?['attendancePercentage'] as num?)?.toInt() ?? 0,
                      isOm: widget.isOm,
                      primary: primary,
                    ),
                    const SizedBox(height: 20),

                    // -- Quick Actions ──
                    _SectionTitle(title: widget.isOm ? 'Gochaa Hatattamaa' : 'Quick Actions'),
                    const SizedBox(height: 10),
                    _QuickActions(isOm: widget.isOm, primary: primary, gold: gold),
                    const SizedBox(height: 20),

                    // -- Upcoming Meetings ──
                    if (widget.dashboard?['upcomingMeetings'] != null &&
                        (widget.dashboard!['upcomingMeetings'] as List).isNotEmpty) ...[
                      _SectionTitle(title: widget.isOm ? 'Walga\'ii Dhufaa Jiran' : 'Upcoming Meetings'),
                      const SizedBox(height: 10),
                      ...(widget.dashboard!['upcomingMeetings'] as List).map((m) =>
                          _MeetingCard(meeting: m, isOm: widget.isOm, primary: primary)),
                      const SizedBox(height: 20),
                    ],

                    // -- Recent Notifications from Dashboard ──
                    if (widget.dashboard?['recentNotifications'] != null &&
                        (widget.dashboard!['recentNotifications'] as List).isNotEmpty) ...[
                      _SectionTitle(title: widget.isOm ? 'Beeksisa Dhiyoo Biroo' : 'More Notifications'),
                      const SizedBox(height: 10),
                      ...(widget.dashboard!['recentNotifications'] as List)
                          .take(3)
                          .map((n) => _NotifCard(notif: n, isOm: widget.isOm)),
                    ],

                    const SizedBox(height: 24),
                  ]),
                ),
              ),
            ],
            );
          },
        ),
      ),
    );
  }

  static String _fmt(dynamic val) {
    if (val == null) return '0';
    final n = num.tryParse(val.toString()) ?? 0;
    return n.toStringAsFixed(0);
  }
}

// -- Notification Banner ───────────────────────────────────────────────────────
class _NotificationBanner extends StatelessWidget {
  final List<dynamic> notifications;
  final bool isOm;
  final Color primary;

  const _NotificationBanner({
    required this.notifications,
    required this.isOm,
    required this.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        
        // Get unread notifications
        final unread = notifications.where((n) => n['isRead'] != true).toList();
        
        if (unread.isEmpty) {
          return const SizedBox.shrink();
        }

        // Show the most recent unread notification
        final latest = unread.first;

        return GestureDetector(
          onTap: () {
            // Navigate to notifications page
            final state = context.findAncestorStateOfType<_HomeScreenState>();
            if (state != null) {
              state.setState(() {
                state.currentIndex = 2;
              });
            }
          },
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [
                        Colors.blue.shade900.withOpacity(0.3),
                        Colors.blue.shade800.withOpacity(0.2),
                      ]
                    : [
                        Colors.blue.shade50,
                        Colors.blue.shade100.withOpacity(0.5),
                      ],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark ? Colors.blue.shade700 : Colors.blue.shade200,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withOpacity(isDark ? 0.15 : 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.blue.shade600,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.notifications_active,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              isOm
                                  ? (latest['titleOm'] ?? latest['title'] ?? '')
                                  : (latest['title'] ?? ''),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isDark
                                    ? const Color(0xFFE5E7EB)
                                    : Colors.black87,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (unread.length > 1)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade600,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '+${unread.length - 1}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isOm
                            ? (latest['messageOm'] ?? latest['message'] ?? '')
                            : (latest['message'] ?? ''),
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 14,
                  color: Colors.blue.shade400,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// Quick Stats Row
class _QuickStatsRow extends StatelessWidget {
  final Map<String, dynamic>? dashboard;
  final bool isOm;
  final Color primary;
  final Color gold;

  const _QuickStatsRow({this.dashboard, required this.isOm, required this.primary, required this.gold});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                primary.withOpacity(isDark ? 0.08 : 0.08),
                gold.withOpacity(isDark ? 0.04 : 0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? primary.withOpacity(0.2) : primary.withOpacity(0.12),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _QuickStat(
                label: isOm ? 'ID' : 'Member ID',
                value: dashboard?['memberId'] ?? '-',
                color: primary,
                isDark: isDark,
              ),
              _Divider(isDark: isDark),
              _QuickStat(
                label: isOm ? 'Haala' : 'Status',
                value: dashboard?['status'] ?? 'APPROVED',
                color: Colors.green.shade700,
                isDark: isDark,
              ),
              _Divider(isDark: isDark),
              _QuickStat(
                label: isOm ? 'Argama' : 'Attendance',
                value: '${dashboard?['attendancePercentage'] ?? 0}%',
                color: gold,
                isDark: isDark,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Divider extends StatelessWidget {
  final bool isDark;
  const _Divider({this.isDark = false});
  
  @override
  Widget build(BuildContext context) =>
      Container(
        width: 1,
        height: 32,
        color: isDark ? Colors.grey.shade700 : Colors.grey.shade200,
      );
}

class _QuickStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const _QuickStat({
    required this.label,
    required this.value,
    required this.color,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 15,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isDark ? Colors.grey.shade500 : Colors.grey,
          ),
        ),
      ],
    );
  }
}

// -- Finance Card ──────────────────────────────────────────────────────────────
class _FinanceCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _FinanceCard({
    required this.title, 
    required this.value, 
    required this.icon, 
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        return GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isDark ? const Color(0xFF2D3748) : Colors.grey.shade100,
              ),
              boxShadow: [BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              )],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: color.withOpacity(isDark ? 0.15 : 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(icon, color: color, size: 18),
                    ),
                    if (onTap != null)
                      Icon(Icons.arrow_forward_ios, size: 12, color: isDark ? Colors.grey.shade600 : Colors.grey.shade400),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  value,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.grey.shade500 : Colors.grey,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// -- Attendance Card ───────────────────────────────────────────────────────────
class _AttendanceCard extends StatelessWidget {
  final int percentage;
  final bool isOm;
  final Color primary;

  const _AttendanceCard({required this.percentage, required this.isOm, required this.primary});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        final color = percentage >= 80 ? Colors.green.shade600
            : percentage >= 60 ? Colors.orange.shade600
            : Colors.red.shade600;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? const Color(0xFF2D3748) : Colors.grey.shade100,
            ),
            boxShadow: [BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            )],
          ),
          child: Row(
            children: [
              SizedBox(
                width: 64,
                height: 64,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: percentage / 100,
                      backgroundColor: isDark ? Colors.grey.shade700 : Colors.grey.shade100,
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                      strokeWidth: 6,
                    ),
                    Text(
                      '$percentage%',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: color,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOm ? 'Argama Waliigalaa' : 'Overall Attendance',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      percentage >= 80
                          ? (isOm ? 'Baay\'ee gaarii!' : 'Excellent attendance!')
                          : percentage >= 60
                              ? (isOm ? 'Garii, itti fufaa!' : 'Good, keep it up!')
                              : (isOm ? 'Argama fooyyessaa!' : 'Needs improvement'),
                      style: TextStyle(fontSize: 12, color: color),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// -- Quick Actions ─────────────────────────────────────────────────────────────
class _QuickActions extends StatelessWidget {
  final bool isOm;
  final Color primary;
  final Color gold;

  const _QuickActions({required this.isOm, required this.primary, required this.gold});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        final actions = [
          _Action(icon: Icons.payment_outlined, label: isOm ? 'Kaffaltii' : 'Payments', color: primary, index: 1),
          _Action(icon: Icons.receipt_long_outlined, label: isOm ? 'Herrega' : 'Receipts', color: gold, index: 3),
          _Action(icon: Icons.event_available_outlined, label: isOm ? 'Argama' : 'Attendance', color: Colors.teal.shade600, index: 3),
        ];

        return GridView.count(
          crossAxisCount: 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: actions
              .map((a) => _ActionTile(
                    action: a,
                    isDark: isDark,
                    onTap: () {
                      final state = context.findAncestorStateOfType<_HomeScreenState>();
                      if (state != null) {
                        state.setState(() {
                          state.currentIndex = a.index;
                        });
                      }
                    },
                  ))
              .toList(),
        );
      },
    );
  }
}

class _Action {
  final IconData icon;
  final String label;
  final Color color;
  final int index; // bottom nav index to jump to

  const _Action({required this.icon, required this.label, required this.color, required this.index});
}

class _ActionTile extends StatelessWidget {
  final _Action action;
  final VoidCallback onTap;
  final bool isDark;

  const _ActionTile({
    required this.action,
    required this.onTap,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: action.color.withOpacity(isDark ? 0.15 : 0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: action.color.withOpacity(isDark ? 0.25 : 0.15),
              ),
            ),
            child: Icon(action.icon, color: action.color, size: 24),
          ),
          const SizedBox(height: 6),
          Text(
            action.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF0F172A),
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// -- Meeting Card ──────────────────────────────────────────────────────────────
class _MeetingCard extends StatelessWidget {
  final Map<String, dynamic> meeting;
  final bool isOm;
  final Color primary;

  const _MeetingCard({required this.meeting, required this.isOm, required this.primary});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        final date = DateTime.tryParse(meeting['meetingDate'] ?? '');
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isDark ? const Color(0xFF2D3748) : Colors.grey.shade100,
            ),
            boxShadow: [BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
              blurRadius: 6,
            )],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 52,
                decoration: BoxDecoration(
                  color: primary.withOpacity(isDark ? 0.12 : 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      date != null ? _monthName(date.month) : '-',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: primary,
                      ),
                    ),
                    Text(
                      date != null ? date.day.toString() : '-',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: primary,
                        height: 1.1,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      meeting['title'] ?? '',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF0F172A),
                      ),
                    ),
                    if (meeting['meetingTime'] != null)
                      Text(
                        meeting['meetingTime'],
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey.shade500 : Colors.grey,
                        ),
                      ),
                    if (meeting['location'] != null)
                      Row(
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            size: 12,
                            color: isDark ? Colors.grey.shade500 : Colors.grey,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            meeting['location'],
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? Colors.grey.shade500 : Colors.grey,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static String _monthName(int m) =>
      ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][m - 1];
}

// -- Notification Card ─────────────────────────────────────────────────────────
class _NotifCard extends StatelessWidget {
  final Map<String, dynamic> notif;
  final bool isOm;

  const _NotifCard({required this.notif, required this.isOm});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? const Color(0xFF2D3748) : Colors.grey.shade100,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isDark ? Colors.blue.shade900 : Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.notifications_outlined,
                  color: Colors.blue.shade600,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOm
                          ? (notif['titleOm'] ?? notif['title'] ?? '')
                          : (notif['title'] ?? ''),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      isOm
                          ? (notif['messageOm'] ?? notif['message'] ?? '')
                          : (notif['message'] ?? ''),
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.grey.shade500 : Colors.grey,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// -- Section Title ─────────────────────────────────────────────────────────────
class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        return Row(
          children: [
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Divider(
                color: isDark ? Colors.grey.shade700 : Colors.grey.shade200,
              ),
            ),
          ],
        );
      },
    );
  }
}

// -- Payment Summary Card ──────────────────────────────────────────────────────
class _PaymentSummaryCard extends StatelessWidget {
  final String totalAmountPaid;
  final String totalPenalties;
  final String outstandingBalance;
  final bool isOm;

  const _PaymentSummaryCard({
    required this.totalAmountPaid,
    required this.totalPenalties,
    required this.outstandingBalance,
    required this.isOm,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? const Color(0xFF2D3748) : Colors.grey.shade100,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isOm ? 'Haala Kaffaltii' : 'Payment Summary',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  // Total Amount Paid
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50.withOpacity(isDark ? 0.15 : 1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.green.shade200.withOpacity(isDark ? 0.3 : 1),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.check_circle,
                                color: Colors.green.shade600,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isOm ? 'Caffaltii' : 'Paid',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark
                                      ? Colors.green.shade300
                                      : Colors.green.shade700,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$totalAmountPaid ETB',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.green.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Penalties
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50.withOpacity(isDark ? 0.15 : 1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.red.shade200.withOpacity(isDark ? 0.3 : 1),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.warning_rounded,
                                color: Colors.red.shade600,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isOm ? 'Adabbii' : 'Penalties',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? Colors.red.shade300 : Colors.red.shade700,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$totalPenalties ETB',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.red.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Outstanding
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50.withOpacity(isDark ? 0.15 : 1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.orange.shade200.withOpacity(isDark ? 0.3 : 1),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.pending,
                                color: Colors.orange.shade600,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isOm ? 'Hafe' : 'Due',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark
                                      ? Colors.orange.shade300
                                      : Colors.orange.shade700,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$outstandingBalance ETB',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.orange.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
