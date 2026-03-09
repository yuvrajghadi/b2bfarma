import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../../common/enums/role.enum';
import { Cart } from '../cart/cart.entity';
import { isBusiness } from '../../common/utils/role-utils';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    private readonly rolesService: RolesService,
  ) {}

  async createUser(params: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
    address?: string;
    businessName?: string;
    gstNumber?: string;
    role: RoleName;
  }): Promise<User> {
    this.logger.debug(`Creating user with email: ${params.email}, role: ${params.role}`);
    
    const existing = await this.userRepo.findOne({ where: { email: params.email } });
    if (existing) {
      this.logger.warn(`Email already exists: ${params.email}`);
      throw new ConflictException('Email already exists');
    }

    this.logger.debug(`Looking up role: ${params.role}`);
    const role = await this.rolesService.findByName(params.role);
    if (!role) {
      this.logger.error(`Role not found in database: ${params.role}. Database may not be seeded.`);
      throw new NotFoundException(`Role '${params.role}' not found. Please contact administrator.`);
    }

    this.logger.debug('Creating user entity...');
    const user = this.userRepo.create({
      email: params.email,
      passwordHash: params.passwordHash,
      fullName: params.fullName,
      phone: params.phone,
      address: params.address,
      businessName: params.businessName,
      gstNumber: params.gstNumber,
      role,
    });

    this.logger.debug('Saving user to database...');
    const saved = await this.userRepo.save(user);
    
    if (isBusiness(saved)) {
      this.logger.debug('Creating cart for business user...');
      const cart = this.cartRepo.create({ user: saved, items: [] });
      await this.cartRepo.save(cart);
    }
    
    this.logger.debug(`User created successfully with ID: ${saved.id}`);
    return saved;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect(['user.passwordHash', 'user.refreshTokenHash'])
      .leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdWithRefreshToken(id: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect(['user.refreshTokenHash'])
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async adminExists(): Promise<boolean> {
    const admin = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.name = :role', { role: RoleName.ADMIN })
      .select('user.id')
      .getOne();

    return !!admin;
  }

  async updateProfile(
    id: string,
    updates: { fullName?: string; phone?: string; address?: string; businessName?: string; gstNumber?: string },
  ): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updates);
    return this.userRepo.save(user);
  }

  async deactivateUser(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    user.refreshTokenHash = null;
    return this.userRepo.save(user);
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.userRepo.update({ id: userId }, { refreshTokenHash: hash });
  }

  getRolePriceMultiplier(role: RoleName): number {
    if (role === RoleName.ADMIN) return 1;
    return 1;
  }

  sanitizeUser(user: User) {
    const { passwordHash, refreshTokenHash, ...safe } = user as User & {
      passwordHash?: string;
      refreshTokenHash?: string | null;
    };
    return safe;
  }
}
