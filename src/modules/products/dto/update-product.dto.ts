import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { UpdateBatchDto } from './update-batch.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  drugName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateBatchDto)
  batches?: UpdateBatchDto[];
}
