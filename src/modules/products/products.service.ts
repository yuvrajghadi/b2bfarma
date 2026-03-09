import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from './product.entity';
import { ProductBatch } from './product-batch.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { ImportSummaryDto, ImportErrorDto } from './dto/import-summary.dto';
import { Brand } from '../brands/brand.entity';
import { Category } from '../categories/category.entity';
import { StockLog } from './stock-log.entity';
import { ProductAvailabilityStatus } from '../../common/enums/product-availability.enum';
import { User } from '../users/user.entity';
import * as XLSX from 'xlsx';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductBatch)
    private readonly batchRepo: Repository<ProductBatch>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(StockLog)
    private readonly stockLogRepo: Repository<StockLog>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    let brand: Brand | null = null;
    let category: Category | null = null;

    if (dto.brandId) {
      brand = await this.brandRepo.findOne({ where: { id: dto.brandId } });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    if (dto.categoryId) {
      category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Category not found');
    }

    const product = this.productRepo.create({
      drugName: dto.drugName,
      drugCode: dto.drugCode || null,
      unit: dto.unit || null,
      brand,
      category,
      availabilityStatus: dto.availabilityStatus || ProductAvailabilityStatus.OutOfStock,
    });

    return this.productRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['batches'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.drugName) product.drugName = dto.drugName;
    if (dto.description !== undefined) product.description = dto.description;

    if (dto.batches?.length) {
      for (const batchUpdate of dto.batches) {
        if (!batchUpdate.batchNumber) continue;
        const batch = product.batches?.find((b) => b.batchNumber === batchUpdate.batchNumber);
        if (!batch) continue;

        if (batchUpdate.quantity !== undefined) batch.quantity = batchUpdate.quantity;
        if (batchUpdate.salesPrice !== undefined) batch.salesPrice = batchUpdate.salesPrice;
        if (batchUpdate.expiryDate) batch.expiryDate = new Date(batchUpdate.expiryDate);

        await this.batchRepo.save(batch);
      }
    }

    if (product.isDeleted) {
      product.availabilityStatus = ProductAvailabilityStatus.Discontinued;
    } else if (product.availabilityStatus !== ProductAvailabilityStatus.Discontinued) {
      const totalStock = await this.calculateTotalStock(product.id);
      product.availabilityStatus = this.calculateAvailabilityStatus(totalStock);
    }

    return this.productRepo.save(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    return this.update(id, dto);
  }

  async updateBatch(id: string, dto: UpdateBatchDto): Promise<ProductBatch> {
    const batch = await this.batchRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (dto.quantity !== undefined) batch.quantity = dto.quantity;
    if (dto.batchNumber !== undefined) batch.batchNumber = dto.batchNumber;
    if (dto.expiryDate !== undefined) batch.expiryDate = new Date(dto.expiryDate);
    if (dto.salesPrice !== undefined) batch.salesPrice = dto.salesPrice;

    const savedBatch = await this.batchRepo.save(batch);

    if (batch.product && !batch.product.isDeleted) {
      const totalStock = await this.calculateTotalStock(batch.product.id);
      if (batch.product.availabilityStatus !== ProductAvailabilityStatus.Discontinued) {
        batch.product.availabilityStatus = this.calculateAvailabilityStatus(totalStock);
        await this.productRepo.save(batch.product);
      }
    }

    return savedBatch;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['batches'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.mapProductResponse(product);
  }

  async list(query: ProductQueryDto) {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.batches', 'batches');

    qb.andWhere('product.isDeleted = :isDeleted', { isDeleted: false });

    if (query.query) {
      qb.andWhere('product.drugName ILIKE :searchQuery', { searchQuery: `%${query.query}%` });
    }

    if (query.categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId: query.categoryId });
    }

    if (query.brandId) {
      qb.andWhere('brand.id = :brandId', { brandId: query.brandId });
    }

    if (query.expiryStart) {
      qb.andWhere('batches.expiryDate >= :expiryStart', { expiryStart: query.expiryStart });
    }

    if (query.expiryEnd) {
      qb.andWhere('batches.expiryDate <= :expiryEnd', { expiryEnd: query.expiryEnd });
    }

    if (query.inStock === 'true') {
      qb.andWhere('product.availabilityStatus = :status', { status: ProductAvailabilityStatus.InStock });
    }

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    qb.take(limit).skip((page - 1) * limit).orderBy('product.createdAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();
    items.forEach((product) => {
      console.log('Product entity:', product);
    });
    const mappedItems = items.map((product) => this.mapProductResponse(product));
    return { items: mappedItems, total, page, limit };
  }

  async adjustStock(params: {
    productId: string;
    change: number;
    reason: string;
    actor?: User | null;
  }) {
    const product = await this.productRepo.findOne({ 
      where: { id: params.productId, isDeleted: false },
      relations: ['batches']
    });
    if (!product) throw new NotFoundException('Product not found');
    
    // Calculate total stock from all batches
    const totalStock = product.batches.reduce((sum, batch) => sum + batch.quantity, 0);
    
    // Update availability status based on total stock
    if (product.availabilityStatus !== ProductAvailabilityStatus.Discontinued) {
      product.availabilityStatus = this.calculateAvailabilityStatus(totalStock);
    }
    await this.productRepo.save(product);

    const log = this.stockLogRepo.create({
      product,
      change: params.change,
      reason: params.reason,
      actor: params.actor ?? null,
    });
    await this.stockLogRepo.save(log);
    return product;
  }

  /**
   * Import products from Excel file
   */
  async importFromExcel(buffer: Buffer): Promise<ImportSummaryDto> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    const summary: ImportSummaryDto = {
      totalRows: rows.length,
      productsCreated: 0,
      batchesInserted: 0,
      skippedRows: 0,
      errors: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // Excel row number (header is row 1)

        try {
          // Validate required fields
          const validationError = this.validateExcelRow(row, rowNumber);
          if (validationError) {
            summary.errors.push(validationError);
            summary.skippedRows++;
            continue;
          }

          // Extract and normalize data
          const productName = String(row['Product Name'] || '').trim();
          const drugCode = String(row['DRUG Code'] || '').trim();
          const unit = String(row['Unit'] || '').trim();
          const batchNumber = String(row['Batch'] || '').trim();
          const expiryDate = this.parseExpiryDate(row['EXP']);
          const quantity = parseInt(String(row['Current Stock'] || '0'), 10);
          const mrp = parseFloat(String(row['M.R.P'] || '0'));
          const salesPrice = parseFloat(String(row['Sales Price'] || '0'));
          const discount = parseFloat(String(row['DISCOUNT'] || '0'));

          if (!expiryDate) {
            summary.errors.push({
              row: rowNumber,
              field: 'EXP',
              message: 'Invalid expiry date format',
            });
            summary.skippedRows++;
            continue;
          }

          // Find or create product
          let product = await queryRunner.manager.findOne(Product, {
            where: { drugName: productName },
          });

          if (!product) {
            product = queryRunner.manager.create(Product, {
              drugName: productName,
              drugCode: drugCode || null,
              unit: unit || null,
              availabilityStatus: ProductAvailabilityStatus.OutOfStock,
            });
            await queryRunner.manager.save(product);
            summary.productsCreated++;
          }

          // Check for duplicate batch
          const existingBatch = await queryRunner.manager.findOne(ProductBatch, {
            where: {
              product: { id: product.id },
              batchNumber,
            },
          });

          if (existingBatch) {
            summary.errors.push({
              row: rowNumber,
              field: 'Batch',
              message: `Batch ${batchNumber} already exists for this product`,
            });
            summary.skippedRows++;
            continue;
          }

          // Create batch
          const batch = queryRunner.manager.create(ProductBatch, {
            product,
            batchNumber,
            expiryDate,
            quantity,
            mrp,
            salesPrice,
            discount,
          });
          await queryRunner.manager.save(batch);
          summary.batchesInserted++;

          // Update product availability status
          const totalStock = await this.calculateProductTotalStock(queryRunner, product.id);
          product.availabilityStatus = this.calculateAvailabilityStatus(totalStock);
          await queryRunner.manager.save(product);

        } catch (error: any) {
          summary.errors.push({
            row: rowNumber,
            message: error?.message || 'Unknown error',
          });
          summary.skippedRows++;
        }
      }

      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`Import failed: ${error?.message || 'Unknown error'}`);
    } finally {
      await queryRunner.release();
    }

    return summary;
  }

  /**
   * Get flattened inventory with batches
   */
