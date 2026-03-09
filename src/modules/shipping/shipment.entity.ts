import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../orders/order.entity';
import { ShipmentStatus } from '../../common/enums/shipment-status.enum';

@Entity({ name: 'shipments' })
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.shipments, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ length: 60 })
  carrier: string;

  @Column({ length: 120 })
  trackingNumber: string;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.Pending })
  status: ShipmentStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  currentLocation?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  estimatedDeliveryDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  shippedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
