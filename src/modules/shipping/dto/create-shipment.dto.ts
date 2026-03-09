import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  carrier: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}
