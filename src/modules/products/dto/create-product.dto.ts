import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProductAvailabilityStatus } from '../../../common/enums/product-availability.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  drugName: string;

  @IsString()
  @IsOptional()
  drugCode?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsEnum(ProductAvailabilityStatus)
  @IsOptional()
  availabilityStatus?: ProductAvailabilityStatus;
}
