import { Body, Controller, Post, UseGuards, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      this.logger.log(`Registration attempt for email: ${dto.email}, role: ${dto.role}`);
      const result = await this.authService.register(dto);
      this.logger.log(`Registration successful for email: ${dto.email}`);
      return result;
    } catch (error) {
      // Type narrowing for proper error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`Registration failed for ${dto.email}: ${errorMessage}`, errorStack);
      
      // Re-throw known exceptions (they have proper status codes)
      if (error instanceof HttpException) {
        throw error;
      }
      
      // For unknown errors, throw a generic error with logging
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Registration failed. Please try again later.',
          error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }
}
