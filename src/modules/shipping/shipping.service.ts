import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from './shipment.entity';
import { Order } from '../orders/order.entity';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ShipmentStatus } from '../../common/enums/shipment-status.enum';

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async createShipment(dto: CreateShipmentDto) {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const shipment = this.shipmentRepo.create({
      order,
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
      currentLocation: dto.currentLocation ?? null,
      estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : null,
    });
    return this.shipmentRepo.save(shipment);
  }

  async updateStatus(id: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.shipmentRepo.findOne({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    shipment.status = dto.status;
    if (dto.status === ShipmentStatus.Shipped) shipment.shippedAt = new Date();
    if (dto.status === ShipmentStatus.Delivered) shipment.deliveredAt = new Date();
    if (dto.currentLocation !== undefined) {
      shipment.currentLocation = dto.currentLocation;
    }
    if (dto.estimatedDeliveryDate) {
      shipment.estimatedDeliveryDate = new Date(dto.estimatedDeliveryDate);
    }
    return this.shipmentRepo.save(shipment);
  }
}
