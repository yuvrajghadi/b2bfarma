import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';
import { ProductBatch } from '../products/product-batch.entity';
import { UsersService } from '../users/users.service';
import { RoleName } from '../../common/enums/role.enum';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductBatch)
    private readonly batchRepo: Repository<ProductBatch>,
    private readonly usersService: UsersService,
  ) {}

  private async getCartForUser(userId: string): Promise<Cart> {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'items', 'items.product'],
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getCartForUser(userId);
    const total = await this.calculateTotal(cart);
    return { ...cart, total };
  }

  async addItem(user: { id: string; role: RoleName }, productId: string, quantity: number) {
    const cart = await this.getCartForUser(user.id);
    const product = await this.productRepo.findOne({
      where: { id: productId, isDeleted: false },
      relations: ['batches'],
    });
    if (!product) throw new NotFoundException('Product not found');
    
    // Calculate total stock from all batches
    const totalStock = product.batches?.reduce((sum, batch) => sum + batch.quantity, 0) || 0;
    if (totalStock < quantity) throw new BadRequestException('Insufficient stock');

    const existing = cart.items?.find((item) => item.product.id === productId);
    const unitPrice = await this.getPriceForProduct(product, user.role);

    if (existing) {
      existing.quantity += quantity;
      existing.unitPrice = unitPrice;
      await this.cartItemRepo.save(existing);
    } else {
      const item = this.cartItemRepo.create({
        cart,
        product,
        quantity,
        unitPrice,
      });
      await this.cartItemRepo.save(item);
    }

    return this.getCart(user.id);
  }

  async updateItem(user: { id: string; role: RoleName }, itemId: string, quantity: number) {
    const cart = await this.getCartForUser(user.id);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    
    // Load batches for stock check
    const product = await this.productRepo.findOne({
      where: { id: item.product.id, isDeleted: false },
      relations: ['batches'],
    });
    if (!product) throw new NotFoundException('Product not found');
    
    const totalStock = product.batches?.reduce((sum, batch) => sum + batch.quantity, 0) || 0;
    if (totalStock < quantity) throw new BadRequestException('Insufficient stock');

    item.quantity = quantity;
    item.unitPrice = await this.getPriceForProduct(product, user.role);
    await this.cartItemRepo.save(item);
    return this.getCart(user.id);
  }

  async removeItem(user: { id: string }, itemId: string) {
    const cart = await this.getCartForUser(user.id);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    await this.cartItemRepo.delete(item.id);
    return this.getCart(user.id);
  }

  async clearCart(user: { id: string }) {
    const cart = await this.getCartForUser(user.id);
    if (cart.items?.length) {
      await this.cartItemRepo.delete({ cart: { id: cart.id } });
    }
    return this.getCart(user.id);
  }

  private async getPriceForProduct(product: Product, role: RoleName): Promise<number> {
    // Load batches if not loaded
    if (!product.batches || product.batches.length === 0) {
      const fullProduct = await this.productRepo.findOne({
        where: { id: product.id, isDeleted: false },
        relations: ['batches'],
      });
      if (!fullProduct) {
        throw new NotFoundException('Product not found');
      }
      product = fullProduct;
    }

    // Get lowest sales price from available batches
    const availableBatches = product.batches?.filter(b => b.quantity > 0) || [];
    if (availableBatches.length === 0) {
      throw new BadRequestException('No stock available for this product');
    }

    const basePrice = Math.min(...availableBatches.map(b => Number(b.salesPrice)));
    return this.getPriceForUser(basePrice, role);
  }

  private async calculateTotal(cart: Cart): Promise<number> {
    const total = (cart.items || []).reduce((sum, item) => {
      return sum + Number(item.unitPrice) * item.quantity;
    }, 0);
    return Number(total.toFixed(2));
  }

  private getPriceForUser(basePrice: number, role: RoleName): number {
    const multiplier = this.usersService.getRolePriceMultiplier(role);
    return Number((Number(basePrice) * multiplier).toFixed(2));
  }
}
