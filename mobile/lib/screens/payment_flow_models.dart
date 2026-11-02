class PaymentBreakdown {
  final String category; // WEEKLY, PENALTY, SPECIAL, EMERGENCY, HISTORICAL, GENERAL
  final String titleEn;
  final String titleOm;
  final String? obligationId;
  final String? specialContributionObligationId;
  final double amount;
  final double penaltyAmount;
  final double totalDue;
  final bool allowsPartial;

  PaymentBreakdown({
    required this.category,
    required this.titleEn,
    required this.titleOm,
    this.obligationId,
    this.specialContributionObligationId,
    required this.amount,
    this.penaltyAmount = 0.0,
    required this.totalDue,
    this.allowsPartial = true,
  });
}

class PaymentMethodOption {
  final String id;
  final String nameEn;
  final String nameOm;
  final String accountNumber;
  final String accountName;
  final String? branch;
  final String? merchantCode;
  final String icon;
  final String instructionsEn;
  final String instructionsOm;

  PaymentMethodOption({
    required this.id,
    required this.nameEn,
    required this.nameOm,
    required this.accountNumber,
    required this.accountName,
    this.branch,
    this.merchantCode,
    required this.icon,
    required this.instructionsEn,
    required this.instructionsOm,
  });
}

final List<PaymentMethodOption> standardPaymentMethods = [
  PaymentMethodOption(
    id: 'CBE',
    nameEn: 'Commercial Bank of Ethiopia (CBE / CBE Birr)',
    nameOm: 'Baankii Daldala Itoophiyaa (CBE / CBE Birr)',
    accountNumber: '1000234567890',
    accountName: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
    branch: 'Melka Jabdu / Dire Dawa',
    icon: '🏦',
    instructionsEn: 'Deposit or transfer to CBE Account 1000234567890. Enter your Member ID in narrative. Copy transaction reference.',
    instructionsOm: 'Herrega Baankii CBE 1000234567890 irratti dabarsaa. Eenyummeessaa miseensaa galchaa.',
  ),
  PaymentMethodOption(
    id: 'TELEBIRR',
    nameEn: 'Telebirr Mobile Money',
    nameOm: 'Telebirr Maallaqa Moobaayilaa',
    accountNumber: '+251 900 000 000',
    accountName: 'Gamtaa Dargaggoota Melka Jabdu',
    merchantCode: '789456',
    icon: '📲',
    instructionsEn: 'Open Telebirr, select Pay Merchant (Code: 789456) or Send Money. Copy transaction reference SMS.',
    instructionsOm: 'Appii Telebirr banaa, Koodii Daldalaa (789456) kaffalaati ergaa gabaasa kaffaltii qabadhaa.',
  ),
  PaymentMethodOption(
    id: 'EBIRR',
    nameEn: 'eBirr Digital Wallet',
    nameOm: 'eBirr Walda Maallaqa Dijitaalaa',
    accountNumber: '+251 900 000 000',
    accountName: 'Gamtaa Dargaggoota Melka Jabdu',
    merchantCode: '45213',
    icon: '💳',
    instructionsEn: 'Dial *841# or open eBirr App. Pay merchant #45213. Copy transaction reference code.',
    instructionsOm: '*841# bilbilaa ykn eBirr banaa. Koodii daldalaa #45213 kaffalaati lakkoofsa ragaa kaffaltii qabadhaa.',
  ),
  PaymentMethodOption(
    id: 'BANK_TRANSFER',
    nameEn: 'Direct Bank Transfer / Wire',
    nameOm: 'Dabarsa Baankii Kallattii',
    accountNumber: '1000234567890',
    accountName: 'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
    branch: 'Melka Jabdu Branch (SWIFT: CBETETAA)',
    icon: '🏛️',
    instructionsEn: 'Direct bank transfer via CBE Mobile Banking, ATM, or Awash Bank. Attach receipt reference.',
    instructionsOm: 'Dabarsa Baankii kallattii CBE, Awash ykn ATM dhaan kaffalaa. Nagahee irratti lakk. miseensaa barreessaa.',
  ),
];
