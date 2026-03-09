/**
 * Script to generate sample Excel import template
 * Run: npx ts-node scripts/generate-excel-template.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ProductRow {
  SR: number;
  'DRUG Code': string;
  'Product Name': string;
  Unit: string;
  'REQUIRED QTY': number;
  'M.R.P': number;
  'Sales Price': number;
  Batch: string;
  EXP: string;
  'ORDER IN STRIPS': number;
  'ORDER VAL': number;
  'Current Stock': number;
  DISCOUNT: number;
}

// Sample data
const sampleData: ProductRow[] = [
  {
    SR: 1,
    'DRUG Code': 'ASP500',
    'Product Name': 'Aspirin 500mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 100,
    'M.R.P': 10.50,
    'Sales Price': 9.00,
    'Batch': 'BATCH001',
    'EXP': '31/12/2026',
    'ORDER IN STRIPS': 10,
    'ORDER VAL': 90.00,
    'Current Stock': 500,
    'DISCOUNT': 14.29,
  },
  {
    SR: 2,
    'DRUG Code': 'PAR650',
    'Product Name': 'Paracetamol 650mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 200,
    'M.R.P': 5.00,
    'Sales Price': 4.50,
    'Batch': 'BATCH002',
    'EXP': '15/06/2027',
    'ORDER IN STRIPS': 20,
    'ORDER VAL': 90.00,
    'Current Stock': 1000,
    'DISCOUNT': 10.00,
  },
  {
    SR: 3,
    'DRUG Code': 'IBU400',
    'Product Name': 'Ibuprofen 400mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 150,
    'M.R.P': 12.00,
    'Sales Price': 10.50,
    'Batch': 'BATCH003',
    'EXP': '20/08/2026',
    'ORDER IN STRIPS': 15,
    'ORDER VAL': 157.50,
    'Current Stock': 750,
    'DISCOUNT': 12.50,
  },
  {
    SR: 4,
    'DRUG Code': 'AMX500',
    'Product Name': 'Amoxicillin 500mg',
    'Unit': 'Capsule',
    'REQUIRED QTY': 80,
    'M.R.P': 25.00,
    'Sales Price': 22.00,
    'Batch': 'BATCH004',
    'EXP': '10/03/2027',
    'ORDER IN STRIPS': 8,
    'ORDER VAL': 176.00,
    'Current Stock': 300,
    'DISCOUNT': 12.00,
  },
  {
    SR: 5,
    'DRUG Code': 'CET10',
    'Product Name': 'Cetirizine 10mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 120,
    'M.R.P': 8.00,
    'Sales Price': 7.00,
    'Batch': 'BATCH005',
    'EXP': '05/11/2026',
    'ORDER IN STRIPS': 12,
    'ORDER VAL': 84.00,
    'Current Stock': 600,
    'DISCOUNT': 12.50,
  },
  {
    SR: 6,
    'DRUG Code': 'MET500',
    'Product Name': 'Metformin 500mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 250,
    'M.R.P': 6.00,
    'Sales Price': 5.25,
    'Batch': 'BATCH006',
    'EXP': '30/09/2027',
    'ORDER IN STRIPS': 25,
    'ORDER VAL': 131.25,
    'Current Stock': 1200,
    'DISCOUNT': 12.50,
  },
  {
    SR: 7,
    'DRUG Code': 'OMP20',
    'Product Name': 'Omeprazole 20mg',
    'Unit': 'Capsule',
    'REQUIRED QTY': 100,
    'M.R.P': 15.00,
    'Sales Price': 13.50,
    'Batch': 'BATCH007',
    'EXP': '15/04/2027',
    'ORDER IN STRIPS': 10,
    'ORDER VAL': 135.00,
    'Current Stock': 400,
    'DISCOUNT': 10.00,
  },
  {
    SR: 8,
    'DRUG Code': 'ATO10',
    'Product Name': 'Atorvastatin 10mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 90,
    'M.R.P': 20.00,
    'Sales Price': 18.00,
    'Batch': 'BATCH008',
    'EXP': '22/07/2026',
    'ORDER IN STRIPS': 9,
    'ORDER VAL': 162.00,
    'Current Stock': 350,
    'DISCOUNT': 10.00,
  },
  {
    SR: 9,
    'DRUG Code': 'VIT100',
    'Product Name': 'Vitamin C 100mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 300,
    'M.R.P': 4.00,
    'Sales Price': 3.50,
    'Batch': 'BATCH009',
    'EXP': '18/12/2027',
    'ORDER IN STRIPS': 30,
    'ORDER VAL': 105.00,
    'Current Stock': 1500,
    'DISCOUNT': 12.50,
  },
  {
    SR: 10,
    'DRUG Code': 'DIC50',
    'Product Name': 'Diclofenac 50mg',
    'Unit': 'Tablet',
    'REQUIRED QTY': 110,
    'M.R.P': 9.00,
    'Sales Price': 8.00,
    'Batch': 'BATCH010',
    'EXP': '28/05/2026',
    'ORDER IN STRIPS': 11,
    'ORDER VAL': 88.00,
    'Current Stock': 550,
    'DISCOUNT': 11.11,
  },
];

function generateExcelTemplate(withData: boolean = true) {
  const data = withData ? sampleData : [];
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // SR
    { wch: 12 }, // DRUG Code
    { wch: 25 }, // Product Name
    { wch: 10 }, // Unit
    { wch: 13 }, // REQUIRED QTY
    { wch: 10 }, // M.R.P
    { wch: 12 }, // Sales Price
    { wch: 12 }, // Batch
    { wch: 12 }, // EXP
    { wch: 15 }, // ORDER IN STRIPS
    { wch: 12 }, // ORDER VAL
    { wch: 14 }, // Current Stock
    { wch: 10 }, // DISCOUNT
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'excel-templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write files
  const templateFileName = withData 
    ? 'product-import-sample.xlsx' 
    : 'product-import-template.xlsx';
  
  const filePath = path.join(outputDir, templateFileName);
  XLSX.writeFile(workbook, filePath);
  
  console.log(`✓ Generated: ${filePath}`);
}

// Generate both template (empty) and sample (with data)
console.log('Generating Excel templates...\n');
generateExcelTemplate(false); // Empty template
generateExcelTemplate(true);  // Sample with data
console.log('\n✓ Excel templates generated successfully!');
console.log('Location: ./excel-templates/');
