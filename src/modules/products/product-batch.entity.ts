import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'product_batches' })
@Index(['batchNumber'])
@Index(['expiryDate'])
@Index(['product', 'batchNumber'], { unique: true })
export class ProductBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.batches, { onDelete: 'CASCADE' })
  @Index()
  product: Product;

  @Column({ type: 'varchar', length: 120, nullable: true })
  batchNumber: string | null;

  @Column({ type: 'date' })
  expiryDate: Date;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  mrp: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salesPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
