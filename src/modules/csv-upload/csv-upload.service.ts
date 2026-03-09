import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { ProductBatch } from '../products/product-batch.entity';
import { Brand } from '../brands/brand.entity';
import { Category } from '../categories/category.entity';
import { StockLog } from '../products/stock-log.entity';
import { ProductAvailabilityStatus } from '../../common/enums/product-availability.enum';
import { User } from '../users/user.entity';
import { parse } from 'csv-parse/sync';

interface CsvRow {
  drugName: string;
  drugCode?: string;
  unit?: string;
  brand: string;
  category: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  mrp: string;
  salesPrice: string;
  discount?: string;
}

@Injectable()
export class CsvUploadService {
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async processCsv(buffer: Buffer, actorId: string) {
    const actor = await this.userRepo.findOne({ where: { id: actorId } });
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[];

    const results = [] as any[];

    for (const row of records) {
      const brand = await this.ensureBrand(row.brand);
      const category = await this.ensureCategory(row.category);
      
      // Find or create product by drugName
      let product = await this.productRepo.findOne({
        where: { drugName: row.drugName },
        relations: ['batches'],
      });

      const quantity = Number(row.quantity ?? 0);
      const mrp = Number(row.mrp ?? 0);
      const salesPrice = Number(row.salesPrice ?? 0);
      const discount = Number(row.discount ?? 0);

      if (!product) {
        // Create new product
        product = this.productRepo.create({
          drugName: row.drugName,
          drugCode: row.drugCode || null,
          unit: row.unit || null,
          brand,
          category,
          availabilityStatus: ProductAvailabilityStatus.OutOfStock,
        });
        product = await this.productRepo.save(product);
      }

      // Check if batch already exists
      const existingBatch = await this.batchRepo.findOne({
        where: {
          product: { id: product.id },
          batchNumber: row.batchNumber,
        },
      });

      if (existingBatch) {
        // Update existing batch
        const change = quantity - existingBatch.quantity;
        existingBatch.quantity = quantity;
        existingBatch.expiryDate = new Date(row.expiryDate);
        existingBatch.mrp = mrp;
        existingBatch.salesPrice = salesPrice;
        existingBatch.discount = discount;
        await this.batchRepo.save(existingBatch);

        if (change !== 0) {
          await this.logStock(product, change, 'Batch updated via CSV', actor ?? null);
        }
        results.push({ productId: product.id, batchId: existingBatch.id, action: 'batch-updated' });
      } else {
        // Create new batch
        const batch = this.batchRepo.create({
          product,
          batchNumber: row.batchNumber,
          expiryDate: new Date(row.expiryDate),
          quantity,
          mrp,
          salesPrice,
          discount,
        });
        await this.batchRepo.save(batch);
        await this.logStock(product, quantity, 'New batch via CSV', actor ?? null);
        results.push({ productId: product.id, batchId: batch.id, action: 'batch-created' });
      }

      // Update product availability status based on total stock
      const totalStock = await this.calculateTotalStock(product.id);
      product.availabilityStatus = this.calculateAvailabilityStatus(totalStock);
      await this.productRepo.save(product);
    }

    return { processed: results.length, results };
  }

  private async calculateTotalStock(productId: string): Promise<number> {
    const result = await this.batchRepo
      .createQueryBuilder('batch')
      .where('batch.product.id = :productId', { productId })
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

  private async ensureBrand(name: string): Promise<Brand> {
    let brand = await this.brandRepo.findOne({ where: { name } });
    if (!brand) {
      brand = await this.brandRepo.save(this.brandRepo.create({ name }));
    }
    return brand;
  }

  private async ensureCategory(name: string): Promise<Category> {
    let category = await this.categoryRepo.findOne({ where: { name } });
    if (!category) {
      category = await this.categoryRepo.save(this.categoryRepo.create({ name }));
    }
    return category;
  }

  private async logStock(product: Product, change: number, reason: string, actor: User | null) {
    const log = this.stockLogRepo.create({ product, change, reason, actor: actor ?? null });
    await this.stockLogRepo.save(log);
  }
}
