import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { RoleName } from '../../common/enums/role.enum';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async findByName(name: RoleName): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }

  async ensureDefaults(): Promise<void> {
    this.logger.log('Ensuring default roles exist in database...');
    const names = Object.values(RoleName);
    
    for (const name of names) {
      const existing = await this.roleRepo.findOne({ where: { name } });
      if (!existing) {
        this.logger.log(`Creating default role: ${name}`);
        await this.roleRepo.save(this.roleRepo.create({ name }));
      } else {
        this.logger.debug(`Role already exists: ${name}`);
      }
    }
    
    this.logger.log('Default roles initialization completed');
  }
}
