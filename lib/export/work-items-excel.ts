import ExcelJS from 'exceljs';
import { sanitizeCellForFormulaInjection } from './excel-generator';

export interface WorkItemExportRow {
  id: string;
  itemNumber: string;
  title: string;
  description?: string | null;
  status: string;
  progressPercent: number;
  priority?: string | null;
  dueDate?: number | null;
  category?: string | null;
  source?: string | null;
  clientName?: string | null;
  assignedToName?: string | null;
  assignedByName?: string | null;
  quotedPrice?: number | null;
  finalPrice?: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
  amountReceived?: number | null;
  balanceDue?: number | null;
  invoiceReference?: string | null;
  deliveredAt?: number | null;
  createdAt: number;
}

export interface WorkItemExcelExportOptions {
  title?: string;
  generatedBy: string;
  dateRangeLabel: string;
  canExportFinancials: boolean;
  selectedColumns?: string[];
  teamPerformanceData?: Array<{
    name: string;
    email: string;
    role: string;
    activeTasks: number;
    completedTasks: number;
    onTimeRate: number;
  }>;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  assigned: { bg: 'E0F2FE', fg: '0369A1' },
  accepted: { bg: 'F0FDF4', fg: '15803D' },
  in_progress: { bg: 'FEF3C7', fg: 'B45309' },
  in_review: { bg: 'F3E8FF', fg: '7E22CE' },
  completed: { bg: 'DCFCE7', fg: '166534' },
  delivered: { bg: 'D1FAE5', fg: '047857' },
};

