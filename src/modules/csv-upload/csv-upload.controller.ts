import { BadRequestException, Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsvUploadService } from './csv-upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('csv')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CsvUploadController {
  constructor(
    private readonly csvService: CsvUploadService,
    private readonly configService: ConfigService,
  ) {}

  @Post('upload')
  @Roles(RoleName.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadCsv(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const maxSize = this.configService.get<number>('FILE_UPLOAD_MAX_SIZE', 5 * 1024 * 1024);
    if (file.size > maxSize) {
      throw new BadRequestException('File too large');
    }
    return this.csvService.processCsv(file.buffer, user.id);
  }
}
