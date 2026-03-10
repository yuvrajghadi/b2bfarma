import { MiddlewareConsumer, Module, NestModule, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validationSchema } from './config/validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CsvUploadModule } from './modules/csv-upload/csv-upload.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { RolesModule } from './modules/roles/roles.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RolesService } from './modules/roles/roles.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { DebugController } from './common/decorators/debug.controller';
import { User } from './modules/users/user.entity';
import { Role } from './modules/roles/role.entity';
import { Product } from './modules/products/product.entity';
import { ProductBatch } from './modules/products/product-batch.entity';
import { Category } from './modules/categories/category.entity';
import { Brand } from './modules/brands/brand.entity';
import { Cart } from './modules/cart/cart.entity';
import { CartItem } from './modules/cart/cart-item.entity';
import { Order } from './modules/orders/order.entity';
import { OrderItem } from './modules/orders/order-item.entity';
import { Payment } from './modules/payments/payment.entity';
import { Shipment } from './modules/shipping/shipment.entity';
import { StockLog } from './modules/products/stock-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('RATE_LIMIT_TTL', 60),
            limit: configService.get<number>('RATE_LIMIT_LIMIT', 60),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: true, // Set to false in production if needed
      }),
    }),
    RolesModule,
    BrandsModule,
    CategoriesModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    CsvUploadModule,
    PaymentsModule,
    ShippingModule,
  ],
  controllers: [DebugController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly rolesService: RolesService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing application module...');
      await this.rolesService.ensureDefaults();
      this.logger.log('Application module initialized successfully');
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to initialize application module', errorStack);
      throw error;
    }
  }
}
