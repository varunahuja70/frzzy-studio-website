import { sanitizeCellForFormulaInjection, LeadExportRow } from './excel-generator';

export interface CsvExportOptions {
  columns?: string[];
}

export function generateLeadCsv(
  leads: LeadExportRow[],
  options: CsvExportOptions = {}
): Buffer {
  const allColumns: Array<{ key: string; label: string }> = [
    { key: 'createdAt', label: 'Inquiry Date (UTC)' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'assignedToName', label: 'Assigned To' },
    { key: 'message', label: 'Message' },
    { key: 'sourcePage', label: 'Source Page' },
    { key: 'country', label: 'Country' },
    { key: 'deviceType', label: 'Device' },
    { key: 'browser', label: 'Browser' },
    { key: 'os', label: 'OS' },
  ];

  const selectedColKeys = options.columns && options.columns.length > 0
    ? options.columns
    : allColumns.map((c) => c.key);

  const activeColumns = allColumns.filter((c) => selectedColKeys.includes(c.key));

  function escapeCsvCell(val: any): string {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();

    // Prevent CSV formula injection attacks
    str = sanitizeCellForFormulaInjection(str);

    // Escape double quotes
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }

  const lines: string[] = [];

  // Header line
  lines.push(activeColumns.map((c) => escapeCsvCell(c.label)).join(','));

  // Data rows
  leads.forEach((lead) => {
    const row = activeColumns.map((col) => {
      let val = (lead as any)[col.key];
      if (col.key === 'createdAt') {
        val = new Date(lead.createdAt).toISOString().replace('T', ' ').substring(0, 19);
      }
      return escapeCsvCell(val);
    });
    lines.push(row.join(','));
  });

  // UTF-8 with BOM (\uFEFF)
  const csvContent = '\uFEFF' + lines.join('\r\n');
  return Buffer.from(csvContent, 'utf-8');
}