export async function generateWorkItemsExcelWorkbook(
  items: WorkItemExportRow[],
  options: WorkItemExcelExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FRXCX Studio OS';
  workbook.lastModifiedBy = options.generatedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  // ----------------------------------------------------
  // Sheet 1: Work Items Directory
  // ----------------------------------------------------
  const sheet = workbook.addWorksheet('Work Items', {
    views: [{ showGridLines: true }],
  });

  const columns: Array<{ header: string; key: string; width: number }> = [
    { header: 'Ref Number', key: 'itemNumber', width: 16 },
    { header: 'Task / Project Title', key: 'title', width: 34 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Progress', key: 'progress', width: 12 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Client', key: 'clientName', width: 22 },
    { header: 'Specialist Assigned', key: 'assignedToName', width: 22 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Channel Source', key: 'source', width: 16 },
    { header: 'Due Date', key: 'dueDate', width: 14 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  if (options.canExportFinancials) {
    columns.push(
      { header: 'Quote Price', key: 'quotedPrice', width: 14 },
      { header: 'Final Price', key: 'finalPrice', width: 14 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Invoice Number', key: 'invoiceReference', width: 18 }
    );
  }

  sheet.columns = columns;

  // Header row styling
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF12110B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  items.forEach((item, idx) => {
    const rowValues: Record<string, any> = {
      itemNumber: sanitizeCellForFormulaInjection(item.itemNumber),
      title: sanitizeCellForFormulaInjection(item.title),
      status: (item.status || 'assigned').toUpperCase(),
      progress: `${item.progressPercent || 0}%`,
      priority: (item.priority || 'normal').toUpperCase(),
      clientName: sanitizeCellForFormulaInjection(item.clientName || 'N/A'),
      assignedToName: sanitizeCellForFormulaInjection(item.assignedToName || 'Unassigned'),
      category: sanitizeCellForFormulaInjection(item.category || 'General'),
      source: sanitizeCellForFormulaInjection(item.source || 'Direct'),
      dueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'None',
      createdAt: new Date(item.createdAt).toISOString().split('T')[0],
    };

    if (options.canExportFinancials) {
      rowValues.quotedPrice = item.quotedPrice ? `${item.currency || 'INR'} ${item.quotedPrice}` : '-';
      rowValues.finalPrice = item.finalPrice ? `${item.currency || 'INR'} ${item.finalPrice}` : '-';
      rowValues.paymentStatus = (item.paymentStatus || 'unpaid').toUpperCase();
      rowValues.invoiceReference = item.invoiceReference || '-';
    }

    const row = sheet.addRow(rowValues);
    row.height = 22;
    const isEven = idx % 2 === 1;
    const rowBg = isEven ? 'FFF9F9F8' : 'FFFFFFFF';

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFF3F4F6' } },
      };
      const colKey = columns[colNum - 1]?.key;
      if (colKey === 'status') {
        const rawStatus = (item.status || 'assigned').toLowerCase();
        const colors = STATUS_COLORS[rawStatus] || STATUS_COLORS['assigned'];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colors.bg } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + colors.fg } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
    });
  });

  // ----------------------------------------------------
  // Sheet 2: Deliveries & Financial Ledger (Restricted)
  // ----------------------------------------------------
  if (options.canExportFinancials) {
    const finSheet = workbook.addWorksheet('Deliveries & Ledger', {
      views: [{ showGridLines: true }],
    });

    const finColumns = [
      { header: 'Delivery Ref', key: 'itemNumber', width: 16 },
      { header: 'Invoice Number', key: 'invoiceReference', width: 18 },
      { header: 'Client', key: 'clientName', width: 22 },
      { header: 'Project Title', key: 'title', width: 30 },
      { header: 'Final Price', key: 'finalPrice', width: 14 },
      { header: 'Amount Received', key: 'amountReceived', width: 16 },
      { header: 'Balance Due', key: 'balanceDue', width: 14 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Delivery Date', key: 'deliveredAt', width: 16 },
    ];

    finSheet.columns = finColumns;
    const finHeader = finSheet.getRow(1);
    finHeader.height = 28;
    finHeader.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const deliveredItems = items.filter((i) => i.status === 'delivered' || !!i.finalPrice);
    deliveredItems.forEach((item, idx) => {
      const row = finSheet.addRow({
        itemNumber: item.itemNumber,
        invoiceReference: item.invoiceReference || 'N/A',
        clientName: item.clientName || 'N/A',
        title: item.title,
        finalPrice: item.finalPrice ? `${item.currency || 'INR'} ${item.finalPrice}` : '-',
        amountReceived: item.amountReceived ? `${item.currency || 'INR'} ${item.amountReceived}` : '-',
        balanceDue: item.balanceDue !== undefined && item.balanceDue !== null ? `${item.currency || 'INR'} ${item.balanceDue}` : '-',
        paymentStatus: (item.paymentStatus || 'unpaid').toUpperCase(),
        deliveredAt: item.deliveredAt ? new Date(item.deliveredAt).toLocaleDateString() : 'N/A',
      });
      row.height = 22;
      const isEven = idx % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF9F9F8' : 'FFFFFFFF' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      });
    });
  }

  // ----------------------------------------------------
  // Sheet 3: Team Performance (if provided)
  // ----------------------------------------------------
  if (options.teamPerformanceData && options.teamPerformanceData.length > 0) {
    const perfSheet = workbook.addWorksheet('Team Performance', {
      views: [{ showGridLines: true }],
    });

    const perfColumns = [
      { header: 'Team Member', key: 'name', width: 22 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Studio Role', key: 'role', width: 16 },
      { header: 'Active Tasks', key: 'activeTasks', width: 14 },
      { header: 'Completed Tasks', key: 'completedTasks', width: 16 },
      { header: 'On-Time Rate', key: 'onTimeRate', width: 16 },
    ];

    perfSheet.columns = perfColumns;
    const perfHeader = perfSheet.getRow(1);
    perfHeader.height = 28;
    perfHeader.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    options.teamPerformanceData.forEach((member, idx) => {
      const row = perfSheet.addRow({
        name: member.name,
        email: member.email,
        role: member.role,
        activeTasks: member.activeTasks,
        completedTasks: member.completedTasks,
        onTimeRate: `${member.onTimeRate}%`,
      });
      row.height = 22;
      const isEven = idx % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF9F9F8' : 'FFFFFFFF' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
