import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ShipmentStatus } from '../../../common/enums/shipment-status.enum';

export class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;
}
