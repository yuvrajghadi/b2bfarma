import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductAvailabilityStatus } from '../../common/enums/product-availability.enum';
import { Brand } from '../brands/brand.entity';
import { Category } from '../categories/category.entity';
import { OrderItem } from '../orders/order-item.entity';
import { CartItem } from '../cart/cart-item.entity';
import { StockLog } from './stock-log.entity';
import { ProductBatch } from './product-batch.entity';

@Entity({ name: 'products' })
@Index(['drugName'], { unique: true })
@Index(['drugCode'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200, unique: true })
  drugName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  drugCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => Brand, { eager: true, nullable: true })
  @Index()
  brand: Brand | null;

  @ManyToOne(() => Category, { eager: true, nullable: true })
  @Index()
  category: Category | null;

  @Column({ type: 'enum', enum: ProductAvailabilityStatus, default: ProductAvailabilityStatus.OutOfStock })
  availabilityStatus: ProductAvailabilityStatus;

@Column({ name: 'is_deleted', default: false })
isDeleted: boolean;

  @OneToMany(() => ProductBatch, (batch) => batch.product, { cascade: true })
  batches: ProductBatch[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];

  @OneToMany(() => CartItem, (item) => item.product)
  cartItems: CartItem[];

  @OneToMany(() => StockLog, (log) => log.product)
  stockLogs: StockLog[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
