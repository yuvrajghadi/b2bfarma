import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CsvUploadService } from './csv-upload.service';
import { CsvUploadController } from './csv-upload.controller';
import { Product } from '../products/product.entity';
import { ProductBatch } from '../products/product-batch.entity';
import { Brand } from '../brands/brand.entity';
import { Category } from '../categories/category.entity';
import { StockLog } from '../products/stock-log.entity';
import { ConfigModule } from '@nestjs/config';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductBatch, Brand, Category, StockLog, User]), ConfigModule],
  providers: [CsvUploadService],
  controllers: [CsvUploadController],
})
export class CsvUploadModule {}
