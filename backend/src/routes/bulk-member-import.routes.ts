import { Router, Response } from 'express';
import multer from 'multer';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  generateBulkMemberTemplateExcel,
  generateBulkMemberTemplateCsv,
  previewBulkMemberImport,
  executeBulkMemberImport,
  generateErrorReportCsv,
} from '../services/bulk-member-import.service.js';
import prisma from '../config/database.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 1. Download Excel Template (.xlsx)
router.get('/template/excel', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const buffer = await generateBulkMemberTemplateExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="AMS_Bulk_Member_Registration_Template.xlsx"');
    res.send(buffer);
  } catch (error: any) {
    console.error('Failed to generate Excel template:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel template' });
  }
});

// 2. Download CSV Template (.csv)
router.get('/template/csv', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const csvString = generateBulkMemberTemplateCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="AMS_Bulk_Member_Registration_Template.csv"');
    res.send(csvString);
  } catch (error: any) {
    console.error('Failed to generate CSV template:', error);
    res.status(500).json({ success: false, message: 'Failed to generate CSV template' });
  }
});

// 3. Upload & Preview File (Excel or CSV)
router.post(
  '/preview',
  authenticate,
  authorize('ADMIN'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    const lang = req.lang || 'om';
    try {
      if (!req.file) {
        sendError(res, 'general.validationError', lang, 400);
        return;
      }

      const filename = req.file.originalname;
      const lower = filename.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
        sendError(
          res,
          lang === 'en'
            ? 'Invalid file format. Please upload an Excel (.xlsx) or CSV (.csv) file.'
            : 'Gosti faayilii hin eeyyamamne. Maaloo faayilii Excel (.xlsx) ykn CSV (.csv) olkaa\'aa.',
          lang,
          400
        );
        return;
      }

      const preview = await previewBulkMemberImport(req.file.buffer, filename);
      sendSuccess(res, preview, 'general.success', lang);
    } catch (error: any) {
      console.error('Error previewing bulk member import:', error);
      sendError(res, error.message || 'general.error', lang, 500);
    }
  }
);

// 4. Execute Bulk Import
router.post('/execute', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { rows, filename } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      sendError(res, 'general.validationError', lang, 400);
      return;
    }

    const adminUserId = req.user!.userId;
    const clientIp = req.ip;
    const result = await executeBulkMemberImport(rows, adminUserId, filename || 'Bulk_Import.xlsx', clientIp);

    sendSuccess(
      res,
      result,
      lang === 'en'
        ? `Successfully imported ${result.successfullyImported} members.`
        : `Miseensotni ${result.successfullyImported} milkaa'inaan galmaa'aniiru.`,
      lang,
      201
    );
  } catch (error: any) {
    console.error('Error executing bulk member import:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

// 5. Download Error Report CSV
router.post('/error-report', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ success: false, message: 'Invalid rows payload' });
      return;
    }

    const csvContent = generateErrorReportCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Bulk_Import_Errors.csv"');
    res.send(csvContent);
  } catch (error: any) {
    console.error('Failed to generate error report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate error report' });
  }
});

// 6. Get Bulk Import History
router.get('/history', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const jobs = await prisma.bulkImportJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        importedBy: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });

    sendSuccess(res, jobs, 'general.success', lang);
  } catch (error: any) {
    console.error('Failed to fetch bulk import history:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

// 7. Get Details of a Single Import Job
router.get('/history/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const importId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await prisma.bulkImportJob.findUnique({
      where: { importId },
      include: {
        importedBy: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });

    if (!job) {
      sendError(res, 'general.notFound', lang, 404);
      return;
    }

    sendSuccess(res, job, 'general.success', lang);
  } catch (error: any) {
    console.error('Failed to fetch bulk import job details:', error);
    sendError(res, 'general.error', lang, 500);
  }
});

export default router;
