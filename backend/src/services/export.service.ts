import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { t, Language } from '../utils/i18n.js';

export async function exportToExcel(
  res: Response,
  filename: string,
  columns: { header: string; key: string; width?: number }[],
  rows: Record<string, unknown>[],
  lang: string = 'om'
): Promise<void> {
  const sheetName = t(lang as Language, 'reports.titleYearEnd') !== 'reports.titleYearEnd'
    ? 'Report'
    : 'Report';
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

export function exportToPdf(
  res: Response,
  filename: string,
  title: string,
  columns: string[],
  rows: string[][],
  lang: string = 'om'
): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  const colWidth = (doc.page.width - 80) / columns.length;
  let y = doc.y;
  doc.font('Helvetica-Bold');
  columns.forEach((col, i) => doc.text(col, 40 + i * colWidth, y, { width: colWidth, continued: false }));
  y += 20;
  doc.font('Helvetica');

  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    row.forEach((cell, i) => doc.text(String(cell ?? ''), 40 + i * colWidth, y, { width: colWidth }));
    y += 16;
  });

  doc.end();
}

export function flattenReportRows(data: unknown[], mapper: (item: Record<string, unknown>) => Record<string, unknown>): Record<string, unknown>[] {
  return (data as Record<string, unknown>[]).map(mapper);
}

// Re-export t for convenience in route files
export { t };
