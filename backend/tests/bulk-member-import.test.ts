import { describe, it } from 'node:test';
import assert from 'node:assert';
import ExcelJS from 'exceljs';
import prisma from '../src/config/database.js';
import {
  generateBulkMemberTemplateExcel,
  generateBulkMemberTemplateCsv,
  previewBulkMemberImport,
  executeBulkMemberImport,
  generateErrorReportCsv,
  normalizePhone,
  isValidEthiopianPhone,
} from '../src/services/bulk-member-import.service.js';

describe('Bulk Member Registration and Excel/CSV Import Tests', () => {
  // Test 1: Generate & Validate Excel Template
  it('1. Generates valid Excel template (.xlsx) with 12 required columns', async () => {
    const buffer = await generateBulkMemberTemplateExcel();
    assert(buffer instanceof Buffer);
    assert(buffer.length > 0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.getWorksheet('Members Registration');
    assert(sheet, 'Worksheet should exist');

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    const expectedCols = [
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

    for (const exp of expectedCols) {
      assert(headers.includes(exp), `Template missing header: ${exp}`);
    }
  });

  // Test 2: Generate & Validate CSV Template
  it('2. Generates valid CSV template (.csv) with proper columns and sample data', () => {
    const csv = generateBulkMemberTemplateCsv();
    assert(typeof csv === 'string');
    assert(csv.length > 50);
    const lines = csv.trim().split('\n');
    assert(lines.length >= 3, 'CSV should have header and sample rows');
    const headerCols = lines[0].split(',').map((c) => c.trim());
    assert(headerCols.includes('First Name'));
    assert(headerCols.includes('Phone Number'));
    assert(headerCols.includes('Membership Start Date'));
  });

  // Test 3: Phone Normalization and Ethiopian Phone Validation
  it('3. Normalizes and validates Ethiopian phone numbers consistently', () => {
    assert.strictEqual(normalizePhone('0911223344'), '0911223344');
    assert.strictEqual(normalizePhone('+251911223344'), '+251911223344');
    assert.strictEqual(normalizePhone('251911223344'), '+251911223344');
    assert.strictEqual(normalizePhone('00251911223344'), '+251911223344');
    assert.strictEqual(normalizePhone('911223344'), '0911223344');
    assert.strictEqual(normalizePhone('(0911) 22-33-44'), '0911223344');

    assert.strictEqual(isValidEthiopianPhone('0911223344'), true);
    assert.strictEqual(isValidEthiopianPhone('0711223344'), true);
    assert.strictEqual(isValidEthiopianPhone('+251911223344'), true);
    assert.strictEqual(isValidEthiopianPhone('12345'), false);
    assert.strictEqual(isValidEthiopianPhone('0811223344'), false);
  });

  // Test 4: Parse & Validate CSV with Valid Rows
  it('4. Parses and validates valid CSV file with preview summary', async () => {
    const csvContent = [
      'First Name,Middle Name,Last Name,Gender,Date of Birth,Phone Number,Email,Address,Emergency Contact Name,Emergency Contact Phone,Membership Start Date,Profile Photo URL',
      'Caalaa,Bikila,Kumsa,MALE,1990-01-01,0991112233,caalaa.test1@example.com,Bole,Kumsa Bikila,0991112234,2024-09-11,',
      'Ayantu,Gemechu,Tolasa,FEMALE,1992-05-15,0992223344,ayantu.test1@example.com,Adama,Tolasa Gemechu,0992223345,2024-09-11,',
    ].join('\n');

    const preview = await previewBulkMemberImport(Buffer.from(csvContent, 'utf-8'), 'valid_members.csv');
    assert.strictEqual(preview.totalRows, 2);
    assert.strictEqual(preview.validRowsCount, 2);
    assert.strictEqual(preview.invalidRowsCount, 0);
    assert.strictEqual(preview.duplicateRowsCount, 0);
    assert.strictEqual(preview.rows[0].status, 'VALID');
    assert.strictEqual(preview.rows[0].fullName, 'Caalaa Bikila Kumsa');
  });

  // Test 5: Detect Duplicates within File
  it('5. Detects duplicate phone and email within the uploaded file', async () => {
    const csvContent = [
      'First Name,Middle Name,Last Name,Gender,Date of Birth,Phone Number,Email,Address,Emergency Contact Name,Emergency Contact Phone,Membership Start Date,Profile Photo URL',
      'Hawwi,Bekele,Dibaba,FEMALE,1995-02-10,0993334455,hawwi.test1@example.com,Bole,Bekele Dibaba,0993334456,2024-09-11,',
      'Bontu,Bekele,Dibaba,FEMALE,1996-03-12,0993334455,bontu.test1@example.com,Bole,Bekele Dibaba,0993334456,2024-09-11,',
    ].join('\n');

    const preview = await previewBulkMemberImport(Buffer.from(csvContent, 'utf-8'), 'duplicates.csv');
    assert.strictEqual(preview.totalRows, 2);
    assert.strictEqual(preview.duplicateRowsCount, 2);
    assert.strictEqual(preview.rows[0].status, 'DUPLICATE');
    assert.strictEqual(preview.rows[1].status, 'DUPLICATE');
    assert(preview.rows[0].errors.some((e) => e.includes('multiple times in this file')));
  });

  // Test 6: Validate Invalid Phone and Missing Required Fields
  it('6. Flags missing required fields and invalid phone numbers as INVALID', async () => {
    const csvContent = [
      'First Name,Middle Name,Last Name,Gender,Date of Birth,Phone Number,Email,Address,Emergency Contact Name,Emergency Contact Phone,Membership Start Date,Profile Photo URL',
      ',,Kumsa,MALE,1990-01-01,0994445566,test@example.com,Bole,,,2024-09-11,', // missing first name
      'Bikila,Kumsa,,MALE,1990-01-01,0994445577,test2@example.com,Bole,,,2024-09-11,', // missing last name
      'Tullu,Girma,Bulto,MALE,1990-01-01,12345,test3@example.com,Bole,,,2024-09-11,', // invalid phone
    ].join('\n');

    const preview = await previewBulkMemberImport(Buffer.from(csvContent, 'utf-8'), 'invalid_rows.csv');
    assert.strictEqual(preview.totalRows, 3);
    assert.strictEqual(preview.invalidRowsCount, 3);
    assert.strictEqual(preview.validRowsCount, 0);
    assert.strictEqual(preview.rows[0].status, 'INVALID');
    assert(preview.rows[0].errors.some((e) => e.includes('First Name is required')));
    assert(preview.rows[1].errors.some((e) => e.includes('Last Name is required')));
    assert(preview.rows[2].errors.some((e) => e.includes('Invalid phone format')));
  });

  // Test 7: Historical Financial Assessment
  it('7. Computes historical financial assessment for back-contributions without manual frontend calculations', async () => {
    const csvContent = [
      'First Name,Middle Name,Last Name,Gender,Date of Birth,Phone Number,Email,Address,Emergency Contact Name,Emergency Contact Phone,Membership Start Date,Profile Photo URL',
      'Milkesa,Girma,Tafese,MALE,1991-04-20,0995556677,milkesa.test@example.com,Bole,Girma Tafese,0995556678,2024-09-11,',
    ].join('\n');

    const preview = await previewBulkMemberImport(Buffer.from(csvContent, 'utf-8'), 'financial_test.csv');
    assert.strictEqual(preview.totalRows, 1);
    const row = preview.rows[0];
    assert.strictEqual(row.status, 'VALID');
    assert(row.financialAssessment !== undefined);
    assert(typeof row.financialAssessment?.totalBackContributionAmount === 'number');
    assert(typeof row.financialAssessment?.backContributionWeeks === 'number');
  });

  // Test 8: Generate Downloadable Error Report CSV
  it('8. Generates formatted Error Report CSV for invalid rows', async () => {
    const csvContent = [
      'First Name,Middle Name,Last Name,Gender,Date of Birth,Phone Number,Email,Address,Emergency Contact Name,Emergency Contact Phone,Membership Start Date,Profile Photo URL',
      ',,Kumsa,MALE,1990-01-01,0994445566,test@example.com,Bole,,,2024-09-11,',
    ].join('\n');

    const preview = await previewBulkMemberImport(Buffer.from(csvContent, 'utf-8'), 'error_gen.csv');
    const errorCsv = generateErrorReportCsv(preview.rows);
    assert(typeof errorCsv === 'string');
    assert(errorCsv.includes('Row Number'));
    assert(errorCsv.includes('First Name is required'));
  });

  // Test 9: Safe Database Import Transaction & Verification
  it('9. Executes safe database import for valid rows and creates proper member records', async () => {
    // Find an admin user to act as importer
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    assert(adminUser, 'Admin user must exist in system');

    const uniquePhone1 = `099${Math.floor(1000000 + Math.random() * 9000000)}`;
    const uniqueEmail1 = `bulk.test.${Date.now()}@afosha.local`;

    const validRow: any = {
      rowNumber: 2,
      firstName: 'Leensa',
      middleName: 'Badhasa',
      lastName: 'Wako',
      fullName: 'Leensa Badhasa Wako',
      gender: 'FEMALE',
      dateOfBirth: '1994-08-14',
      phone: uniquePhone1,
      normalizedPhone: uniquePhone1,
      email: uniqueEmail1,
      address: 'Adama, Zone 3',
      emergencyContactName: 'Badhasa Wako',
      emergencyContactPhone: '0911335577',
      membershipStartDate: '2024-09-11',
      status: 'VALID',
      errors: [],
      warnings: [],
    };

    const result = await executeBulkMemberImport([validRow], adminUser.id, 'test_batch_1.csv');
    assert.strictEqual(result.successfullyImported, 1);
    assert.strictEqual(result.failedCount, 0);

    const imported = result.importedMembers[0];
    assert(imported.memberId.startsWith('MEM-'), `Member ID must follow MEM- format: ${imported.memberId}`);

    // Verify DB user record
    const createdUser = await prisma.user.findUnique({
      where: { phone: uniquePhone1 },
      include: { member: { include: { emergencyContact: true, joiningObligation: true } } },
    });

    assert(createdUser, 'User record must be created in DB');
    assert.strictEqual(createdUser.role, 'MEMBER', 'Role must strictly be MEMBER (never Admin or Auditor)');
    assert.strictEqual(createdUser.isActive, true);
    assert.strictEqual(createdUser.member?.status, 'APPROVED', 'Member status must be APPROVED');
    assert.strictEqual(createdUser.member?.fullName, 'Leensa Badhasa Wako');

    // Verify Emergency Contact
    assert.strictEqual(createdUser.member?.emergencyContact?.fullName, 'Badhasa Wako');

    // Verify JoiningObligation
    if (imported.totalBackContributionAmount > 0) {
      assert(createdUser.member?.joiningObligation, 'Joining obligation should exist');
      assert.strictEqual(createdUser.member?.joiningObligation?.status, 'PENDING');
    }

    // Verify BulkImportJob was recorded in history
    const job = await prisma.bulkImportJob.findUnique({
      where: { importId: result.importId },
    });
    assert(job, 'BulkImportJob record must exist in DB');
    assert.strictEqual(job.successfulRows, 1);
    assert.strictEqual(job.status, 'COMPLETED');

    // Clean up test member
    await prisma.joiningObligation.deleteMany({ where: { memberId: createdUser.member!.id } });
    await prisma.emergencyContact.deleteMany({ where: { memberId: createdUser.member!.id } });
    await prisma.member.delete({ where: { id: createdUser.member!.id } });
    await prisma.user.delete({ where: { id: createdUser.id } });
    await prisma.bulkImportJob.delete({ where: { id: job.id } });
  });

  // Test 10: Duplicate Prevention Against Database
  it('10. Prevents duplicate member creation when phone already exists in DB', async () => {
    // Pick an existing user phone
    const existing = await prisma.user.findFirst();
    assert(existing && existing.phone, 'An existing user must be present');

    const csvContent = [
      'First Name,Middle Name,Last Name,Gender,Date of Birth,Phone Number,Email,Address,Emergency Contact Name,Emergency Contact Phone,Membership Start Date,Profile Photo URL',
      `Duplicate,Tester,User,MALE,1990-01-01,${existing.phone},dup.test@example.com,Bole,,,2024-09-11,`,
    ].join('\n');

    const preview = await previewBulkMemberImport(Buffer.from(csvContent, 'utf-8'), 'db_dup.csv');
    assert.strictEqual(preview.totalRows, 1);
    assert.strictEqual(preview.duplicateRowsCount, 1);
    assert.strictEqual(preview.rows[0].status, 'DUPLICATE');
    assert(preview.rows[0].errors.some((e) => e.includes('already registered to existing member')));
  });
});
