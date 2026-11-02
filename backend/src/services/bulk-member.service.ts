import prisma from '../config/database.js';
import { generateMemberId, hashPassword } from './helpers.js';
import { createJoiningObligation, getGroupStartDate } from './joining-obligation.service.js';

export interface BulkMemberData {
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  phone: string;
  email?: string;
  address?: string;
  occupation?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactAddress?: string;
}

export interface BulkImportResult {
  successful: number;
  failed: number;
  details: {
    memberId?: string;
    fullName: string;
    status: 'SUCCESS' | 'ERROR';
    message: string;
    phone: string;
  }[];
}

/**
 * Validate member data before bulk import
 */
export function validateMemberData(member: BulkMemberData, index: number): { valid: boolean; error?: string } {
  if (!member.fullName || member.fullName.length < 2) {
    return { valid: false, error: `Row ${index + 1}: Full name must be at least 2 characters` };
  }

  if (!member.phone || member.phone.length < 10) {
    return { valid: false, error: `Row ${index + 1}: Phone must be at least 10 digits` };
  }

  if (!member.gender || !['MALE', 'FEMALE', 'OTHER'].includes(member.gender)) {
    return { valid: false, error: `Row ${index + 1}: Gender must be MALE, FEMALE, or OTHER` };
  }

  if (!member.dateOfBirth) {
    return { valid: false, error: `Row ${index + 1}: Date of birth is required` };
  }

  try {
    const dob = new Date(member.dateOfBirth);
    if (isNaN(dob.getTime())) {
      return { valid: false, error: `Row ${index + 1}: Invalid date of birth format` };
    }

    // Check age is reasonable (between 13 and 100)
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 13 || age > 100) {
      return { valid: false, error: `Row ${index + 1}: Member age must be between 13 and 100` };
    }
  } catch {
    return { valid: false, error: `Row ${index + 1}: Invalid date format (use YYYY-MM-DD)` };
  }

  if (member.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(member.email)) {
      return { valid: false, error: `Row ${index + 1}: Invalid email format` };
    }
  }

  if (member.emergencyContactPhone && member.emergencyContactPhone.length < 10) {
    return { valid: false, error: `Row ${index + 1}: Emergency contact phone must be at least 10 digits` };
  }

  return { valid: true };
}

/**
 * Import multiple members in bulk
 * Creates them with APPROVED status and generating random passwords
 */
