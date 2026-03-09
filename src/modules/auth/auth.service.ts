import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RoleName } from '../../common/enums/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const role = dto.role ?? RoleName.BUSINESS;
    this.logger.debug(`Starting registration for: ${dto.email}, role: ${role}`);

    if (role === RoleName.ADMIN) {
      const adminExists = await this.usersService.adminExists();
      if (adminExists) {
        throw new BadRequestException('Admin account already exists. Please login.');
      }
    }
    
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    this.logger.debug('Creating user in database...');
    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      address: dto.address,
      businessName: dto.businessName,
      gstNumber: dto.gstNumber,
      role,
    });

    this.logger.debug(`User created with ID: ${user.id}, generating tokens...`);
    const tokens = await this.generateTokens(user.id, user.email, user.role.name);
    
    await this.usersService.setRefreshTokenHash(
      user.id,
      await bcrypt.hash(tokens.refreshToken, saltRounds),
    );

    this.logger.debug('Registration completed successfully');
    return { user: this.usersService.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role.name);
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    await this.usersService.setRefreshTokenHash(
      user.id,
      await bcrypt.hash(tokens.refreshToken, saltRounds),
    );

    return { user: this.usersService.sanitizeUser(user), ...tokens };
  }

  async refreshToken(dto: RefreshTokenDto) {
    let payload: { sub: string; email: string; role: RoleName };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);
    if (!user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const matches = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role.name);
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    await this.usersService.setRefreshTokenHash(
      user.id,
      await bcrypt.hash(tokens.refreshToken, saltRounds),
    );

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  private async generateTokens(userId: string, email: string, role: RoleName) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    return { accessToken, refreshToken };
  }
}
