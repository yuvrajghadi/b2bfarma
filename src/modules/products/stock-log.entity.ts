import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'stock_logs' })
export class StockLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.stockLogs, { onDelete: 'CASCADE' })
  product: Product;

  @Column({ type: 'int' })
  change: number;

  @Column({ length: 255 })
  reason: string;

  @ManyToOne(() => User, (user) => user.stockLogs, { eager: true, nullable: true })
  actor?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
