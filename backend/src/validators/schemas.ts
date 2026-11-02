import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6),
});

export const verifyOtpSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
  purpose: z.enum(['LOGIN', 'PASSWORD_RESET', 'ACCOUNT_VERIFICATION']),
});

export const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

export const adminRegisterMemberSchema = z.object({
  fullName: z.string().min(2),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dateOfBirth: z.string(),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  password: z.string().min(8),
  emergencyContact: z.object({
    fullName: z.string().min(2),
    relationship: z.string().min(1),
    phone: z.string().min(10),
    address: z.string().optional(),
  }).optional(),
});

export const registerMemberSchema = z.object({
  fullName: z.string().min(2),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dateOfBirth: z.string(),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  password: z.string().min(8),
  emergencyContact: z.object({
    fullName: z.string().min(2),
    relationship: z.string().min(1),
    phone: z.string().min(10),
    address: z.string().optional(),
  }),
});

export const createAuditorSchema = z.object({
  username: z.string().min(3),
  phone: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

export const recordPaymentSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY']),
  transactionReference: z.string().optional(),
  obligationId: z.string().uuid().optional(),
  specialContributionObligationId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const createFineSchema = z.object({
  memberId: z.string().uuid(),
  fineType: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(1),
});

export const createMeetingSchema = z.object({
  title: z.string().min(1),
  location: z.string().optional(),
  meetingDate: z.string(),
  meetingTime: z.string().optional(),
  agenda: z.string().optional(),
});

export const recordAttendanceSchema = z.object({
  meetingId: z.string().uuid(),
  records: z.array(
    z.object({
      memberId: z.string().uuid(),
      status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']),
      remarks: z.string().optional(),
    })
  ),
});

export const bulkMemberSchema = z.object({
  members: z.array(
    z.object({
      fullName: z.string().min(2),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
      dateOfBirth: z.string(),
      phone: z.string().min(10),
      email: z.string().email().optional(),
      address: z.string().optional(),
      occupation: z.string().optional(),
      emergencyContactName: z.string().min(2).optional(),
      emergencyContactRelationship: z.string().optional(),
      emergencyContactPhone: z.string().min(10).optional(),
      emergencyContactAddress: z.string().optional(),
    })
  ).min(1).max(1000),
});

export const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20), // Increased from 100 to 500
  search: z.string().optional(),
  status: z.string().optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContact: z
    .object({
      fullName: z.string().min(2),
      relationship: z.string().min(1),
      phone: z.string().min(10),
      address: z.string().optional(),
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

export const approveMemberSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'GRADUATED', 'DECEASED']),
  rejectionReason: z.string().optional(),
});

const familyRelationship = z.enum(['SELF', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'UNCLE', 'AUNT']);

export const graduationContributionSchema = z.object({
  beneficiaryMemberId: z.string().uuid(),
  familyRelationship,
  dueDate: z.string().optional(),
});

export const bereavementContributionSchema = z.object({
  beneficiaryMemberId: z.string().uuid(),
  familyRelationship,
  dueDate: z.string().optional(),
});

export const emergencyContributionSchema = z.object({
  title: z.string().min(1),
  titleOm: z.string().optional(),
  description: z.string().optional(),
  descriptionOm: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string(),
  targetMemberIds: z.array(z.string().uuid()).optional(),
});

export const bulkSmsSchema = z.object({
  message: z.string().min(1),
  phones: z.array(z.string()).optional(),
  sendToAll: z.boolean().optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(1),
  titleOm: z.string().optional(),
  message: z.string().min(1),
  messageOm: z.string().optional(),
});

export const updatePublicContentSchema = z.object({
  title: z.string().min(1),
  titleOm: z.string().optional(),
  content: z.string().min(1),
  contentOm: z.string().optional(),
});

export const penaltyPaymentSchema = z.object({
  penaltyId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY']),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});
