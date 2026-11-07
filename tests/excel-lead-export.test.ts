import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  generateLeadExcelWorkbook,
  sanitizeCellForFormulaInjection,
  LeadExportRow,
} from '../lib/export/excel-generator';
import { generateLeadCsv } from '../lib/export/csv-generator';

describe('MODULE 2: Premium Lead Export Engine (ExcelJS & CSV)', () => {
  const sampleLeads: LeadExportRow[] = [
    {
      id: 'lead-001',
      createdAt: 1700000000000,
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@resistance.org',
      category: 'Web Design & Dev',
      status: 'won',
      message: 'Need a cybernetic resilience platform',
      assignedToName: 'John Admin',
      sourcePage: '/work',
      country: 'US',
      deviceType: 'Desktop',
      browser: 'Chrome',
      os: 'macOS',
    },
    {
      id: 'lead-002',
      createdAt: 1700086400000,
      firstName: 'Miles',
      lastName: 'Dyson',
      email: 'miles@cyberdyne.com',
      category: '3D & Motion',
      status: 'new',
      message: '=cmd|"/C calc"!A0', // Potential CSV/Excel injection!
      assignedToName: null,
      sourcePage: '/',
      country: 'CA',
      deviceType: 'Mobile',
      browser: 'Safari',
      os: 'iOS',
    },
  ];

  test('Formula Injection Defense: Prefixes dangerous characters (=, +, -, @) with single quote', () => {
    assert.equal(sanitizeCellForFormulaInjection('=SUM(A1:B1)'), "'=SUM(A1:B1)");
    assert.equal(sanitizeCellForFormulaInjection('+cmd|/c calc'), "'+cmd|/c calc");
    assert.equal(sanitizeCellForFormulaInjection('-2+3*cmd'), "'-2+3*cmd");
    assert.equal(sanitizeCellForFormulaInjection('@IMPORTXML("url")'), "'@IMPORTXML(\"url\")");
    // Normal text should not be modified
    assert.equal(sanitizeCellForFormulaInjection('Standard Client Message'), 'Standard Client Message');
    assert.equal(sanitizeCellForFormulaInjection(12345), 12345);
  });

  test('generateLeadExcelWorkbook compiles valid 2-sheet executive report', async () => {
    const buffer = await generateLeadExcelWorkbook(sampleLeads, {
      title: 'FRXCX Studio — Executive Lead Report',
      generatedBy: 'Director of Operations',
      dateRangeLabel: 'All Time',
      filtersLabel: 'Statuses: All | Source: All',
    });

    assert.ok(buffer.length > 0, 'Buffer should not be empty');

    // Read back workbook using ExcelJS to validate internal structure
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    // Validate 2 sheets exist
    assert.equal(workbook.worksheets.length, 2);
    const summarySheet = workbook.getWorksheet('Summary');
    const leadsSheet = workbook.getWorksheet('Leads');

    assert.ok(summarySheet, 'Sheet 1 "Summary" must exist');
    assert.ok(leadsSheet, 'Sheet 2 "Leads" must exist');

    // Validate Sheet 1 Summary
    const titleCell = summarySheet.getCell('B2');
    assert.equal(titleCell.value, 'FRXCX STUDIO — EXECUTIVE LEAD REPORT');

    // Validate Sheet 2 Leads Frozen Panes & AutoFilter
    assert.ok((leadsSheet.views?.[0] as any)?.ySplit === 1, 'Header row must be frozen');
    assert.ok(leadsSheet.autoFilter, 'Auto-filter should be enabled');

    // Validate Lead Data Rows & Mailto links (Column D is Email)
    const emailCell = leadsSheet.getCell('D2');
    assert.ok(emailCell.value, 'Email cell must have content');

    // Validate Formula Injection protection on dangerous cell (Column H is Message)
    const dangerousCell = leadsSheet.getCell('H3'); // Message column for lead-002
    const cellStr = typeof dangerousCell.value === 'string' ? dangerousCell.value : JSON.stringify(dangerousCell.value);
    assert.ok(cellStr.startsWith("'="), 'Dangerous message MUST be escaped with a single quote');
  });

  test('generateLeadCsv compiles valid RFC 4180 CSV with UTF-8 BOM', () => {
    const csvBuffer = generateLeadCsv(sampleLeads);
    assert.ok(csvBuffer.length > 0);

    const csvString = csvBuffer.toString('utf-8');

    // Validate UTF-8 BOM for Microsoft Excel compatibility
    assert.ok(csvString.startsWith('\uFEFF'), 'CSV MUST begin with UTF-8 BOM (\\uFEFF)');

    // Validate Headers
    assert.ok(csvString.includes('"Inquiry Date (UTC)","First Name","Last Name","Email","Category","Status","Assigned To","Message"'));

    // Validate Data
    assert.ok(csvString.includes('Sarah'));
    assert.ok(csvString.includes('sarah@resistance.org'));

    // Validate Formula Injection Sanitization in CSV
    assert.ok(csvString.includes(`"'=cmd|""/C calc""!A0"`));
  });
});