async getInventory(query: InventoryQueryDto) {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  const qb = this.productRepo
    .createQueryBuilder('p')
    .leftJoin('p.batches', 'b')
    .leftJoin('p.brand', 'brand')
    .leftJoin('p.category', 'category')
    .where('p.is_deleted = :isDeleted', { isDeleted: false })
    .select([
      'p.id AS "productId"',
      'p.drugName AS "drugName"',
      'p.drugCode AS "drugCode"',
      'p.unit AS "unit"',
      'p.availabilityStatus AS "availabilityStatus"',
      'b.id AS "batchId"',
      'b.batchNumber AS "batchNumber"',
      'b.expiryDate AS "expiryDate"',
      'b.quantity AS "quantity"',
      'b.mrp AS "mrp"',
      'b.salesPrice AS "salesPrice"',
      'b.discount AS "discount"',
      'brand.name AS "brandName"',
      'category.name AS "categoryName"',
    ]);

  if (query.search) {
    qb.andWhere(
      '(p.drugName ILIKE :search OR p.drugCode ILIKE :search)',
      { search: `%${query.search}%` },
    );
  }

  if (query.lowStockOnly === 'true') {
    qb.andWhere('p.availabilityStatus = :lowStock', {
      lowStock: ProductAvailabilityStatus.LowStock,
    });
  }

  if (query.expiryFilter === 'expiring') {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    qb.andWhere(
      'b.expiryDate <= :expiring AND b.expiryDate > :now',
      {
        expiring: threeMonthsFromNow,
        now: new Date(),
      },
    );
  } else if (query.expiryFilter === 'expired') {
    qb.andWhere('b.expiryDate < :now', { now: new Date() });
  }

  const total = await qb.getCount();

  qb.orderBy('p.drugName', 'ASC')
    .addOrderBy('b.expiryDate', 'ASC')
    .skip(skip)
    .take(limit);

  const items = await qb.getRawMany();

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

  async softDelete(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id, isDeleted: false } });
    if (!product) throw new NotFoundException('Product not found');
    product.isDeleted = true;
    product.availabilityStatus = ProductAvailabilityStatus.Discontinued;
    return this.productRepo.save(product);
  }

  // Helper methods
  private validateExcelRow(row: any, rowNumber: number): ImportErrorDto | null {
    if (!row['Product Name']) {
      return { row: rowNumber, field: 'Product Name', message: 'Product Name is required' };
    }
    if (!row['Batch']) {
      return { row: rowNumber, field: 'Batch', message: 'Batch is required' };
    }
    if (!row['EXP']) {
      return { row: rowNumber, field: 'EXP', message: 'Expiry date is required' };
    }
    if (isNaN(parseFloat(String(row['M.R.P'] || '0')))) {
      return { row: rowNumber, field: 'M.R.P', message: 'M.R.P must be a valid number' };
    }
    if (isNaN(parseFloat(String(row['Sales Price'] || '0')))) {
      return { row: rowNumber, field: 'Sales Price', message: 'Sales Price must be a valid number' };
    }
    if (isNaN(parseInt(String(row['Current Stock'] || '0'), 10))) {
      return { row: rowNumber, field: 'Current Stock', message: 'Current Stock must be a valid number' };
    }
    return null;
  }

  private parseExpiryDate(value: any): Date | null {
    if (!value) return null;

    // Handle Excel date serial number
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date;
    }

    // Handle string dates (DD/MM/YYYY, MM/YYYY, etc.)
    const dateStr = String(value).trim();
    const patterns = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{1,2})\/(\d{4})$/, // MM/YYYY
      /^(\d{1,2})-(\d{4})$/, // MM-YYYY
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (match.length === 4) {
          // DD/MM/YYYY or DD-MM-YYYY
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const year = parseInt(match[3], 10);
          return new Date(year, month, day);
        } else if (match.length === 3) {
          // MM/YYYY or MM-YYYY
          const month = parseInt(match[1], 10) - 1;
          const year = parseInt(match[2], 10);
          return new Date(year, month, 1);
        }
      }
    }

    // Try standard Date parsing
    const parsedDate = new Date(value);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private async calculateProductTotalStock(queryRunner: any, productId: string): Promise<number> {
    const result = await queryRunner.manager
      .createQueryBuilder(ProductBatch, 'batch')
      .where('batch.product.id = :productId', { productId })
      .select('SUM(batch.quantity)', 'total')
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  private async calculateTotalStock(productId: string): Promise<number> {
    const result = await this.batchRepo
      .createQueryBuilder('batch')
      .where('batch.productId = :productId', { productId })
      .select('SUM(batch.quantity)', 'total')
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  private calculateAvailabilityStatus(totalStock: number): ProductAvailabilityStatus {
    if (totalStock > 10) {
      return ProductAvailabilityStatus.InStock;
    } else if (totalStock >= 1) {
      return ProductAvailabilityStatus.LowStock;
    } else {
      return ProductAvailabilityStatus.OutOfStock;
    }
  }

  private mapProductResponse(product: Product) {
    const batches = product.batches ?? [];
    const totalQuantity = batches.reduce((sum, batch) => sum + (batch?.quantity ?? 0), 0);

    const availableBatches = batches.filter((batch) => (batch?.quantity ?? 0) > 0);
    const priceSource = availableBatches.length ? availableBatches : batches;
    const expirySource = availableBatches.length ? availableBatches : batches;

    const basePrice =
      priceSource.length > 0
        ? Math.min(...priceSource.map((batch) => Number(batch.salesPrice)))
        : null;

    const expiryDate =
      expirySource.length > 0
        ? expirySource
            .map((batch) => new Date(batch.expiryDate as unknown as string))
            .reduce((min, date) => (date < min ? date : min))
        : null;

    return {
      ...product,
      expiryDate,
      quantity: totalQuantity,
      basePrice,
    };
  }
}
