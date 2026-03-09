import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../roles/role.entity';
import { Cart } from '../cart/cart.entity';
import { Order } from '../orders/order.entity';
import { StockLog } from '../products/stock-log.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 180 })
  email: string;

  @Column({ length: 200, select: false })
  passwordHash: string;

  @Column({ length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  businessName?: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  gstNumber?: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  refreshTokenHash?: string | null;

  @ManyToOne(() => Role, { eager: true })
  role: Role;

  @OneToOne(() => Cart, (cart) => cart.user)
  cart: Cart;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => StockLog, (log) => log.actor)
  stockLogs: StockLog[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
