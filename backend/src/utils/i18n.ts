export const messages = {
  en: {
    reports: {
      // shared column headers
      headerMemberId: 'Member ID',
      headerName: 'Name',
      headerAmount: 'Amount',
      headerMethod: 'Method',
      headerDate: 'Date',
      headerBalance: 'Balance',
      headerReason: 'Reason',
      headerMeeting: 'Meeting',
      headerStatus: 'Status',
      headerType: 'Type',
      headerBeneficiary: 'Beneficiary',
      headerObligations: 'Obligations',
      headerMetric: 'Metric',
      headerValue: 'Value',
      // report titles
      titleUnpaid: 'Unpaid Contributions Report',
      titleContributions: 'Contributions Report',
      titlePenalties: 'Penalties Report',
      titleAttendance: 'Attendance Report',
      titleSpecialContributions: 'Special Contributions Report',
      titleYearEnd: 'Year-End Summary',
      // year-end summary metric labels
      metricYear: 'Year',
      metricTotalContributions: 'Total Contributions',
      metricTotalPenalties: 'Total Penalties',
      metricAttendanceRecords: 'Attendance Records',
      metricOutstandingBalances: 'Outstanding Balances',
    },
    auth: {
      loginSuccess: 'Login successful',
      loginFailed: 'Invalid credentials',
      logoutSuccess: 'Logged out successfully',
      accountLocked: 'Account is locked. Try again later.',
      accountInactive: 'Account is inactive',
      otpSent: 'OTP sent successfully',
      otpVerified: 'OTP verified successfully',
      otpInvalid: 'Invalid or expired OTP',
      passwordReset: 'Password reset successfully',
      unauthorized: 'Unauthorized access',
      forbidden: 'You do not have permission for this action',
      tokenExpired: 'Session expired. Please login again.',
    },
    member: {
      registered: 'Registration submitted. Awaiting admin approval.',
      approved: 'Member approved successfully',
      rejected: 'Member registration rejected',
      notFound: 'Member not found',
      updated: 'Profile updated successfully',
    },
    payment: {
      recorded: 'Payment recorded successfully',
      verified: 'Payment verified successfully',
      notFound: 'Payment not found',
    },
    penalty: {
      paymentRecorded: 'Penalty payment recorded successfully',
      waived: 'Penalty waived successfully',
      notFound: 'Penalty not found',
      alreadyPaid: 'Penalty has already been paid',
      alreadyWaived: 'Penalty has already been waived',
      amountExceedsPenalty: 'Payment amount exceeds penalty amount',
    },
    general: {
      success: 'Operation completed successfully',
      error: 'An error occurred',
      notFound: 'Resource not found',
      validationError: 'Validation failed',
    },
  },
  om: {
    reports: {
      // shared column headers
      headerMemberId: 'Lakk. Miseensaa',
      headerName: 'Maqaa',
      headerAmount: 'Baasii',
      headerMethod: 'Mala Kaffaltii',
      headerDate: 'Guyyaa',
      headerBalance: 'Haftee',
      headerReason: 'Sababa',
      headerMeeting: 'Walgahii',
      headerStatus: 'Haala',
      headerType: 'Gosa',
      headerBeneficiary: 'Fayyadamaa',
      headerObligations: 'Dirqama',
      headerMetric: 'Qabxii',
      headerValue: 'Gatii',
      // report titles
      titleUnpaid: 'Gabaasa Kaffaltii Hin Kaffalamne',
      titleContributions: 'Gabaasa Kaffaltii',
      titlePenalties: 'Gabaasa Adabbii',
      titleAttendance: 'Gabaasa Argama',
      titleSpecialContributions: 'Gabaasa Kaffaltii Addaa',
      titleYearEnd: 'Cuunfaa Waggaa',
      // year-end summary metric labels
      metricYear: 'Waggaa',
      metricTotalContributions: 'Kaffaltii Waliigalaa',
      metricTotalPenalties: 'Adabbii Waliigalaa',
      metricAttendanceRecords: 'Galmee Argamaa',
      metricOutstandingBalances: 'Haftee Kaffaltii',
    },
    auth: {
      loginSuccess: 'Seensaan milkaa\'e',
      loginFailed: 'Meeqaan sirrii hin taane',
      logoutSuccess: 'Milkaa\'inaan ba\'e',
      accountLocked: 'Akkaawuntii cufameera. Booda irra deebi\'i.',
      accountInactive: 'Akkaawuntiin hojii irra hin jiru',
      otpSent: 'OTP milkaa\'inaan ergame',
      otpVerified: 'OTP mirkanaa\'e',
      otpInvalid: 'OTP sirrii hin taane ykn yeroon isaa darbe',
      passwordReset: 'Jecha iccitii haaromfame',
      unauthorized: 'Hayyamni hin jiru',
      forbidden: 'Gocha kanaaf hayyamni hin jiru',
      tokenExpired: 'Yeroon keessan darbe. Irra deebi\'aa seenaa.',
    },
    member: {
      registered: 'Galmeen ergame. Mirkaneessuu eegaa jira.',
      approved: 'Miseensi mirkanaa\'e',
      rejected: 'Galmeen miseensaa didame',
      notFound: 'Miseensi hin argamne',
      updated: 'Odeeffannoon haaromfame',
    },
    payment: {
      recorded: 'Kaffaltiin galmaa\'e',
      verified: 'Kaffaltiin mirkanaa\'e',
      notFound: 'Kaffaltiin hin argamne',
    },
    penalty: {
      paymentRecorded: 'Kaffaltiin adabbii galmaa\'e',
      waived: 'Adabbiin dhiifame',
      notFound: 'Adabbiin hin argamne',
      alreadyPaid: 'Adabbiin duraan kaffalame',
      alreadyWaived: 'Adabbiin duraan dhiifame',
      amountExceedsPenalty: 'Baasiin adabbii ol ta\'a',
    },
    general: {
      success: 'Hojiin milkaa\'e',
      error: 'Dogoggorri uumame',
      notFound: 'Wanti hin argamne',
      validationError: 'Meeqaan sirrii hin taane',
    },
  },
} as const;

export type Language = keyof typeof messages;

export function t(lang: Language, key: string): string {
  const parts = key.split('.');
  let current: unknown = messages[lang] ?? messages.om;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  return typeof current === 'string' ? current : key;
}
