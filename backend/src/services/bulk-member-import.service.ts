import ExcelJS from 'exceljs';
import prisma from '../config/database.js';
import { generateMemberId, hashPassword } from './helpers.js';
import { getGroupStartDate, calculateBackContributions } from './joining-obligation.service.js';
import { createAuditEntry } from '../middleware/audit.js';

export interface ParsedMemberRow {
  rowNumber: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string; // YYYY-MM-DD
  phone: string;
  normalizedPhone: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  membershipStartDate: string; // YYYY-MM-DD
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

export interface BulkImportPreviewResult {
  filename: string;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  warningRowsCount: number;
  rows: ParsedMemberRow[];
}

export interface BulkImportExecutionResult {
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

/**
 * Normalize phone numbers to standard formats (+2519... or 09...)
 */
export function normalizePhone(rawPhone: string | number | undefined | null): string {
  if (!rawPhone) return '';
  let str = String(rawPhone).trim().replace(/[\s\-\(\)]/g, '');
  if (str.startsWith('00251')) str = '+' + str.slice(2);
  if (str.startsWith('251')) str = '+' + str;
  if (!str.startsWith('+') && (str.startsWith('9') || str.startsWith('7')) && str.length === 9) {
    str = '0' + str;
  }
  return str;
}

/**
 * Validate phone number format (Ethiopian: 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX)
 */
export function isValidEthiopianPhone(phone: string): boolean {
  if (!phone) return false;
  const p = normalizePhone(phone);
  // Match 09XXXXXXXX or 07XXXXXXXX (10 digits) or +2519XXXXXXXX / +2517XXXXXXXX (13 chars)
  const regexLocal = /^(09|07)\d{8}$/;
  const regexIntl = /^\+251(9|7)\d{8}$/;
  return regexLocal.test(p) || regexIntl.test(p);
}

/**
 * Parse Date string or Excel serial number to ISO string YYYY-MM-DD
 */
export function parseDateToIso(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return null;

  // Try standard YYYY-MM-DD
  const isoMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(str);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(str);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Find column index or property matching known aliases
 */
function findHeaderField(headerObj: Record<string, any>, aliases: string[]): any {
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [key, val] of Object.entries(headerObj)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanAlias) {
        return val;
      }
    }
  }
  return undefined;
}

/**
 * Parse Excel or CSV buffer into row objects
 */
export async function parseFileToRawRows(buffer: Buffer, filename: string): Promise<Record<string, any>[]> {
  const isCsv = filename.toLowerCase().endsWith('.csv');
  const workbook = new ExcelJS.Workbook();

  if (isCsv) {
    // Parse CSV
    const csvContent = buffer.toString('utf-8');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse header
    const headers = parseCsvLine(lines[0]);
    const rawRows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      if (values.every(v => !v || v.trim().length === 0)) continue; // skip blank lines
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rawRows.push(rowObj);
    }
    return rawRows;
  } else {
    // Parse XLSX
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const headers: string[] = [];
    const rawRows: Record<string, any>[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.value || '').trim();
        });
      } else {
        const rowObj: Record<string, any> = {};
        let hasValue = false;
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            let cellVal = cell.value;
            // Handle Excel formula, rich text, or date
            if (cellVal && typeof cellVal === 'object') {
              if (cellVal instanceof Date) {
                cellVal = cellVal.toISOString().slice(0, 10);
              } else if ('text' in cellVal) {
                cellVal = (cellVal as any).text;
              } else if ('result' in cellVal) {
                cellVal = (cellVal as any).result;
              }
            }
            if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
              hasValue = true;
            }
            rowObj[header] = cellVal;
          }
        });
        if (hasValue) {
          rawRows.push(rowObj);
        }
      }
    });

    return rawRows;
  }
}

/**
 * Robust CSV line parser handling quotes and commas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Preview and validate bulk member import rows against DB and business rules
 */
