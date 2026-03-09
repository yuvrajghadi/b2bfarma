import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './product.entity';
import { ProductBatch } from './product-batch.entity';
import { Brand } from '../brands/brand.entity';
import { Category } from '../categories/category.entity';
import { StockLog } from './stock-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductBatch, Brand, Category, StockLog]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
