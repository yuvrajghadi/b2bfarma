import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  createOrder(@Body() dto: CreateRazorpayOrderDto, @CurrentUser() user: any) {
    return this.paymentsService.createRazorpayOrder(dto, { id: user.id, role: user.role });
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@Body() dto: VerifyRazorpayPaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.verifyRazorpayPayment(dto, { id: user.id, role: user.role });
  }

  @Post('webhook')
  async webhook(@Headers('x-razorpay-signature') signature: string, @Req() req: any) {
    const payload = req.rawBody as Buffer;
    return this.paymentsService.handleWebhook(signature, payload);
  }
}