export async function previewBulkMemberImport(
  buffer: Buffer,
  filename: string
): Promise<BulkImportPreviewResult> {
  const rawRows = await parseFileToRawRows(buffer, filename);
  const groupStartDate = await getGroupStartDate();

  // Load all existing users and members for phone / email uniqueness check
  const existingUsers = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      email: true,
      member: { select: { id: true, memberId: true, fullName: true } },
    },
  });

  const existingPhoneMap = new Map<string, string>(); // phone -> memberId
  const existingEmailMap = new Map<string, string>(); // email -> memberId

  for (const u of existingUsers) {
    if (u.phone) {
      existingPhoneMap.set(normalizePhone(u.phone), u.member?.memberId || 'EXISTING');
    }
    if (u.email) {
      existingEmailMap.set(u.email.toLowerCase().trim(), u.member?.memberId || 'EXISTING');
    }
  }

  // Track duplicates within the uploaded file itself
  const filePhoneCounts = new Map<string, number>();
  const fileEmailCounts = new Map<string, number>();

  // Pass 1: Count occurrences within file
  for (const raw of rawRows) {
    const phoneRaw = findHeaderField(raw, ['Phone Number', 'Phone', 'PhoneNumber', 'Mobile']);
    const emailRaw = findHeaderField(raw, ['Email', 'Email Address', 'EmailAddress']);

    const normPhone = normalizePhone(phoneRaw);
    if (normPhone) {
      filePhoneCounts.set(normPhone, (filePhoneCounts.get(normPhone) || 0) + 1);
    }
    if (emailRaw && String(emailRaw).trim()) {
      const normEmail = String(emailRaw).trim().toLowerCase();
      fileEmailCounts.set(normEmail, (fileEmailCounts.get(normEmail) || 0) + 1);
    }
  }

  const parsedRows: ParsedMemberRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let warningCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNumber = idx + 2; // Row 1 is header
    const errors: string[] = [];
    const warnings: string[] = [];

    const firstName = String(findHeaderField(raw, ['First Name', 'FirstName', 'First', 'Maqaa']) || '').trim();
    const middleName = String(findHeaderField(raw, ['Middle Name', 'MiddleName', 'Middle', 'Maqaa Abbaa']) || '').trim();
    const lastName = String(findHeaderField(raw, ['Last Name', 'LastName', 'Last', 'Akkaakayyuu']) || '').trim();
    const rawGender = String(findHeaderField(raw, ['Gender', 'Sex', 'Saala']) || '').trim().toUpperCase();
    const dobRaw = findHeaderField(raw, ['Date of Birth', 'DateOfBirth', 'DOB', 'Guyyaa Dhalootaa']);
    const phoneRaw = findHeaderField(raw, ['Phone Number', 'Phone', 'PhoneNumber', 'Lakk Bilbilaa']);
    const emailRaw = findHeaderField(raw, ['Email', 'Email Address', 'EmailAddress', 'Imeelii']);
    const address = String(findHeaderField(raw, ['Address', 'Location', 'Zone', 'Teessoo']) || '').trim();
    const emgName = String(findHeaderField(raw, ['Emergency Contact Name', 'EmergencyContactName', 'Emergency Name']) || '').trim();
    const emgPhoneRaw = findHeaderField(raw, ['Emergency Contact Phone', 'EmergencyContactPhone', 'Emergency Phone']);
    const startDateRaw = findHeaderField(raw, ['Membership Start Date', 'MembershipStartDate', 'Start Date', 'JoinDate', 'Join Date']);
    const photoUrl = String(findHeaderField(raw, ['Profile Photo URL', 'ProfilePhotoUrl', 'Photo URL', 'Photo']) || '').trim();

    // 1. Name validation
    if (!firstName) errors.push('First Name is required');
    if (!lastName) errors.push('Last Name is required');
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    // 2. Gender validation
    let gender: 'MALE' | 'FEMALE' | 'OTHER' = 'MALE';
    if (rawGender === 'F' || rawGender === 'FEMALE' || rawGender === 'DUBARA') {
      gender = 'FEMALE';
    } else if (rawGender === 'M' || rawGender === 'MALE' || rawGender === 'DHIIRA') {
      gender = 'MALE';
    } else if (rawGender === 'OTHER') {
      gender = 'OTHER';
    } else if (rawGender) {
      warnings.push(`Gender "${rawGender}" defaulted to MALE`);
    }

    // 3. Date of birth validation
    let parsedDob = parseDateToIso(dobRaw);
    if (!parsedDob) {
      // Default to 25 years ago if not provided
      parsedDob = new Date(Date.now() - 25 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      if (dobRaw) {
        warnings.push(`Invalid Date of Birth format "${dobRaw}". Defaulted to approx 25 years ago.`);
      }
    }

    // 4. Phone validation and duplication
    const normPhone = normalizePhone(phoneRaw);
    let isDuplicate = false;
    let existingMatchId: string | undefined;

    if (!normPhone) {
      errors.push('Phone Number is required');
    } else if (!isValidEthiopianPhone(normPhone)) {
      errors.push(`Invalid phone format "${phoneRaw}". Must be 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX`);
    } else {
      // Check duplicate within file
      if ((filePhoneCounts.get(normPhone) || 0) > 1) {
        errors.push(`Duplicate phone number "${normPhone}" occurs multiple times in this file`);
        isDuplicate = true;
      }
      // Check duplicate in database
      if (existingPhoneMap.has(normPhone)) {
        existingMatchId = existingPhoneMap.get(normPhone);
        errors.push(`Phone number "${normPhone}" is already registered to existing member (${existingMatchId})`);
        isDuplicate = true;
      }
    }

    // 5. Email validation and duplication
    let cleanEmail: string | undefined = undefined;
    if (emailRaw && String(emailRaw).trim()) {
      cleanEmail = String(emailRaw).trim().toLowerCase();
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        warnings.push(`Email "${cleanEmail}" format seems invalid`);
      } else {
        if ((fileEmailCounts.get(cleanEmail) || 0) > 1) {
          errors.push(`Duplicate email "${cleanEmail}" occurs multiple times in this file`);
          isDuplicate = true;
        }
        if (existingEmailMap.has(cleanEmail)) {
          existingMatchId = existingEmailMap.get(cleanEmail);
          errors.push(`Email "${cleanEmail}" is already registered to member (${existingMatchId})`);
          isDuplicate = true;
        }
      }
    }

    // 6. Membership Start Date validation & Financial Assessment
    let parsedStartDate = parseDateToIso(startDateRaw);
    if (!parsedStartDate) {
      errors.push('Membership Start Date is required (YYYY-MM-DD)');
      parsedStartDate = new Date().toISOString().slice(0, 10);
    }

    // Calculate historical financial assessment
    let financialAssessment: any = undefined;
    if (parsedStartDate) {
      const joinDateObj = new Date(parsedStartDate);
      if (!isNaN(joinDateObj.getTime())) {
        const assessment = await calculateBackContributions(groupStartDate, joinDateObj, 50, false);
        financialAssessment = {
          backContributionWeeks: assessment.backContributionWeeks,
          totalBackContributionAmount: assessment.totalBackContributionAmount,
          dueDate: assessment.dueDate ? assessment.dueDate.toISOString().slice(0, 10) : undefined,
          status: assessment.totalBackContributionAmount > 0 ? 'PENDING' : 'UP_TO_DATE',
        };
      }
    }

    // Determine row status
    let status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'WARNING' = 'VALID';
    if (isDuplicate) {
      status = 'DUPLICATE';
      duplicateCount++;
    } else if (errors.length > 0) {
      status = 'INVALID';
      invalidCount++;
    } else if (warnings.length > 0) {
      status = 'WARNING';
      warningCount++;
      validCount++;
    } else {
      status = 'VALID';
      validCount++;
    }

    parsedRows.push({
      rowNumber,
      firstName,
      middleName: middleName || undefined,
      lastName,
      fullName,
      gender,
      dateOfBirth: parsedDob || undefined,
      phone: String(phoneRaw || ''),
      normalizedPhone: normPhone,
      email: cleanEmail,
      address: address || undefined,
      emergencyContactName: emgName || undefined,
      emergencyContactPhone: emgPhoneRaw ? normalizePhone(emgPhoneRaw) : undefined,
      membershipStartDate: parsedStartDate,
      profilePhotoUrl: photoUrl || undefined,
      status,
      errors,
      warnings,
      financialAssessment,
      existingMemberId: existingMatchId,
    });
  }

  return {
    filename,
    totalRows: parsedRows.length,
    validRowsCount: validCount,
    invalidRowsCount: invalidCount,
    duplicateRowsCount: duplicateCount,
    warningRowsCount: warningCount,
    rows: parsedRows,
  };
}

