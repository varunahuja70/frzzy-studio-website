import ExcelJS from 'exceljs';

export interface LeadExportRow {
  id: string;
  createdAt: number;
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  status: string;
  message: string;
  assignedToName?: string | null;
  sourcePage?: string | null;
  country?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
}

export interface ExcelExportOptions {
  title?: string;
  generatedBy: string;
  dateRangeLabel: string;
  filtersLabel: string;
  columns?: string[];
}

/**
 * Mitigates Excel / CSV Formula Injection Attacks.
 * If text starts with dangerous formula symbols (=, +, -, @, \t, \r), prefixes with single quote.
 */
export function sanitizeCellForFormulaInjection(val: any): any {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  new: { bg: 'E0F2FE', fg: '0369A1' }, // Blue
  contacted: { bg: 'FEF3C7', fg: 'B45309' }, // Amber
  in_progress: { bg: 'F3E8FF', fg: '7E22CE' }, // Purple
  won: { bg: 'DCFCE7', fg: '15803D' }, // Green
  lost: { bg: 'FEE2E2', fg: 'B91C1C' }, // Red
  spam: { bg: 'F3F4F6', fg: '4B5563' }, // Gray
};

export async function generateLeadExcelWorkbook(
  leads: LeadExportRow[],
  options: ExcelExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FRXCX Studio';
  workbook.lastModifiedBy = options.generatedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  // ==========================================
  // SHEET 1: EXECUTIVE SUMMARY
  // ==========================================
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: true }],
  });

  // Branding Title Header
  summarySheet.mergeCells('B2:G2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'FRXCX STUDIO — EXECUTIVE LEAD REPORT';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF12110B' }, // Brand primary dark
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 36;

  // Metadata Subheader
  summarySheet.mergeCells('B3:G3');
  const metaCell = summarySheet.getCell('B3');
  metaCell.value = `Generated at ${new Date().toLocaleString()} by ${options.generatedBy} | Range: ${options.dateRangeLabel}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF5A6265' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(3).height = 20;

  // KPI Summary Blocks
  const totalLeads = leads.length;
  const statusCounts: Record<string, number> = {
    new: 0,
    contacted: 0,
    in_progress: 0,
    won: 0,
    lost: 0,
    spam: 0,
  };
  leads.forEach((l) => {
    const s = (l.status || 'new').toLowerCase();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const wonCount = statusCounts['won'] || 0;
  const conversionRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

  // KPI Cards Row
  const kpiData = [
    { label: 'TOTAL INQUIRIES', val: totalLeads, col: 'B' },
    { label: 'QUALIFIED / IN PROGRESS', val: statusCounts['in_progress'] || 0, col: 'C' },
    { label: 'WON DEALS', val: wonCount, col: 'D' },
    { label: 'CONVERSION RATE', val: conversionRate, col: 'E' },
  ];

  kpiData.forEach((kpi) => {
    const cardTop = summarySheet.getCell(`${kpi.col}5`);
    cardTop.value = kpi.label;
    cardTop.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF6B7280' } };
    cardTop.alignment = { horizontal: 'center', vertical: 'middle' };

    const cardVal = summarySheet.getCell(`${kpi.col}6`);
    cardVal.value = kpi.val;
    cardVal.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF12110B' } };
    cardVal.alignment = { horizontal: 'center', vertical: 'middle' };

    [`${kpi.col}5`, `${kpi.col}6`].forEach((c) => {
      summarySheet.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };
      summarySheet.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });
  summarySheet.getRow(5).height = 18;
  summarySheet.getRow(6).height = 28;

  // Breakdown Table Header
  summarySheet.getCell('B9').value = 'Pipeline Stage';
  summarySheet.getCell('C9').value = 'Count';
  summarySheet.getCell('D9').value = 'Share of Total';

  ['B9', 'C9', 'D9'].forEach((cell) => {
    summarySheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF26251E' },
    };
    summarySheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
  });
  summarySheet.getRow(9).height = 24;

  const statusRows = [
    { key: 'new', label: 'New Inquiries' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'won', label: 'Won / Signed' },
    { key: 'lost', label: 'Lost / Closed' },
    { key: 'spam', label: 'Spam / Filtered' },
  ];

  statusRows.forEach((item, index) => {
    const rowIdx = 10 + index;
    const count = statusCounts[item.key] || 0;
    const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

    const cellA = summarySheet.getCell(`B${rowIdx}`);
    const cellB = summarySheet.getCell(`C${rowIdx}`);
    const cellC = summarySheet.getCell(`D${rowIdx}`);

    cellA.value = item.label;
    cellB.value = count;
    cellC.value = pct;

    cellB.alignment = { horizontal: 'right', vertical: 'middle' };
    cellC.alignment = { horizontal: 'right', vertical: 'middle' };

    [cellA, cellB, cellC].forEach((c) => {
      c.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (rowIdx % 2 === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBFBFA' } };
      }
    });
    summarySheet.getRow(rowIdx).height = 20;
  });

  summarySheet.columns = [
    { width: 4 },
    { width: 28 },
    { width: 24 },
    { width: 24 },
    { width: 24 },
    { width: 24 },
  ];

  // ==========================================
  // SHEET 2: DETAILED LEADS PIPELINE
  // ==========================================
  const leadsSheet = workbook.addWorksheet('Leads', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  const allAvailableColumns: Array<{ key: string; label: string; width: number }> = [
    { key: 'createdAt', label: 'Inquiry Date (UTC)', width: 20 },
    { key: 'firstName', label: 'First Name', width: 16 },
    { key: 'lastName', label: 'Last Name', width: 16 },
    { key: 'email', label: 'Email Address', width: 28 },
    { key: 'category', label: 'Service Category', width: 22 },
    { key: 'status', label: 'Pipeline Status', width: 16 },
    { key: 'assignedToName', label: 'Assigned To', width: 18 },
    { key: 'message', label: 'Inquiry Message / Scope', width: 42 },
    { key: 'sourcePage', label: 'Source Page', width: 18 },
    { key: 'country', label: 'Country', width: 14 },
    { key: 'deviceType', label: 'Device', width: 12 },
    { key: 'browser', label: 'Browser', width: 14 },
    { key: 'os', label: 'OS', width: 12 },
  ];

  const selectedColKeys = options.columns && options.columns.length > 0
    ? options.columns
    : allAvailableColumns.map((c) => c.key);

  const activeColumns = allAvailableColumns.filter((c) => selectedColKeys.includes(c.key));

  leadsSheet.columns = activeColumns.map((col) => ({
    header: col.label,
    key: col.key,
    width: col.width,
  }));

  // Style Header Row
  const headerRow = leadsSheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF12110B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF26D67C' } }, // Premium green line
    };
  });

  // Enable Auto-filter on all columns
  leadsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: activeColumns.length },
  };

  // Populate Lead Rows
  leads.forEach((lead, idx) => {
    const rowValues: Record<string, any> = {};

    activeColumns.forEach((col) => {
      let val: any = (lead as any)[col.key];

      if (col.key === 'createdAt') {
        val = new Date(lead.createdAt).toISOString().replace('T', ' ').substring(0, 19);
      } else if (col.key === 'email' && val && !val.includes('***')) {
        // Hyperlinked mailto for unmasked emails
        val = {
          text: sanitizeCellForFormulaInjection(val),
          hyperlink: `mailto:${val}`,
        };
      } else {
        val = sanitizeCellForFormulaInjection(val);
      }

      rowValues[col.key] = val;
    });

    const row = leadsSheet.addRow(rowValues);
    row.height = 24;

    const isEven = idx % 2 === 1;
    const rowBg = isEven ? 'FFFBFBFA' : 'FFFFFFFF';

    row.eachCell((cell, colNumber) => {
      const colKey = activeColumns[colNumber - 1]?.key;

      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFF3F4F6' } },
      };

      if (colKey === 'status') {
        const rawStatus = String(lead.status || 'new').toLowerCase();
        const color = STATUS_COLORS[rawStatus] || STATUS_COLORS['new'];
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + color.bg },
        };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + color.fg } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colKey === 'message') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        cell.alignment = { vertical: 'middle', wrapText: true };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        cell.alignment = { vertical: 'middle' };
      }
    });
  });

  // Page Setup for Print
  leadsSheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '1:1',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
