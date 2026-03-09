import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RoleName } from '../enums/role.enum';
import { isAdmin, isBusiness, resolveRoleName } from '../utils/role-utils';

/**
 * Debug controller to test JWT authentication and role handling
 * REMOVE IN PRODUCTION!
 */
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  @Get('public')
  publicEndpoint() {
    return { 
      message: 'Public endpoint - no auth required',
      timestamp: new Date().toISOString() 
    };
  }

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  authEndpoint(@CurrentUser() user: any) {
    this.logger.debug('=== JWT AUTH TEST ===');
    this.logger.debug(`User object: ${JSON.stringify(user, null, 2)}`);
    this.logger.debug(`User.role type: ${typeof user?.role}`);
    this.logger.debug(`User.role value: ${user?.role}`);
    this.logger.debug(`Resolved role: ${resolveRoleName(user)}`);
    
    return {
      message: 'JWT auth working',
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        roleType: typeof user?.role,
      },
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  adminEndpoint(@CurrentUser() user: any) {
    this.logger.debug('=== ADMIN ROLE TEST ===');
    this.logger.debug(`User: ${JSON.stringify(user, null, 2)}`);
    this.logger.debug(`Role comparison: user.role === RoleName.ADMIN`);
    this.logger.debug(`Result: ${isAdmin(user)}`);
    
    return {
      message: 'Admin role guard passed',
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        isAdmin: isAdmin(user),
        isBusiness: isBusiness(user),
      },
    };
  }

  @Get('role-check')
  @UseGuards(JwtAuthGuard)
  roleCheck(@CurrentUser() user: any) {
    const roleInfo = {
      raw: user?.role,
      type: typeof user?.role,
      isString: typeof user?.role === 'string',
      isObject: typeof user?.role === 'object',
      hasNameProperty: user?.role?.name !== undefined,
      equalsADMIN: user?.role === RoleName.ADMIN,
      equalsBUSINESS: user?.role === RoleName.BUSINESS,
      equalsADMINString: user?.role === 'ADMIN',
      equalsBUSINESSString: user?.role === 'BUSINESS',
      resolvedRole: resolveRoleName(user),
      roleNameEqualsADMIN: user?.role?.name === RoleName.ADMIN,
    };

    this.logger.debug('=== ROLE CHECK DETAILS ===');
    this.logger.debug(JSON.stringify(roleInfo, null, 2));

    return {
      message: 'Role information',
      roleInfo,
      recommendations: {
        correctComparison: 'user.role === RoleName.ADMIN',
        incorrectComparison: 'user.role.name === RoleName.ADMIN (wrong!)',
        helper: 'Use resolveRoleName/isAdmin/isBusiness for consistency',
      },
    };
  }
}
