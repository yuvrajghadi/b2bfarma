export class ImportErrorDto {
  row: number;
  field?: string;
  message: string;
}

export class ImportSummaryDto {
  totalRows: number;
  productsCreated: number;
  batchesInserted: number;
  skippedRows: number;
  errors: ImportErrorDto[];
}