/**
 * Execute bulk import of valid rows in safe PostgreSQL transactions
 */
export async function executeBulkMemberImport(
  validRows: ParsedMemberRow[],
  adminUserId: string,
  filename: string,
  clientIp?: string
): Promise<BulkImportExecutionResult> {
  const importId = `IMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const groupStartDate = await getGroupStartDate();
  const defaultPasswordHash = await hashPassword('Afosha1234'); // initial temporary password

  const importedMembers: BulkImportExecutionResult['importedMembers'] = [];
  const failedRows: BulkImportExecutionResult['failedRows'] = [];
  let skippedDuplicates = 0;

  for (const row of validRows) {
    if (row.status === 'INVALID') {
      failedRows.push({
        rowNumber: row.rowNumber,
        name: row.fullName,
        phone: row.normalizedPhone,
        reason: row.errors.join('; '),
      });
      continue;
    }

    if (row.status === 'DUPLICATE') {
      skippedDuplicates++;
      failedRows.push({
        rowNumber: row.rowNumber,
        name: row.fullName,
        phone: row.normalizedPhone,
        reason: 'Duplicate phone/email skipped',
      });
      continue;
    }

    try {
      // Re-verify phone uniqueness in DB before creating to ensure atomicity
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: row.normalizedPhone },
            ...(row.email ? [{ email: row.email }] : []),
          ],
        },
      });

      if (existing) {
        skippedDuplicates++;
        failedRows.push({
          rowNumber: row.rowNumber,
          name: row.fullName,
          phone: row.normalizedPhone,
          reason: 'Member already exists in database',
        });
        continue;
      }

      const memberId = generateMemberId();
      const joinDate = new Date(row.membershipStartDate);
      const dob = row.dateOfBirth ? new Date(row.dateOfBirth) : new Date(Date.now() - 25 * 365.25 * 24 * 3600 * 1000);

      // Historical financial assessment
      const assessment = await calculateBackContributions(groupStartDate, joinDate, 50, false);
      const backAmount = assessment.totalBackContributionAmount;
      const backWeeks = assessment.backContributionWeeks;

      // Create User and Member inside transaction
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone: row.normalizedPhone,
            email: row.email || null,
            passwordHash: defaultPasswordHash,
            role: 'MEMBER',
            isActive: true,
            isVerified: true,
            preferredLanguage: 'om',
            member: {
              create: {
                memberId,
                fullName: row.fullName,
                gender: row.gender,
                dateOfBirth: dob,
                address: row.address || null,
                profilePicture: row.profilePhotoUrl || null,
                registrationDate: new Date(),
                joinDate,
                status: 'APPROVED',
                totalCredit: 0,
                outstandingBalance: backAmount,
                ...(row.emergencyContactName ? {
                  emergencyContact: {
                    create: {
                      fullName: row.emergencyContactName,
                      phone: row.emergencyContactPhone || '',
                      relationship: 'Family',
                    },
                  },
                } : {}),
              },
            },
          },
          include: { member: true },
        });

        // Create JoiningObligation if historical dues exist
        if (user.member && backAmount > 0) {
          await tx.joiningObligation.create({
            data: {
              memberId: user.member.id,
              totalBackContributionAmount: backAmount,
              backContributionWeeks: backWeeks,
              amountPaid: 0,
              status: 'PENDING',
              dueDate: assessment.dueDate || new Date(Date.now() + 14 * 24 * 3600 * 1000),
            },
          });
        }
      });

      importedMembers.push({
        rowNumber: row.rowNumber,
        memberId,
        fullName: row.fullName,
        phone: row.normalizedPhone,
        joinDate: row.membershipStartDate,
        backContributionWeeks: backWeeks,
        totalBackContributionAmount: backAmount,
      });
    } catch (err: any) {
      console.error(`Failed to import row ${row.rowNumber} (${row.fullName}):`, err);
      failedRows.push({
        rowNumber: row.rowNumber,
        name: row.fullName,
        phone: row.normalizedPhone,
        reason: err.message || 'Database error during insertion',
      });
    }
  }

  // Create Audit Log
  await createAuditEntry(
    adminUserId,
    'BULK_MEMBER_IMPORT',
    'members',
    {
      importId,
      filename,
      totalProcessed: validRows.length,
      successfullyImported: importedMembers.length,
      failedCount: failedRows.length,
      skippedDuplicates,
    },
    clientIp
  );

  // Save BulkImportJob record in DB
  const ext = filename.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
  await prisma.bulkImportJob.create({
    data: {
      importId,
      originalFilename: filename,
      fileType: ext,
      totalRows: validRows.length,
      successfulRows: importedMembers.length,
      failedRows: failedRows.length,
      duplicateRows: skippedDuplicates,
      status: failedRows.length === 0 ? 'COMPLETED' : importedMembers.length > 0 ? 'PARTIAL' : 'FAILED',
      importedById: adminUserId,
      resultSummary: {
        importedMembers,
        failedRows,
      },
    },
  });

  return {
    importId,
    filename,
    totalProcessed: validRows.length,
    successfullyImported: importedMembers.length,
    failedCount: failedRows.length,
    skippedDuplicates,
    importedMembers,
    failedRows,
  };
}

/**
 * Generate standard Excel template (.xlsx) with instructions
 */
export async function generateBulkMemberTemplateExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Afosha Management System';
  workbook.created = new Date();

  // Sheet 1: Members Template
  const sheet = workbook.addWorksheet('Members_Template');

  sheet.columns = [
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Middle Name', key: 'middleName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Gender', key: 'gender', width: 14 },
    { header: 'Date of Birth', key: 'dateOfBirth', width: 16 },
    { header: 'Phone Number', key: 'phoneNumber', width: 20 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Address', key: 'address', width: 22 },
    { header: 'Emergency Contact Name', key: 'emergencyContactName', width: 25 },
    { header: 'Emergency Contact Phone', key: 'emergencyContactPhone', width: 25 },
    { header: 'Membership Start Date', key: 'membershipStartDate', width: 24 },
    { header: 'Profile Photo URL', key: 'profilePhotoUrl', width: 25 },
  ];

  // Header style: Navy blue with white bold text
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0A2540' },
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Sample Rows
  sheet.addRow({
    firstName: 'Tolasa',
    middleName: 'Girma',
    lastName: 'Bulto',
    gender: 'MALE',
    dateOfBirth: '1995-05-12',
    phoneNumber: '0911234567',
    email: 'tolasa@example.com',
    address: 'Bole, Addis Ababa',
    emergencyContactName: 'Almaz Girma',
    emergencyContactPhone: '0922334455',
    membershipStartDate: '2024-09-11',
    profilePhotoUrl: '',
  });

  sheet.addRow({
    firstName: 'Hawwi',
    middleName: 'Bekele',
    lastName: 'Dibaba',
    gender: 'FEMALE',
    dateOfBirth: '1998-11-23',
    phoneNumber: '0922446688',
    email: 'hawwi@example.com',
    address: 'Adama, Oromia',
    emergencyContactName: 'Bekele Dibaba',
    emergencyContactPhone: '0911557799',
    membershipStartDate: '2024-09-11',
    profilePhotoUrl: '',
  });

  // Sheet 2: Instructions
  const instrSheet = workbook.addWorksheet('Instructions');
  instrSheet.columns = [
    { header: 'Column Name', key: 'col', width: 26 },
    { header: 'Requirement', key: 'req', width: 16 },
    { header: 'Allowed Format / Values', key: 'desc', width: 45 },
    { header: 'Example', key: 'example', width: 25 },
  ];

  const instrHeader = instrSheet.getRow(1);
  instrHeader.height = 25;
  instrHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });

  const instructions = [
    { col: 'First Name', req: 'Required', desc: 'Member first name (letters only)', example: 'Tolasa' },
    { col: 'Middle Name', req: 'Optional', desc: "Father's name", example: 'Girma' },
    { col: 'Last Name', req: 'Required', desc: "Grandfather's name", example: 'Bulto' },
    { col: 'Gender', req: 'Required', desc: 'MALE, FEMALE, or OTHER', example: 'MALE' },
    { col: 'Date of Birth', req: 'Optional', desc: 'YYYY-MM-DD or DD/MM/YYYY', example: '1995-05-12' },
    { col: 'Phone Number', req: 'Required', desc: '09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX', example: '0911234567' },
    { col: 'Email', req: 'Optional', desc: 'Valid email address', example: 'member@gmail.com' },
    { col: 'Address', req: 'Optional', desc: 'City, Sub-city, Woreda, or Zone', example: 'Bole, Addis Ababa' },
    { col: 'Emergency Contact Name', req: 'Optional', desc: 'Full name of relative / contact', example: 'Almaz Girma' },
    { col: 'Emergency Contact Phone', req: 'Optional', desc: 'Phone of emergency contact', example: '0922334455' },
    { col: 'Membership Start Date', req: 'Required', desc: 'Official joining date (YYYY-MM-DD)', example: '2024-09-11' },
    { col: 'Profile Photo URL', req: 'Optional', desc: 'Public URL to photo', example: '' },
  ];

  instructions.forEach((ins) => instrSheet.addRow(ins));

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Generate standard CSV template (.csv)
 */
export function generateBulkMemberTemplateCsv(): string {
  const headers = [
    'First Name',
    'Middle Name',
    'Last Name',
    'Gender',
    'Date of Birth',
    'Phone Number',
    'Email',
    'Address',
    'Emergency Contact Name',
    'Emergency Contact Phone',
    'Membership Start Date',
    'Profile Photo URL',
  ];

  const sampleRow1 = [
    'Tolasa',
    'Girma',
    'Bulto',
    'MALE',
    '1995-05-12',
    '0911234567',
    'tolasa@example.com',
    'Bole, Addis Ababa',
    'Almaz Girma',
    '0922334455',
    '2024-09-11',
    '',
  ];

  const sampleRow2 = [
    'Hawwi',
    'Bekele',
    'Dibaba',
    'FEMALE',
    '1998-11-23',
    '0922446688',
    'hawwi@example.com',
    'Adama, Oromia',
    'Bekele Dibaba',
    '0911557799',
    '2024-09-11',
    '',
  ];

  return [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');
}

/**
 * Generate downloadable Error Report CSV
 */
export function generateErrorReportCsv(rows: ParsedMemberRow[]): string {
  const headers = ['Row Number', 'Full Name', 'Phone Number', 'Status', 'Errors', 'Warnings'];
  const errorLines = rows
    .filter((r) => r.status === 'INVALID' || r.status === 'DUPLICATE' || r.errors.length > 0)
    .map((r) => [
      r.rowNumber,
      `"${r.fullName}"`,
      `"${r.phone}"`,
      r.status,
      `"${r.errors.join('; ')}"`,
      `"${r.warnings.join('; ')}"`,
    ].join(','));

  return [headers.join(','), ...errorLines].join('\n');
}