export async function bulkImportMembers(members: BulkMemberData[]): Promise<BulkImportResult> {
  const results: BulkImportResult['details'] = [];
  let successful = 0;
  let failed = 0;

  try {
    const groupStartDate = await getGroupStartDate();

    for (let i = 0; i < members.length; i++) {
      const memberData = members[i];

      // Validate
      const validation = validateMemberData(memberData, i);
      if (!validation.valid) {
        results.push({
          fullName: memberData.fullName,
          status: 'ERROR',
          message: validation.error!,
          phone: memberData.phone,
        });
        failed++;
        continue;
      }

      try {
        // Check for duplicates
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { phone: memberData.phone },
              ...(memberData.email ? [{ email: memberData.email }] : []),
            ],
          },
        });

        if (existing) {
          results.push({
            fullName: memberData.fullName,
            status: 'ERROR',
            message: `Phone or email already exists in system`,
            phone: memberData.phone,
          });
          failed++;
          continue;
        }

        // Generate password (random 12-char alphanumeric)
        const generatedPassword = Math.random().toString(36).substring(2, 14).toUpperCase();
        const passwordHash = await hashPassword(generatedPassword);
        const memberId = generateMemberId();

        // Create user and member together
        const user = await prisma.user.create({
          data: {
            phone: memberData.phone,
            email: memberData.email || null,
            passwordHash,
            role: 'MEMBER',
            isActive: true,
            isVerified: true,
            preferredLanguage: 'om',
            member: {
              create: {
                memberId,
                fullName: memberData.fullName,
                gender: memberData.gender,
                dateOfBirth: new Date(memberData.dateOfBirth),
                address: memberData.address || null,
                occupation: memberData.occupation || null,
                status: 'APPROVED',
                joinDate: new Date(),
                ...(memberData.emergencyContactName && memberData.emergencyContactPhone
                  ? {
                      emergencyContact: {
                        create: {
                          fullName: memberData.emergencyContactName,
                          relationship: memberData.emergencyContactRelationship || 'OTHER',
                          phone: memberData.emergencyContactPhone,
                          address: memberData.emergencyContactAddress || null,
                        },
                      },
                    }
                  : {}),
              },
            },
          },
          include: { member: true },
        });

        // Create joining obligation
        if (user.member) {
          try {
            await createJoiningObligation(user.member.id, groupStartDate, new Date());
          } catch (error) {
            console.error(`Failed to create joining obligation for ${memberId}:`, error);
            // Don't fail the import if joining obligation fails
          }
        }

        results.push({
          memberId: memberData.phone, // Use phone as identifier in response
          fullName: memberData.fullName,
          status: 'SUCCESS',
          message: `Member imported successfully. Password: ${generatedPassword}`,
          phone: memberData.phone,
        });
        successful++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.push({
          fullName: memberData.fullName,
          status: 'ERROR',
          message: errorMessage,
          phone: memberData.phone,
        });
        failed++;
      }
    }
  } catch (error) {
    throw new Error(`Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    successful,
    failed,
    details: results,
  };
}

/**
 * Parse CSV data into member objects
 */
export function parseCSVData(csvText: string): BulkMemberData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain header row and at least one data row');
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());

  // Expected columns
  const requiredColumns = ['fullname', 'gender', 'dateofbirth', 'phone'];
  const missingColumns = requiredColumns.filter((col) => !header.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(
      `CSV missing required columns: ${missingColumns.join(', ')}. Required: fullName, gender, dateOfBirth, phone`
    );
  }

  // Parse data rows
  const members: BulkMemberData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(',').map((v) => v.trim());

    if (values.length < requiredColumns.length) {
      throw new Error(`Row ${i + 1}: Not enough columns`);
    }

    const member: BulkMemberData = {
      fullName: values[header.indexOf('fullname')] || '',
      gender: (values[header.indexOf('gender')] || '').toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER',
      dateOfBirth: values[header.indexOf('dateofbirth')] || '',
      phone: values[header.indexOf('phone')] || '',
      email: values[header.indexOf('email')] || undefined,
      address: values[header.indexOf('address')] || undefined,
      occupation: values[header.indexOf('occupation')] || undefined,
      emergencyContactName: values[header.indexOf('emergencycontactname')] || undefined,
      emergencyContactRelationship: values[header.indexOf('emergencycontactrelationship')] || undefined,
      emergencyContactPhone: values[header.indexOf('emergencycontactphone')] || undefined,
      emergencyContactAddress: values[header.indexOf('emergencycontactaddress')] || undefined,
    };

    members.push(member);
  }

  if (members.length === 0) {
    throw new Error('No valid member data found in CSV');
  }

  return members;
}

/**
 * Generate sample CSV template
 */
export function generateCSVTemplate(): string {
  return `fullName,gender,dateOfBirth,phone,email,address,occupation,emergencyContactName,emergencyContactRelationship,emergencyContactPhone,emergencyContactAddress
Abebe Assefa,MALE,1990-05-15,+251912345678,abebe@example.com,Addis Ababa,Engineer,Almaz Assefa,Sister,+251912345679,Addis Ababa
Almaz Worku,FEMALE,1992-03-20,+251923456789,almaz@example.com,Dire Dawa,Teacher,Worku Tadesse,Father,+251923456790,Dire Dawa
Kebede Tura,MALE,1988-07-10,+251934567890,,Hawassa,Farmer,Tura Teferi,Brother,+251934567891,Hawassa`;
}
