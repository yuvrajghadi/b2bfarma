import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Cart } from '../cart/cart.entity';
import { CartItem } from '../cart/cart-item.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.batches', 'user'],
    });
    if (!cart) {
      console.log('User cart items:', []);
      throw new BadRequestException('Cart not found. Add items via POST /cart before creating an order.');
    }
    console.log('User cart items:', cart.items ?? []);
    if (!cart.items?.length) {
      throw new BadRequestException('Cart is empty. Add items via POST /cart before creating an order.');
    }

    const total = await this.calculateTotal(cart);

    return this.dataSource.transaction(async (manager) => {
      // Check stock availability for all items
      for (const item of cart.items) {
        if (item.product.isDeleted) {
          throw new BadRequestException(`Product ${item.product.drugName} is no longer available`);
        }
        const totalStock = item.product.batches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
        if (totalStock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for ${item.product.drugName}`);
        }
      }

      const order = manager.create(Order, {
        user: cart.user,
        status: OrderStatus.Pending,
        total,
        paymentMethod: dto.paymentMethod,
        shippingAddress: dto.shippingAddress,
      });
      const savedOrder = await manager.save(order);

      const orderItems = cart.items.map((item) =>
        manager.create(OrderItem, {
          order: savedOrder,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      );
      await manager.save(orderItems);

      await manager.delete(CartItem, { cart: { id: cart.id } });
      return savedOrder;
    });
  }

  async getOrderHistory(userId: string) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllOrders() {
    return this.orderRepo.find({
      relations: ['items', 'items.product', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrdersByUser(userId: string) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderById(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'payments', 'shipments'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.getOrderById(id);
    order.status = dto.status;
    return this.orderRepo.save(order);
  }

  private async calculateTotal(cart: Cart): Promise<number> {
    const total = cart.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    return Number(total.toFixed(2));
  }
}
