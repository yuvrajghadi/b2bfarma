import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRazorpayOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
