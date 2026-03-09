import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { Payment } from './payment.entity';
import { Order } from '../orders/order.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ProductBatch } from '../products/product-batch.entity';
import { Product } from '../products/product.entity';
import { StockLog } from '../products/stock-log.entity';
import { ProductAvailabilityStatus } from '../../common/enums/product-availability.enum';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { RoleName } from '../../common/enums/role.enum';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay | null = null;
  private razorpayKeyId: string | null = null;
  private razorpayKeySecret: string | null = null;
  private razorpayWebhookSecret: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {
    this.razorpayKeyId =
      process.env.RAZORPAY_KEY_ID ?? this.configService.get<string>('RAZORPAY_KEY_ID') ?? null;
    this.razorpayKeySecret =
      process.env.RAZORPAY_KEY_SECRET ?? this.configService.get<string>('RAZORPAY_KEY_SECRET') ?? null;
    this.razorpayWebhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ?? this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? null;
    if (this.razorpayKeyId && this.razorpayKeySecret) {
      this.razorpay = new Razorpay({
        key_id: this.razorpayKeyId,
        key_secret: this.razorpayKeySecret,
      });
    }
  }

  async createRazorpayOrder(dto: CreateRazorpayOrderDto, user: { id: string; role: RoleName }) {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId }, relations: ['user'] });
    if (!order) throw new BadRequestException('Order not found');
    if (user.role !== RoleName.ADMIN && order.user.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status !== OrderStatus.Pending) {
      throw new BadRequestException('Order is not in a payable state');
    }

    if (!this.razorpay || !this.razorpayKeyId) {
      throw new BadRequestException('Razorpay not configured');
    }

    const existingPaid = await this.paymentRepo.findOne({
      where: { order: { id: order.id }, status: PaymentStatus.Succeeded },
    });
    if (existingPaid) {
      throw new BadRequestException('Order already paid');
    }

    const existingPending = await this.paymentRepo.findOne({
      where: { order: { id: order.id }, status: PaymentStatus.Pending, provider: 'razorpay' },
    });
    if (existingPending?.providerPaymentId) {
      return {
        razorpayOrderId: existingPending.providerPaymentId,
        amount: Math.round(Number(existingPending.amount) * 100),
        currency: existingPending.currency,
        keyId: this.razorpayKeyId,
      };
    }

    const currency = dto.currency ?? 'INR';
    const amount = Math.round(Number(order.total) * 100);
    const receipt = `ord_${order.id.replace(/-/g, '').slice(0, 28)}`;
    const rpOrder = await this.razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: { orderId: order.id },
    });

    const payment = this.paymentRepo.create({
      order,
      status: PaymentStatus.Pending,
      provider: 'razorpay',
      providerPaymentId: rpOrder.id,
      amount: Number(order.total),
      currency,
      rawPayload: rpOrder as unknown as Record<string, unknown>,
    });
    await this.paymentRepo.save(payment);

    return {
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: this.razorpayKeyId,
    };
  }

  async verifyRazorpayPayment(dto: VerifyRazorpayPaymentDto, user: { id: string; role: RoleName }) {
    if (!this.razorpayKeySecret) {
      throw new BadRequestException('Razorpay not configured');
    }

    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: ['user'],
    });
    if (!order) throw new BadRequestException('Order not found');
    if (user.role !== RoleName.ADMIN && order.user.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    const payment = await this.paymentRepo.findOne({
      where: { order: { id: order.id }, provider: 'razorpay', providerPaymentId: dto.razorpayOrderId },
    });
    if (!payment) {
      throw new BadRequestException('Payment record not found');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    return this.finalizePayment({
      paymentId: payment.id,
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
    });
  }

  async handleWebhook(signature: string | string[] | undefined, payload: Buffer) {
    if (!this.razorpayWebhookSecret) {
      throw new BadRequestException('Razorpay webhook not configured');
    }

    const signatureValue = Array.isArray(signature) ? signature[0] : signature;
    if (!signatureValue) {
      throw new BadRequestException('Missing webhook signature');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayWebhookSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signatureValue) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(payload.toString('utf8')) as {
      event?: string;
      payload?: any;
    };

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;
      if (razorpayOrderId && razorpayPaymentId) {
        const payment = await this.paymentRepo.findOne({
          where: { provider: 'razorpay', providerPaymentId: razorpayOrderId },
        });
        if (payment) {
          await this.finalizePayment({
            paymentId: payment.id,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature: signatureValue,
            rawPayload: paymentEntity,
          });
        }
      }
    }

    if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      if (razorpayOrderId) {
        const payment = await this.paymentRepo.findOne({
          where: { provider: 'razorpay', providerPaymentId: razorpayOrderId },
        });
        if (payment && payment.status !== PaymentStatus.Succeeded) {
          payment.status = PaymentStatus.Failed;
          payment.rawPayload = paymentEntity as unknown as Record<string, unknown>;
          await this.paymentRepo.save(payment);
        }
      }
    }

    return { received: true };
  }

  private async finalizePayment(params: {
    paymentId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature?: string;
    rawPayload?: Record<string, unknown>;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: params.paymentId },
        relations: ['order', 'order.items', 'order.items.product', 'order.user'],
      });
      if (!payment) {
        throw new BadRequestException('Payment record not found');
      }

      if (payment.status === PaymentStatus.Succeeded) {
        return {
          success: true,
          orderId: payment.order.id,
          paymentStatus: payment.status,
          orderStatus: payment.order.status,
        };
      }

      const order = payment.order;

      await this.deductStockForOrder(manager, order);

      payment.status = PaymentStatus.Succeeded;
      payment.rawPayload = {
        ...(payment.rawPayload ?? {}),
        ...params.rawPayload,
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
      };
      await manager.save(payment);

      order.status = OrderStatus.Processing;
      await manager.save(order);

      return {
        success: true,
        orderId: order.id,
        paymentStatus: payment.status,
        orderStatus: order.status,
      };
    });
  }

  private async deductStockForOrder(manager: any, order: Order) {
    for (const item of order.items) {
      let remainingQty = item.quantity;
      const batches = await manager.find(ProductBatch, {
        where: { product: { id: item.product.id }, quantity: MoreThan(0) },
        order: { expiryDate: 'ASC' },
      });

      for (const batch of batches) {
        if (remainingQty <= 0) break;
        const deductQty = Math.min(batch.quantity, remainingQty);
        batch.quantity -= deductQty;
        remainingQty -= deductQty;
        await manager.save(batch);
      }

      if (remainingQty > 0) {
        throw new BadRequestException(`Insufficient stock for ${item.product.drugName}`);
      }

      const totalStockResult = await manager
        .createQueryBuilder(ProductBatch, 'batch')
        .where('batch.productId = :productId', { productId: item.product.id })
        .select('SUM(batch.quantity)', 'total')
        .getRawOne();

      const totalStock = parseInt(totalStockResult?.total || '0', 10);
      const product = await manager.findOne(Product, { where: { id: item.product.id } });
      if (product && !product.isDeleted && product.availabilityStatus !== ProductAvailabilityStatus.Discontinued) {
        product.availabilityStatus = this.calculateAvailabilityStatus(totalStock);
        await manager.save(product);
      }

      await manager.save(
        manager.create(StockLog, {
          product: item.product,
          change: -item.quantity,
          reason: `Payment verified for order ${order.id}`,
          actor: order.user,
        }),
      );
    }
  }

  private calculateAvailabilityStatus(totalStock: number): ProductAvailabilityStatus {
    if (totalStock > 10) {
      return ProductAvailabilityStatus.InStock;
    } else if (totalStock >= 1) {
      return ProductAvailabilityStatus.LowStock;
    } else {
      return ProductAvailabilityStatus.OutOfStock;
    }
  }
}
