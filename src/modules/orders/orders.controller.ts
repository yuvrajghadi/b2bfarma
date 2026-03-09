import { Controller, Get, Param, Patch, Post, UseGuards, Body, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role.enum';
import { isAdmin } from '../../common/utils/role-utils';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.BUSINESS)
  placeOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  history() {
    return this.ordersService.getAllOrders();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.getOrdersByUser(user.id);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.BUSINESS)
  myOrders(@CurrentUser() user: any) {
    return this.ordersService.getOrderHistory(user.id);
  }

  @Get(':id/tracking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.BUSINESS)
  async tracking(@Param('id') id: string, @CurrentUser() user: any) {
    const order = await this.ordersService.getOrderById(id);
    if (!isAdmin(user) && order.user.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return {
      orderId: order.id,
      status: order.status,
      shipments: order.shipments ?? [],
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.BUSINESS)
  async details(@Param('id') id: string, @CurrentUser() user: any) {
    const order = await this.ordersService.getOrderById(id);
    if (!isAdmin(user) && order.user.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
